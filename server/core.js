// 請求處理核心:一次呼叫 = 一個資料庫交易(取得鎖 → 讀資料 → 執行原本的商業邏輯 → 寫回)
import * as code from './code.js';
import { createRuntime } from './adapter.js';
import { ecpayCfg, ecpayIssue, payCfg, payFields, payVerify, logiCfg, logiVerify, logiMapFields, logiCreate, logiPrintFields } from './ecpay.js';

// 在記憶體裡「同步」執行商業邏輯前,先把服務物件掛到全域,並重置模組內的快取
function withRt(rt, fn) {
  Object.assign(globalThis, rt.globals);
  code.__reset();
  return fn();
}

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const LINE_FRIEND_URL = 'https://api.line.me/friendship/v1/status';

// 需要非同步(網路、檔案)的功能,在這裡處理;其餘全部交給原本的函式
const SPECIAL = {
  // 後台「酷柏商品綁定」:向酷柏查商品(品名/規格/編號),用同步金鑰簽章;只有登入的管理員能用
  async adminCbSearch({ rt, args, props }) {
    const [tk, q, ids] = args;
    withRt(rt, () => code.INTERNAL.me_(tk));
    const secret = String(props.COOLBAU_ARR_SECRET || '');
    if (secret.length < 16) throw new Error('還沒設定酷柏同步金鑰');
    const body = JSON.stringify({ v: 1, ts: Math.floor(Date.now() / 1000), type: 'cbq', q: String(q || '').slice(0, 60), ids: Array.isArray(ids) ? ids.slice(0, 100) : [] });
    const url = props.COOLBAU_CATALOG_URL || 'https://www.coolbaubeauty.com/g-ajax?ajax=pageOrder&cbline=cosq';
    let j = null;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-coolbau-signature': await hmacHex(secret, body) }, body });
      j = await r.json();
    } catch (e) { throw new Error('連不到酷柏,請稍後再試'); }
    if (!j || !j.ok) throw new Error('酷柏查詢失敗:' + String((j && j.err) || '未知錯誤').slice(0, 80));
    return withRt(rt, () => code.INTERNAL.cbBindOf_(j.list || []));
  },
  // 信用卡:組綠界全方位金流付款表單(前端送出到綠界)
  async memberPayStart({ rt, args, props, env }) {
    const [tk, sid, kind] = args;
    const info = withRt(rt, () => code.INTERNAL.payPrep_(tk, sid));
    const cfg = payCfg(props);
    const back = /^https:\/\//.test(info.url) ? info.url + (info.url.indexOf('?') >= 0 ? '&' : '?') + 's=' + encodeURIComponent(info.sid) : '';
    return payFields(cfg, { sid: info.sid, total: info.total, items: info.items, returnUrl: env.SUPABASE_URL + '/functions/v1/api?ecpay=pay', backUrl: back, kind: ['BNPL', 'Installment'].indexOf(kind) >= 0 ? kind : (['BNPL', 'Installment'].indexOf(info.kind) >= 0 && !kind ? info.kind : 'Credit') });
  },

  // 客人選門市:回傳綠界超商地圖表單
  async memberMapStart({ args, props, env }) {
    const [cvs, cod, mobile] = args;
    const mc = logiCfg(props), mcfg = (!mc.test || !props.ECPAY_PAY_MID) ? mc : Object.assign({}, mc, { mid: String(props.ECPAY_PAY_MID).trim(), host: 'https://logistics.ecpay.com.tw', test: false }); // 選門市一律用正式地圖(不需金鑰)
    return logiMapFields(mcfg, { sub: cvs === '全家' ? 'FAMIC2C' : 'UNIMARTC2C', cod: !!cod, mobile: !!mobile, reply: env.SUPABASE_URL + '/functions/v1/api?ecpay=map' });
  },
  // 後台:建立綠界超商物流單
  async adminLogiCreate({ rt, args, props, env }) {
    const [tk, sid] = args;
    const prep = withRt(rt, () => code.INTERNAL.logiPrep_(tk, sid));
    const cfg = logiCfg(props);
    const r = await logiCreate(cfg, Object.assign({ reply: env.SUPABASE_URL + '/functions/v1/api?ecpay=logi' }, prep));
    if (!r.ok) throw new Error('綠界建立物流單失敗:' + r.msg);
    return withRt(rt, () => code.INTERNAL.logiSave_(tk, prep, r, cfg.test));
  },
  // 後台:勾選多張出貨單,批次產生綠界物流單號
  async adminLogiBatch({ rt, args, props, env }) {
    const [tk, ids] = args;
    const prep = withRt(rt, () => code.INTERNAL.logiBatchPrep_(tk, ids));
    const cfg = logiCfg(props), pairs = [];
    for (const p of prep.ok) {
      let r;
      try { r = await logiCreate(cfg, Object.assign({ reply: env.SUPABASE_URL + '/functions/v1/api?ecpay=logi' }, p)); }
      catch (e) { r = { ok: false, msg: String(e && e.message || e) }; }
      pairs.push({ prep: p, r });
    }
    return withRt(rt, () => code.INTERNAL.logiBatchSave_(tk, pairs, prep.bad, cfg.test));
  },
  // 後台:列印寄件單
  async adminLogiPrint({ rt, args, props }) {
    const [tk, sid] = args;
    const o = withRt(rt, () => code.INTERNAL.logiPrintPrep_(tk, sid));
    const f = logiPrintFields(logiCfg(props), o);
    return f;
  },

  // 批次開立電子發票(綠界):先整理資料 → 逐張向綠界開立 → 把發票號碼寫回出貨單
  async adminIssueInvoice({ rt, args, props }) {
    const [tk, ids] = args;
    const cfg = ecpayCfg(props);
    const prep = withRt(rt, () => code.INTERNAL.invPrep_(tk, ids, cfg.test));
    const results = [];
    for (const it of prep.list) {
      try { results.push(Object.assign({ sid: it.sid }, await ecpayIssue(cfg, it.data))); }
      catch (e) { results.push({ sid: it.sid, ok: false, msg: String(e && e.message || e) }); }
    }
    return withRt(rt, () => code.INTERNAL.invSave_(tk, prep, results, cfg.test));
  },

  // LINE 登入完成後的回呼:用網址上的 code 換使用者資料
  async lineCallback({ rt, args, props }) {
    const [codeStr, state] = args;
    const has = withRt(rt, () => globalThis.CacheService.getScriptCache().get('st_' + state));
    if (!has) return {};
    const form = (o) => new URLSearchParams(o).toString();
    const post = async (url, o) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(o) })).text();
    const lineId = withRt(rt, () => code.INTERNAL.lineId_());
    const appUrl = withRt(rt, () => code.INTERNAL.appUrl_());
    const trT = await post(LINE_TOKEN_URL, { grant_type: 'authorization_code', code: codeStr, redirect_uri: appUrl, client_id: lineId, client_secret: props.LINE_LOGIN_SECRET || '' });
    let tr = {}; try { tr = JSON.parse(trT); } catch (e) {}
    const map = rt.fetchMap;
    map[LINE_TOKEN_URL] = { body: trT, code: 200 };
    if (tr.id_token) {
      const vT = await post(LINE_VERIFY_URL, { id_token: tr.id_token, client_id: lineId });
      map[LINE_VERIFY_URL] = { body: vT, code: 200 };
      try {
        const fT = await (await fetch(LINE_FRIEND_URL, { headers: { Authorization: 'Bearer ' + tr.access_token } })).text();
        map[LINE_FRIEND_URL] = { body: fT, code: 200 };
      } catch (e) { map[LINE_FRIEND_URL] = { body: '{}', code: 200 }; }
    }
    return withRt(rt, () => code.INTERNAL.lineCallback_({ code: codeStr, state }));
  },

  // LIFF 登入:前端傳來 ID Token,先向 LINE 驗證(網路請求),再交給原本的邏輯建立登入階段
  async lineLiff({ rt, args, props }) {
    const [idToken, accessToken] = args;
    if (idToken) {
      const lineId = withRt(rt, () => code.INTERNAL.lineId_());
      const vT = await (await fetch(LINE_VERIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id_token: String(idToken), client_id: lineId }).toString() })).text();
      rt.fetchMap[LINE_VERIFY_URL] = { body: vT, code: 200 };
      if (accessToken) {
        try { rt.fetchMap[LINE_FRIEND_URL] = { body: await (await fetch(LINE_FRIEND_URL, { headers: { Authorization: 'Bearer ' + accessToken } })).text(), code: 200 }; }
        catch (e) { rt.fetchMap[LINE_FRIEND_URL] = { body: '{}', code: 200 }; }
      }
    }
    return withRt(rt, () => code.INTERNAL.lineLiff(idToken, accessToken));
  },

  // 商品圖片上傳:改存到 Supabase Storage(公開的 product-images 資料夾)
  async adminUploadImage({ rt, args, env }) {
    const [tk, fname, mime, b64] = args;
    const u = withRt(rt, () => code.INTERNAL.me_(tk));
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) throw new Error('只能上傳 JPG、PNG 或 WebP 圖片');
    if (!b64 || String(b64).length > 4000000) throw new Error('圖片太大,請換小一點的圖');
    const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
    const name = 'p' + Date.now() + Math.random().toString(36).slice(2, 6) + ext;
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const sig = (a) => a.every((v, i) => bin[i] === v);
    const okMagic = mime === 'image/png' ? sig([0x89, 0x50, 0x4e, 0x47]) : mime === 'image/jpeg' ? sig([0xff, 0xd8, 0xff]) : (sig([0x52, 0x49, 0x46, 0x46]) && bin[8] === 0x57 && bin[9] === 0x45 && bin[10] === 0x42 && bin[11] === 0x50);
    if (!okMagic) throw new Error('檔案內容不是有效的圖片');
    const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/product-images/${name}`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': mime, 'x-upsert': 'false' }, body: bin,
    });
    if (!r.ok) throw new Error('圖片上傳失敗:' + (await r.text()).slice(0, 120));
    withRt(rt, () => code.INTERNAL.log_(u.acc, '上傳商品圖片', name, String(fname || '').slice(0, 60)));
    return `${env.SUPABASE_URL}/storage/v1/object/public/product-images/${name}`;
  },
};

/**
 * 執行一次 API 呼叫。
 * db: { withTx(async (tx) => …) },tx 提供 loadAll()、commit(ops, kvOps)
 * 回傳 { body, after }:body 是給前端的 JSON,after 是交易完成後再做的事(寄信、LINE 推播)
 */
// 純讀取的功能不用排隊等寫入鎖(畫面載入、報價、後台列表)
const NOLOCK = /^(memberMapStart|getShop|shopData|quote|memberOrders|memberShipQuote|admin(Init|Orders|Products|PurchaseList|StockView|Report|Settings|Levels|Vendors|Brands|Cats|Carriers|Members|MemberGrants|Logs|Codes|Activities|LineHistory|LineInfo|ShipHistory|ShipQuote|ProxyQuote|HistBindList|Admins|CbBinds|CbSearch))$/;
export async function execute({ fn, args, db, env }) {
  const isPublic = Object.prototype.hasOwnProperty.call(code.API, fn) || Object.prototype.hasOwnProperty.call(SPECIAL, fn);
  if (!isPublic) return { body: { ok: false, error: '不存在的功能:' + String(fn).slice(0, 40) }, after: [] };
  args = Array.isArray(args) ? args : [];
  const after = [];
  const body = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll({ big: /^(adminLogs|adminLineHistory|adminShipHistory)$/.test(fn) });
    const props = Object.assign({}, env.props || {}, dbProps);
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    let result, err = null;
    try {
      result = SPECIAL[fn] ? await SPECIAL[fn]({ rt, args, env, props }) : withRt(rt, () => code.API[fn].apply(null, args));
    } catch (e) { err = e; }
    if (err) {
      await tx.commit([], rt.kvOps); // 失敗時資料不寫入,但登入失敗次數等計數要保留
      return { ok: false, error: String(err && err.message || err) };
    }
    await tx.commit(rt.collectOps(), rt.kvOps);
    rt.mailQueue.forEach((m) => after.push({ type: 'mail', m }));
    rt.fetchQueue.forEach((f) => after.push({ type: 'fetch', f }));
    return { ok: true, result: result === undefined ? null : result };
  }, { lock: !NOLOCK.test(fn) });
  return { body, after };
}

/** 交易完成後的非同步工作:LINE 推播、寄信(沒有設定金鑰就略過) */
export async function runAfter(after, env) {
  for (const a of after) {
    try {
      if (a.type === 'fetch') {
        const o = a.f.opt || {};
        const init = { method: (o.method || 'get').toUpperCase(), headers: Object.assign({}, o.headers || {}) };
        if (o.contentType) init.headers['Content-Type'] = o.contentType;
        if (o.payload !== undefined) init.body = typeof o.payload === 'string' ? o.payload : new URLSearchParams(o.payload).toString();
        const r = await fetch(a.f.url, init);
        // LINE 卡片訊息被拒(400)時,改送同內容的純文字,確保客人一定收得到
        if (!r.ok && r.status === 400 && /api\.line\.me\/v2\/bot\/message\/push/.test(a.f.url) && init.body) {
          try {
            const j = JSON.parse(init.body);
            if (j.messages && j.messages[0] && j.messages[0].type === 'flex') {
              console.error('flex rejected', (await r.text()).slice(0, 200));
              j.messages[0] = { type: 'text', text: j.messages[0].altText || '通知' };
              await fetch(a.f.url, Object.assign({}, init, { body: JSON.stringify(j) }));
            }
          } catch (e2) { /* ignore */ }
        }
      } else if (a.type === 'mail' && env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM || 'onboarding@resend.dev', to: [a.m.to], subject: a.m.subject, text: a.m.body }),
        });
      }
    } catch (e) { /* 通知失敗不影響主流程 */ }
  }
}

/**
 * LINE 官方帳號的 Webhook:客人傳訊息或加好友時,把他記進會員清單(代客下單可直接選)。
 * 驗證:用 Messaging API 頻道的 Channel secret 檢查 x-line-signature,不符就拒絕。
 */
export async function handleWebhook({ rawBody, signature, db, env }) {
  let events = [];
  const jobs = [], after = [];
  let envP = env; // LINE_MSG_TOKEN 存在資料表 props,不在 Edge Function Secrets:回覆管理員時要用合併後的設定,否則會「lineReply: no token」沒有回覆
  const ok = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    envP = Object.assign({}, env, { props });
    const secret = props.LINE_MSG_SECRET || '';
    if (!secret || !signature) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
    let bin = ''; mac.forEach((b) => { bin += String.fromCharCode(b); });
    if (btoa(bin) !== signature) return false;
    try { events = (JSON.parse(rawBody).events || []).slice(0, 20); } catch (e) { events = []; }
    const seen = new Map();
    for (const ev of events) {
      const uid = ev && ev.source && ev.source.userId;
      if (!uid || !['message', 'follow', 'unfollow'].includes(ev.type)) continue;
      seen.set(uid, ev.type === 'unfollow' ? false : (seen.get(uid) === undefined ? true : seen.get(uid)));
    }
    if (!seen.size) return true;
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    for (const [uid, follow] of seen) {
      let name = '', pic = '';
      if (follow && props.LINE_MSG_TOKEN) {
        try {
          const r = await fetch('https://api.line.me/v2/bot/profile/' + encodeURIComponent(uid), { headers: { Authorization: 'Bearer ' + props.LINE_MSG_TOKEN } });
          if (r.ok) { const j = await r.json(); name = j.displayName || ''; pic = j.pictureUrl || ''; }
        } catch (e) { /* 取不到暱稱也先記下 */ }
      }
      withRt(rt, () => code.INTERNAL.contactSeen_(uid, name, pic, follow));
    }
    // 到貨通知助理:只處理一對一訊息;綁定、確認、取消當場處理,文字/圖片留待解析
    for (const ev of events) {
      const uid = ev && ev.source && ev.source.userId;
      if (!uid || ev.type !== 'message' || !ev.message || (ev.source.type && ev.source.type !== 'user')) continue;
      try {
        if (ev.message.type === 'text') {
          const r = withRt(rt, () => code.INTERNAL.arrText_(uid, ev.message.text));
          if (r && r.reply) jobs.push({ kind: 'reply', uid, token: ev.replyToken, text: r.reply });
          else if (r && r.ai) jobs.push({ kind: r.cb ? 'cb' : 'ai', uid, token: ev.replyToken, text: String(ev.message.text || '').slice(0, 6000) });
        } else if (ev.message.type === 'image') {
          if (withRt(rt, () => code.INTERNAL.arrIsAdmin_(uid))) jobs.push({ kind: 'ai', uid, token: ev.replyToken, imageId: ev.message.id });
        }
      } catch (e) { console.error('arrival text error', e); }
    }
    await tx.commit(rt.collectOps(), rt.kvOps);
    rt.fetchQueue.forEach((f) => after.push({ type: 'fetch', f }));
    rt.mailQueue.forEach((m) => after.push({ type: 'mail', m }));
    return true;
  });
  if (!ok) return { ok: false, later: Promise.resolve() };
  const later = (async () => {
    await runAfter(after, env);
    console.log('webhook jobs', JSON.stringify(jobs.map((j) => j.kind + ':' + (j.imageId ? 'img' : 'txt'))));
    for (const job of jobs) {
      try { if (job.kind === 'reply') await lineReply(job, job.text, envP); else if (job.kind === 'cb') await runCoolbauJob({ db, env: envP, job }); else await runArrivalJob(job, { db, env: envP }); } catch (e) { console.error('arrival job error', e); await lineReply(job, '處理失敗,請稍後再試或到後台手動處理。', envP).catch(() => {}); }
    }
  })();
  return { ok: true, later };
}

async function lineReply(job, text, env, props) {
  const tok = (props && props.LINE_MSG_TOKEN) || (env.props || {}).LINE_MSG_TOKEN || '';
  if (!tok) { console.error('lineReply: no token'); return false; }
  const msg = [{ type: 'text', text: String(text).slice(0, 4900) }];
  if (job.token) {
    const r = await fetch('https://api.line.me/v2/bot/message/reply', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ replyToken: job.token, messages: msg }) });
    if (r.ok) return true;
    console.error('lineReply failed', r.status, (await r.text()).slice(0, 150));
  }
  const r2 = await fetch('https://api.line.me/v2/bot/message/push', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: job.uid, messages: msg }) });
  if (!r2.ok) console.error('linePush failed', r2.status, (await r2.text()).slice(0, 150));
  return r2.ok;
}

const ARR_SYSTEM = '你是韓國代購店「coscos」的到貨通知解析員。使用者會轉傳廠商的到貨通知(文字或截圖),請找出「這次實際到貨」的每個品項。\n' +
  '我會提供店內商品清單(格式:商品ID|名稱|規格(待到貨件數))。請把通知裡每個品項對應到清單中的商品與規格;對不上就把 pid 設為 null。\n' +
  '只輸出 JSON,不要任何其他文字,格式:{"items":[{"text":"通知上的原文品名","pid":"商品ID或null","spec":"規格(沒有規格就空字串,必須與清單中的規格文字完全一致,不含括號內的待到貨數)","qty":到貨數量(整數),"price":單價數字或null}]}\n' +
  '規則:數量以「到貨/出貨給我們」的件數為準;缺貨、未到、取消的品項不要列入或 qty 設 0;同一商品不同規格請分開列;看不出任何到貨品項就回 {"items":[]}。';

async function runArrivalJob(job, { db, env }) {
  // 1) 讀出商品清單(短交易,不寫入)
  const { cands, key, tok } = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    return { cands: withRt(rt, () => code.INTERNAL.arrCands_()), key: props.ANTHROPIC_API_KEY || '', tok: props.LINE_MSG_TOKEN || '' };
  });
  if (!key) { await lineReply(job, '尚未設定 Anthropic 金鑰,無法解析到貨通知。', env); return; }
  // 2) 取圖片(如有)並請 Claude 解析
  const content = [];
  if (job.imageId) {
    const r = await fetch('https://api-data.line.me/v2/bot/message/' + encodeURIComponent(job.imageId) + '/content', { headers: { Authorization: 'Bearer ' + tok } });
    if (!r.ok) throw new Error('取不到圖片 ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 4_500_000) { await lineReply(job, '圖片太大,請裁切或縮小後再傳。', env); return; }
    let mt = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!/^image\/(jpeg|png|gif|webp)$/.test(mt)) mt = 'image/jpeg';
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    content.push({ type: 'image', source: { type: 'base64', media_type: mt, data: btoa(s) } });
  }
  content.push({ type: 'text', text: '店內商品清單:\n' + cands + '\n\n' + (job.text ? '廠商到貨通知(文字):\n' + job.text : '請解析上面的到貨通知圖片。') });
  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 2000, system: ARR_SYSTEM, messages: [{ role: 'user', content }] }),
  });
  if (!ar.ok) { console.error('anthropic', ar.status, (await ar.text()).slice(0, 200)); await lineReply(job, '解析服務暫時無法使用(' + ar.status + '),請稍後再試。', env); return; }
  const aj = await ar.json();
  const txt = ((aj.content || []).find((b) => b.type === 'text') || {}).text || '';
  let items = [];
  try { const m = txt.match(/\{[\s\S]*\}/); items = (JSON.parse(m ? m[0] : '{}').items || []).filter((x) => x && Number(x.qty) > 0).slice(0, 60); } catch (e) { items = []; }
  if (!items.length) { await lineReply(job, '我看不出這則訊息裡有到貨品項。若要處理到貨,請轉傳廠商的到貨通知(文字或截圖)。', env); return; }
  // 3) 分配 + 存成待確認
  const { reply, after } = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    const reply = withRt(rt, () => code.INTERNAL.arrPlan_(items));
    await tx.commit(rt.collectOps(), rt.kvOps);
    return { reply, after: [] };
  });
  await lineReply(job, reply, env);
}

// 管理員在 LINE 回「確認」時入帳(上面 arrText_ 已在交易內完成),這裡不用再做事

/* ---------- 酷柏到貨自動入帳 ----------
   酷柏批發系統 KEY 到貨後,直接把我們帳號這次到貨的品項 POST 過來(標頭 x-coolbau-signature = HMAC-SHA256(金鑰, 內容) 的十六進位)。
   金鑰:COOLBAU_ARR_SECRET(Edge Function 的 Secrets,或 props 表)。商業邏輯在 Code.gs 的「酷柏到貨自動入帳」。 */
const CB_SYSTEM = '你是韓國代購店「coscos」的到貨對照員。供應商「酷柏」的系統會送來這次到貨的品項(格式:#編號|酷柏品名|酷柏規格|件數)。\n' +
  '我會提供店內商品清單(格式:商品ID|名稱|規格(待到貨件數))。同一件商品在兩邊的寫法不同:酷柏品名常帶【韓國】、品牌、貨號、顏色;店內可能把顏色或尺寸放在規格。請依品牌、品名、貨號、顏色、尺寸判斷是不是同一件商品。\n' +
  '只輸出 JSON,不要任何其他文字,格式:{"items":[{"ref":編號(整數),"pid":"商品ID或null","spec":"店內規格(沒有規格就空字串,必須與清單中的規格文字完全一致,不含括號內的待到貨數)"}]}\n' +
  '規則:每個編號都要輸出一筆;沒有把握是同一件商品就把 pid 設為 null,不要猜;酷柏規格如果只是交期或「標準」之類的字,代表該品項沒有分規格,顏色/款式請從酷柏品名判斷。';

async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return Array.from(mac).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameStr(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return d === 0; }
async function cbAuth(secret, rawBody, signature, d) {
  if (String(secret || '').length < 16) return 'not configured';
  if (!sameStr(await hmacHex(String(secret), rawBody), String(signature || '').trim().toLowerCase())) return 'bad signature';
  if (!(Math.abs(Date.now() / 1000 - Number(d && d.ts)) <= 900)) return 'stale';
  return '';
}

export async function handleCoolbau({ rawBody, signature, db, env }) {
  let d;
  try { d = JSON.parse(rawBody); } catch (e) { return { status: 400, body: { ok: false, error: 'bad json' } }; }
  const fail = (bad) => ({ status: bad === 'not configured' ? 503 : 401, body: { ok: false, error: bad } });
  const envSecret = (env.props || {}).COOLBAU_ARR_SECRET;
  if (envSecret) { const b0 = await cbAuth(envSecret, rawBody, signature, d); if (b0) return fail(b0); } // 金鑰在環境變數時,先驗證再進交易
  let out = null, bad = '';
  const after = [];
  await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    if (!envSecret || props.COOLBAU_ARR_SECRET !== envSecret) { bad = await cbAuth(props.COOLBAU_ARR_SECRET, rawBody, signature, d); if (bad) return; }
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    out = withRt(rt, () => (d.type === 'poke' ? (function () { code.INTERNAL.cbRdyReset_(); var ga = code.INTERNAL.cbPendAuto_(); if (ga) code.INTERNAL.cbTell_(ga); var rr = {}; code.INTERNAL.cbRdyTell_(rr); return { ok: true, poke: true, added: 0, auto: ga ? 1 : 0, pending: code.INTERNAL.cbPend_().length }; })() : d.type === 'cost' ? code.INTERNAL.cbCostIn_(d) : code.INTERNAL.cbArrIn_(d)));
    await tx.commit(rt.collectOps(), rt.kvOps);
    rt.fetchQueue.forEach((f) => after.push({ type: 'fetch', f }));
    rt.mailQueue.forEach((m) => after.push({ type: 'mail', m }));
  });
  if (bad) return fail(bad);
  const later = (async () => {
    await runAfter(after, env);
    // 有第一次出現的品項(或酷柏每天提醒一次):配對後把預覽傳給到貨管理員
    if (out.pending > 0 && (out.added > 0 || out.poke)) { try { await runCoolbauJob({ db, env }); } catch (e) { console.error('coolbau job error', e); } }
  })();
  return { status: 200, body: out, later };
}

/** 把「酷柏待對應」的品項配對到店內商品,存成待確認計畫並傳預覽給到貨管理員(job 有給時回覆該則訊息) */
async function runCoolbauJob({ db, env, job }) {
  const { list, n, cands, key, admins, props } = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    return withRt(rt, () => ({ list: code.INTERNAL.cbPendList_(), n: code.INTERNAL.cbPend_().length, cands: code.INTERNAL.arrCands_(), key: props.ANTHROPIC_API_KEY || '', admins: code.INTERNAL.cbTargets_(), props }));
  }, { lock: false });
  const tos = job ? [job] : admins.map((u) => ({ uid: u }));
  if (!n || !tos.length) return; // 沒有任何通知對象:品項留在待對應,酷柏那邊會私訊 Alfee
  const say = async (t) => { for (const x of tos) await lineReply(x, t, env, props); };
  // AI 只提供「建議候選」,不會直接決定入帳;沒有金鑰或服務失敗也照樣列出品名相近的候選讓管理員選
  let items = [];
  if (key) {
    try {
      const ar = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 6000, system: CB_SYSTEM, messages: [{ role: 'user', content: [{ type: 'text', text: '店內商品清單:\n' + cands + '\n\n酷柏這次到貨、需要對照的品項:\n' + list }] }] }),
      });
      if (ar.ok) {
        const aj = await ar.json();
        const txt = ((aj.content || []).find((b) => b.type === 'text') || {}).text || '';
        const m = txt.match(/\{[\s\S]*\}/); items = (JSON.parse(m ? m[0] : '{}').items || []).slice(0, 200);
      } else console.error('anthropic', ar.status, (await ar.text()).slice(0, 200));
    } catch (e) { console.error('anthropic', e); items = []; }
  }
  const text = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const rt = createRuntime({ H: code.H, tableData, kv, props: Object.assign({}, env.props || {}, dbProps), fetchMap: {} });
    const t = withRt(rt, () => code.INTERNAL.cbPendPlan_(items));
    await tx.commit(rt.collectOps(), rt.kvOps);
    return t;
  });
  if (text) await say(text);
}


/** 綠界付款結果通知(ReturnURL,表單格式):驗證檢查碼後更新出貨單,回應 1|OK */
export async function handleEcpayPay({ rawBody, db, env }) {
  const p = Object.fromEntries(new URLSearchParams(rawBody));
  let out = '0|ERR';
  await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    const cfg = payCfg(props);
    if (String(p.MerchantID) !== cfg.mid || !(await payVerify(cfg, p))) { console.error('ecpay pay: bad mac', p.MerchantTradeNo); out = '0|CheckMacValue Error'; await tx.commit([], []); return; }
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    let r = '';
    try { r = withRt(rt, () => code.INTERNAL.payDone_(p, cfg.test)); }
    catch (e) { console.error('payDone error', e); out = '0|ERR'; await tx.commit([], []); return; } // 不寫入,讓綠界稍後重送
    await tx.commit(rt.collectOps(), rt.kvOps);
    out = '1|OK';
    console.log('ecpay pay', p.CustomField1, p.RtnCode, r);
  });
  return out;
}

/** 綠界超商地圖選完門市(瀏覽器 POST 過來):轉回網站並帶上門市資料 */
export async function handleEcpayMap({ rawBody, db, env }) {
  const p = Object.fromEntries(new URLSearchParams(rawBody));
  let app = '';
  await db.withTx(async (tx) => { const { props } = await tx.loadAll(); app = (env.props && env.props.APP_URL) || props.APP_URL || ''; await tx.commit([], []); }, { lock: false });
  const pick = { t: p.LogisticsSubType === 'FAMIC2C' ? '全家' : '7-11', id: String(p.CVSStoreID || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10), n: String(p.CVSStoreName || '').slice(0, 40), a: String(p.CVSAddress || '').slice(0, 80) };
  const url = (/^https:\/\//.test(app) ? app : 'https://coscoskr.github.io/shop/') + '#cvs=' + encodeURIComponent(JSON.stringify(pick));
  return url; // 用 303 轉址回網站(Supabase 不允許函式直接回傳 HTML 頁面)
}
/** 綠界物流狀態通知(ServerReplyURL):驗證檢查碼(MD5)後處理,回應 1|OK */
export async function handleEcpayLogi({ rawBody, db, env }) {
  const p = Object.fromEntries(new URLSearchParams(rawBody));
  let out = '0|ERR';
  await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
    const cfg = logiCfg(props);
    if (String(p.MerchantID) !== cfg.mid || !logiVerify(cfg, p)) { console.error('ecpay logi: bad mac', p.AllPayLogisticsID); out = '0|CheckMacValue Error'; await tx.commit([], []); return; }
    const rt = createRuntime({ H: code.H, tableData, kv, props, fetchMap: {} });
    try { const r = withRt(rt, () => code.INTERNAL.logiStatus_(p, cfg.test)); console.log('ecpay logi', p.AllPayLogisticsID, p.RtnCode, r); }
    catch (e) { console.error('logiStatus error', e); out = '0|ERR'; await tx.commit([], []); return; }
    await tx.commit(rt.collectOps(), rt.kvOps);
    rt.fetchQueue.forEach((f) => afterLogi.push(f));
    out = '1|OK';
  });
  if (afterLogi.length) { const jobs = afterLogi.splice(0).map((f) => ({ type: 'fetch', f })); await runAfter(jobs, env); }
  return out;
}
const afterLogi = [];
