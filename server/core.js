// 請求處理核心:一次呼叫 = 一個資料庫交易(取得鎖 → 讀資料 → 執行原本的商業邏輯 → 寫回)
import * as code from './code.js';
import { createRuntime } from './adapter.js';

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
export async function execute({ fn, args, db, env }) {
  const isPublic = Object.prototype.hasOwnProperty.call(code.API, fn) || Object.prototype.hasOwnProperty.call(SPECIAL, fn);
  if (!isPublic) return { body: { ok: false, error: '不存在的功能:' + String(fn).slice(0, 40) }, after: [] };
  args = Array.isArray(args) ? args : [];
  const after = [];
  const body = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
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
  });
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
        await fetch(a.f.url, init);
      } else if (a.type === 'mail' && env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM || 'onboarding@resend.dev', to: [a.m.to], subject: a.m.subject, text: a.m.body }),
        });
      }
    } catch (e) { /* 通知失敗不影響主流程 */ }
  }
}
