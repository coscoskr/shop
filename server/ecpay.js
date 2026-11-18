// 綠界電子發票(B2C)API:加解密與開立/查詢。Deno 與 Node 18+ 都可用(WebCrypto)
const STAGE = { mid: '2000132', key: 'ejCk326UnaZWKisg', iv: 'q9jcZX8Ib9LM8wYk', host: 'https://einvoice-stage.ecpay.com.tw', test: true };

/** 有填正式金鑰(props:ECPAY_INV_MID / ECPAY_INV_KEY / ECPAY_INV_IV)就用正式環境,否則用綠界公開的測試環境 */
export function ecpayCfg(props) {
  props = props || {};
  if (props.ECPAY_INV_MID && props.ECPAY_INV_KEY && props.ECPAY_INV_IV)
    return { mid: String(props.ECPAY_INV_MID).trim(), key: String(props.ECPAY_INV_KEY).trim(), iv: String(props.ECPAY_INV_IV).trim(), host: 'https://einvoice.ecpay.com.tw', test: false };
  return Object.assign({}, STAGE);
}

const te = new TextEncoder(), td = new TextDecoder();
const b64e = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function aesKey(cfg) { return crypto.subtle.importKey('raw', te.encode(cfg.key), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']); }
// 綠界規格:JSON → urlencode → AES-128-CBC(PKCS7) → base64
export async function encData(cfg, obj) {
  const enc = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: te.encode(cfg.iv) }, await aesKey(cfg), te.encode(encodeURIComponent(JSON.stringify(obj))));
  return b64e(new Uint8Array(enc));
}
export async function decData(cfg, s) {
  const dec = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: te.encode(cfg.iv) }, await aesKey(cfg), b64d(s));
  return JSON.parse(decodeURIComponent(td.decode(dec).replace(/\+/g, ' ')));
}
export async function ecpayBody(cfg, data) {
  return JSON.stringify({ MerchantID: cfg.mid, RqHeader: { Timestamp: Math.floor(Date.now() / 1000) }, Data: await encData(cfg, Object.assign({ MerchantID: cfg.mid }, data)) });
}
async function post(cfg, path, data, fetchFn) {
  const r = await (fetchFn || fetch)(cfg.host + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await ecpayBody(cfg, data) });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error('綠界回應格式錯誤(HTTP ' + r.status + ')'); }
  if (Number(j.TransCode) !== 1) throw new Error('綠界:' + (j.TransMsg || '傳輸失敗'));
  return j.Data ? await decData(cfg, j.Data) : {};
}

/** 開立一張發票。成功回 { ok, no, date, rand };失敗時再用自訂編號查一次(避免上次其實已開成功卻沒記錄) */
export async function ecpayIssue(cfg, data, fetchFn) {
  let r, err;
  try { r = await post(cfg, '/B2CInvoice/Issue', data, fetchFn); } catch (e) { err = e; }
  if (r && Number(r.RtnCode) === 1 && r.InvoiceNo) return { ok: true, no: r.InvoiceNo, date: String(r.InvoiceDate || ''), rand: String(r.RandomNumber || '') };
  try {
    const q = await post(cfg, '/B2CInvoice/GetIssue', { RelateNumber: data.RelateNumber }, fetchFn);
    if (Number(q.RtnCode) === 1 && q.IIS_Number && String(q.IIS_Invalid_Status || '0') === '0')
      return { ok: true, no: q.IIS_Number, date: String(q.IIS_Create_Date || ''), rand: String(q.IIS_Random_Number || ''), recovered: true };
  } catch (e) { /* 查不到就回報原本的錯誤 */ }
  return { ok: false, msg: err ? err.message : (r && r.RtnMsg ? r.RtnMsg + '(' + r.RtnCode + ')' : '開立失敗') };
}
