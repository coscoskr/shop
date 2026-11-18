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
const r0 = await call('adminLogin', 'admin', 'Passw0rd!'); const tk = r0.result.token;
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-11-18 10:00:00', name: '王', phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: 'U1' });
DB['購物金'].push({ seq: 1, line_id: 'U1', granted_at: '2026-11-01', amount: 300, remaining: 300, expires: '2099-01-01', source: 't' });
DB['出貨單'].push({ ship_id: 'S1', order_id: 'O1', status: '待匯款', name: '王', phone: '0912345678', pay_method: '匯款', subtotal: 1000, promo_discount: 50, credit_used: 0, shipping: 60, total: 1010, line_id: 'U1', discount_detail: JSON.stringify({ O1: [50, 0] }), credit_detail: '{}' });
const S = () => DB['出貨單'].find(x => x.ship_id === 'S1'), G = () => DB['購物金'][0];
let r = await call('adminOrders', tk); ok(r.ok, 'adminOrders ok');
r = await call('adminAdjustShip', tk, 'S1', { cred: 200, man: 100, notify: false }); ok(r.ok, 'adjust ' + (r.error || r.result.msg));
ok(S().credit_used == 200 && S().promo_discount == 150 && S().total == 710 && G().remaining == 100, 'values ' + S().credit_used + ' ' + S().promo_discount + ' ' + S().total + ' g=' + G().remaining);
r = await call('adminAdjustShip', tk, 'S1', { cred: 50, man: -40, notify: false }); ok(r.ok && G().remaining == 250 && S().total == 1000 + 60 - 10 - 50, 'reduce credit, surcharge ' + S().total + ' g=' + G().remaining);
r = await call('adminAdjustShip', tk, 'S1', { cred: 600, man: 0 }); ok(!r.ok && G().remaining == 250, 'over balance rejected: ' + r.error);
S().status = '已匯款待查帳'; r = await call('adminAdjustShip', tk, 'S1', { cred: 0, man: 0 }); ok(!r.ok, 'locked after payment: ' + r.error);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
