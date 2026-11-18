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
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-11-01 10:00:00', name: '王', phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: '' });
DB['訂單明細'].push({ order_id: 'O1', product_id: 'P1', product_name: 'A', qty: 2, unit_price: 300, line_total: 600, ship_id: 'S1', cost: 200 }, { order_id: 'O1', product_id: 'P2', product_name: 'B', qty: 1, unit_price: 400, line_total: 400, ship_id: 'S2', cost: 100 });
DB['出貨單'].push({ ship_id: 'S1', order_id: 'O1', status: '已出貨', name: '王', phone: '1', pay_method: '匯款', subtotal: 600, promo_discount: 50, credit_used: 20, shipping: 60, total: 590, shipped_at: '2026-11-18 15:00:00', items: 'A×2' },
  { ship_id: 'S2', order_id: 'O1', status: '已出貨', name: '王', phone: '1', pay_method: '匯款', subtotal: 400, promo_discount: 0, credit_used: 0, shipping: 0, total: 400, shipped_at: '2026-11-17 15:00:00', items: 'B×1' });
let r = await call('adminReport', tk, { oFrom: '2026-11-18', oTo: '2026-11-18' });
const m = r.result.sum; console.log(JSON.stringify({ ships: m.ships, rev: m.shipRev, cost: m.shipCost, profit: m.shipProfit, fee: m.shipFee, orders: m.orders }));
ok(m.ships === 1 && m.shipRev === 550 && m.shipCost === 400 && m.shipProfit === 150 && m.orders === 0, 'day ship stats');
r = await call('adminReport', tk, { oFrom: '2026-11-01', oTo: '2026-11-30' }); ok(r.result.sum.ships === 2 && r.result.sum.shipRev === 950, 'month ' + r.result.sum.shipRev);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
