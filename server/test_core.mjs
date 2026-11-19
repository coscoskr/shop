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
ok(Object.keys(code.API).length > 60, 'API exported: ' + Object.keys(code.API).length);
let r = await call('adminLogin', 'admin', 'Passw0rd!'); ok(r.ok && r.result.token, 'admin login');
const tk = r.result.token;
r = await call('adminLogin', 'admin', 'wrong'); ok(r.ok && !r.result.token, 'wrong password rejected: ' + JSON.stringify(r.result).slice(0,60));
r = await call('adminInit', tk); ok(r.ok, 'adminInit with token from KV (cross-request session)');
r = await call('adminInit', 'bad'); ok(!r.ok, 'bad token rejected');
r = await call('adminSaveProduct', tk, { name: '測試鞋', price: 800, stock: 5, type: '現貨', tiers: '', cats: ['鞋'], on: true, vendor: 'B', cost: 400, taxIncl: true, source: 'TW', newBrand: 'Nike' });
ok(r.ok, 'save product: ' + JSON.stringify(r).slice(0, 80));
r = await call('getShop'); ok(r.ok && r.result.products.length === 1 && r.result.products[0].price === 800 && r.result.products[0].stock === 5, 'getShop returns typed product');
const pid = r.result.products[0].id;
r = await call('placeOrder', { email: 'a@b.co', name: '王', phone: '0912345678', items: [{ id: pid, qty: 2 }] });
ok(r.ok && r.result.total === 1600, 'placeOrder total 1600: ' + JSON.stringify(r).slice(0, 100));
r = await call('getShop'); ok(r.result.products[0].stock === 3, 'stock decremented to 3 (persisted)');
r = await call('placeOrder', { email: 'a@b.co', name: '王', phone: '0912345678', items: [{ id: pid, qty: 99 }] }); ok(!r.ok, 'oversell rejected: ' + r.error);
r = await call('getShop'); ok(r.result.products[0].stock === 3, 'failed order did not change stock');
{ // 關團日期:當天中午 12:00(台灣)起視同下架
  const real = Date.now, T = Date.UTC(2026, 10, 21, 4, 0, 0);
  r = await call('adminSaveProduct', tk, { id: pid, name: '測試鞋', price: 800, stock: 3, type: '現貨', tiers: '', cats: ['鞋'], on: true, vendor: 'B', cost: 400, taxIncl: true, source: 'TW', brand: 'Nike', close: '2026/11/21' });
  ok(!r.ok && /格式/.test(r.error), 'bad close format: ' + r.error);
  Date.now = () => T - 60000;
  r = await call('adminSaveProduct', tk, { id: pid, name: '測試鞋', price: 800, stock: 3, type: '現貨', tiers: '', cats: ['鞋'], on: true, vendor: 'B', cost: 400, taxIncl: true, source: 'TW', brand: 'Nike', close: '2026-11-21' });
  ok(r.ok, 'save with close date');
  r = await call('getShop'); ok(r.result.products.length === 1 && r.result.products[0].close === '2026-11-21', '11:59 still on sale');
  Date.now = () => T;
  r = await call('getShop'); ok(r.result.products.length === 0, '12:00 hidden from shop (even cached)');
  r = await call('placeOrder', { email: 'a@b.co', name: '王', phone: '0912345678', items: [{ id: pid, qty: 1 }] }); ok(!r.ok && /關團/.test(r.error), 'order after close rejected: ' + r.error);
  r = await call('adminInit', tk); const ap = r.result.products.find(x => x.id === pid); ok(ap && ap.closed === true, 'admin sees closed');
  r = await call('adminBatchProducts', tk, [pid], 'off'); r = await call('adminBatchProducts', tk, [pid], 'on'); ok(r.ok && /關團/.test(r.result.msg), 'batch on skips closed: ' + (r.result && r.result.msg));
  r = await call('adminSaveProduct', tk, { id: pid, name: '測試鞋', price: 800, stock: 3, type: '現貨', tiers: '', cats: ['鞋'], on: true, vendor: 'B', cost: 400, taxIncl: true, source: 'TW', brand: 'Nike', close: '2026-11-21' });
  ok(!r.ok && /已經過了/.test(r.error), 'cannot relist past close: ' + r.error);
  r = await call('adminSaveProduct', tk, { id: pid, name: '測試鞋', price: 800, stock: 3, type: '現貨', tiers: '', cats: ['鞋'], on: true, vendor: 'B', cost: 400, taxIncl: true, source: 'TW', brand: 'Nike', close: '' });
  ok(r.ok, 'clear close date relists');
  r = await call('getShop'); ok(r.result.products.length === 1, 'back on shop');
  Date.now = real;
}
r = await call('adminOrders', tk, {}); ok(r.ok, 'adminOrders');
r = await call('nope'); ok(!r.ok, 'unknown fn rejected');
r = await call('setup'); ok(!r.ok, 'setup not callable');
r = await call('authAll'); ok(!r.ok, 'authAll not callable');
r = await call('adminSaveCode', tk, { code: 'VIP5', type: '百分比', value: 5 }); ok(r.ok, 'discount code');
r = await call('quote', '', [{ id: pid, qty: 1 }], false, 'vip5'); ok(r.ok && r.result.discount === 40, 'quote with code: ' + JSON.stringify(r.result).slice(0, 80));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED', '(transactions:', txCount + ')');
