// LINE Webhook:LINE_MSG_TOKEN 只存在資料表 props(不在 Edge Function Secrets)時,也要能回覆管理員(2026-11-26 怡秀回「A」「A刪」沒有回覆)
import { createHmac } from 'node:crypto';
import * as code from './code.js';
import { TABLES, createRuntime } from './adapter.js';
import { handleWebhook } from './core.js';
const DB = {}; Object.keys(TABLES).forEach(n => DB[n] = []); let NEXT = 1; const KV = new Map();
const tname = (tbl) => Object.keys(TABLES).find(k => TABLES[k].table === tbl);
const apply = (ops) => { for (const o of ops) { const n = tname(o.table), t = TABLES[n], rows = DB[n];
  if (o.kind === 'delete') { const i = rows.findIndex(r => String(r[o.pkcol]) === String(o.pk)); if (i >= 0) rows.splice(i, 1); }
  else if (o.kind === 'update') Object.assign(rows.find(r => String(r[o.pkcol]) === String(o.pk)), o.rec);
  else { const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; rows.push(r); } } };
const load = () => { const td = {}; for (const n in TABLES) td[n] = DB[n].map(r => ({ ...r })); return td; };
const DBPROPS = { LINE_MSG_TOKEN: 'dbtok', LINE_MSG_SECRET: 'sec123' };
const fakeDb = { async withTx(fn) { return fn({ async loadAll() { return { tableData: load(), kv: KV, props: DBPROPS }; }, async commit(ops) { apply(ops); } }); } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
{ const rt = createRuntime({ H: code.H, tableData: load(), kv: KV, props: DBPROPS, fetchMap: {} }); Object.assign(globalThis, rt.globals); code.__reset(); code.INTERNAL.setup(); apply(rt.collectOps()); }
DB['設定'].push({ key: '到貨管理員LINE', value: 'UADMIN0001' });
const calls = [];
globalThis.fetch = async (url, init) => { calls.push({ url: String(url), auth: init && init.headers && (init.headers.Authorization || init.headers.authorization), body: init && init.body }); return { ok: true, status: 200, json: async () => ({}), text: async () => '' }; };
const send = async (uid, text) => {
  const body = JSON.stringify({ events: [{ type: 'message', replyToken: 'rt-' + text, source: { type: 'user', userId: uid }, message: { type: 'text', text } }] });
  const sig = createHmac('sha256', DBPROPS.LINE_MSG_SECRET).update(body).digest('base64');
  const r = await handleWebhook({ rawBody: body, signature: sig, db: fakeDb, env: { props: {} } }); // Secrets 裡沒有 LINE_MSG_TOKEN
  if (r.later) await r.later; return r;
};
calls.length = 0;
let r = await send('UADMIN0001', '待上架');
const rep = calls.find(c => /\/v2\/bot\/message\/reply/.test(c.url));
ok(r.ok && rep && rep.auth === 'Bearer dbtok' && /沒有等確認上架/.test(rep.body), 'admin reply sent with token from props table ' + JSON.stringify(rep || calls.map(c => c.url)));
calls.length = 0;
r = await send('UNOBODY0001', '待上架');
ok(r.ok && !calls.some(c => /message\/reply/.test(c.url)), 'non-admin gets no reply');
const bad = await handleWebhook({ rawBody: '{"events":[]}', signature: 'x', db: fakeDb, env: { props: {} } });
ok(!bad.ok, 'bad signature rejected');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
