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

/**
 * LINE 官方帳號的 Webhook:客人傳訊息或加好友時,把他記進會員清單(代客下單可直接選)。
 * 驗證:用 Messaging API 頻道的 Channel secret 檢查 x-line-signature,不符就拒絕。
 */
export async function handleWebhook({ rawBody, signature, db, env }) {
  let events = [];
  const jobs = [], after = [];
  const ok = await db.withTx(async (tx) => {
    const { tableData, kv, props: dbProps } = await tx.loadAll();
    const props = Object.assign({}, env.props || {}, dbProps);
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
          else if (r && r.ai) jobs.push({ kind: 'ai', uid, token: ev.replyToken, text: String(ev.message.text || '').slice(0, 6000) });
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
      try { if (job.kind === 'reply') await lineReply(job, job.text, env); else await runArrivalJob(job, { db, env }); } catch (e) { console.error('arrival job error', e); await lineReply(job, '處理失敗,請稍後再試或到後台手動處理。', env).catch(() => {}); }
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
