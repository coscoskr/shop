import * as code from './code.js';
import { TABLES, createRuntime } from './adapter.js';
import { execute } from './core.js';
const INT = new Set(['stock','qty','used','usage_limit','item_count','valid_days']);
const DB = {}; Object.keys(TABLES).forEach(n => DB[n] = []); let NEXT = 1; const KV = new Map(); let txCount = 0;
const tname = (tbl) => Object.keys(TABLES).find(k => TABLES[k].table === tbl);
const fakeDb = { async withTx(fn) { txCount++; return fn({
  async loadAll() { const td = {}; for (const n in TABLES) { const t = TABLES[n]; td[n] = DB[n].map(r => { const o = {}; for (const k in r) { const v = r[k]; o[k] = (v !== null && typeof v === 'number' && t.numSet.has(k) && !INT.has(k)) ? String(v) : v; } return o; }); } return { tableData: td, kv: KV, props: {} }; },
  async commit(ops) { for (const o of ops) { const n = tname(o.table), t = TABLES[n], rows = DB[n];
    if (o.kind === 'delete') { const i = rows.findIndex(r => String(r[o.pkcol]) === String(o.pk)); if (i >= 0) rows.splice(i, 1); }
    else if (o.kind === 'update') Object.assign(rows.find(r => String(r[o.pkcol]) === String(o.pk)), o.rec);
    else { const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; rows.push(r); } } },
}); } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// 以模組方式(嚴格模式)直接種入初始資料
{ const rt = createRuntime({ H: code.H, tableData: Object.fromEntries(Object.keys(TABLES).map(n => [n, []])), kv: KV, props: {}, fetchMap: {} });
  Object.assign(globalThis, rt.globals); code.__reset(); code.INTERNAL.setup(); code.INTERNAL.saveAdmin_('admin', '管理員', 'Passw0rd!', true);
  for (const o of rt.collectOps()) { const n = tname(o.table), t = TABLES[n]; const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; DB[n].push(r); } }
const call = async (fn, ...args) => { const { body } = await execute({ fn, args, db: fakeDb, env: {} }); return body; };
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-11-18 10:00:00', name: '王', phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: 'U1' });
DB['出貨單'].push({ ship_id: 'S1', order_id: 'O1', status: '待匯款', name: '王', phone: '0912345678', pay_method: '匯款', receiver: '【店到店】7-11 竹中門市(店號 123456)｜收件人 王小明', ship_method: '店到店', subtotal: 1000, promo_discount: 0, credit_used: 0, shipping: 60, total: 1060, line_id: 'U1' });
// 直接用內部 mem_ 的替身:把 token 對應寫進 KV 的手機登入
KV.set('m_T1', '0912345678');
let r = await call('memberChangePay', 'T1', 'S1', { pay: '賣貨便' });
const S = () => DB['出貨單'][0];
ok(r.ok && S().pay_method === '賣貨便' && S().status === '待出貨' && Number(S().total) === 1038, 'to 賣貨便 fee 38 total ' + S().total + ' ' + (r.error||''));
r = await call('memberChangePay', 'T1', 'S1', { pay: '付現金' }); ok(!r.ok, 'cash blocked: ' + r.error);
r = await call('memberChangePay', 'T1', 'S1', { pay: '匯款' }); ok(r.ok && S().status === '待匯款' && Number(S().total) === 1060, 'back to 匯款 ' + S().total);
r = await call('memberChangePay', 'T1', 'S1', { pay: '刷卡', kind: 'Installment' }); ok(!r.ok, 'installment gated: ' + r.error);
S().remit_last5 = '12345'; r = await call('memberChangePay', 'T1', 'S1', { pay: '賣貨便' }); ok(!r.ok, 'locked after report: ' + r.error);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
