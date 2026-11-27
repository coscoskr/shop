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
DB['商品'].push({ id: 'P1', name: '精華梳', categories: '', sale_type: '預購', price: 520, stock: null, arrival: '', on_sale: 'Y', specs: '' });
DB['折扣碼'].push({ code: 'LOVECOS', type: '百分比', value: 2.5, enabled: 'Y', used: 1, usage_limit: 0, min_spend: 0 });
DB['折扣碼'].push({ code: 'MIN1000', type: '金額', value: 100, enabled: 'Y', used: 1, usage_limit: 0, min_spend: 1000 });
const mk = (oid, qty, extra) => { DB['訂單'].push(Object.assign({ order_id: oid, ordered_at: '2026-11-27 10:00:00', name: '王', phone: '0912', status: '已下訂', subtotal: 520 * qty, shipping: 0, credit_used: 0, line_id: 'U1' }, extra));
  DB['訂單明細'].push({ id: NEXT++, order_id: oid, product_id: 'P1', product_name: '精華梳', qty, unit_price: 520, line_total: 520 * qty, arrival_status: '待到貨', sale_type: '預購', ship_id: '' }); };
const O = (id) => DB['訂單'].find(x => x.order_id === id);
const edit = (oid, q) => call('adminEditLineFull', tk, oid, 'P1', { qty: q, unit: 520, keep: true });
mk('O1', 2, { discount_code: 'LOVECOS', promo_name: '折扣碼 LOVECOS', promo_discount: 26, total: 1014 });
let r = await edit('O1', 1); ok(r.ok && O('O1').promo_discount == 13 && O('O1').total == 507 && O('O1').subtotal == 520, 'percent code 2→1: ' + (r.error || O('O1').promo_discount + ' ' + O('O1').total));
r = await edit('O1', 4); ok(r.ok && O('O1').promo_discount == 52 && O('O1').total == 2028, 'percent code 1→4: ' + O('O1').promo_discount);
mk('O2', 2, { discount_code: 'MIN1000', promo_name: '折扣碼 MIN1000', promo_discount: 100, total: 940 });
r = await edit('O2', 1); ok(!r.ok && /最低消費/.test(r.error) && O('O2').promo_discount == 100 && DB['訂單明細'].find(x => x.order_id === 'O2').qty == 2, 'below min spend blocked: ' + r.error);
r = await edit('O2', 3); ok(r.ok && O('O2').promo_discount == 100 && O('O2').total == 1460, 'fixed code stays 100: ' + O('O2').total);
mk('O3', 4, { promo_name: '手動調整', promo_discount: 1000, total: 1080 });
r = await edit('O3', 1); ok(r.ok && O('O3').promo_discount == 520 && O('O3').total == 0, 'manual capped to subtotal: ' + O('O3').promo_discount);
mk('O4', 2, { promo_name: '群友優惠', promo_discount: 104, total: 936 });
r = await edit('O4', 4); ok(r.ok && O('O4').promo_discount == 208, 'level percent scales: ' + O('O4').promo_discount);
mk('O5', 2, { discount_code: 'LOVECOS', promo_name: '折扣碼 LOVECOS', promo_discount: 26, total: 1014 });
DB['訂單明細'].push({ id: NEXT++, order_id: 'O5', product_id: 'P1~x', product_name: '精華梳', qty: 1, unit_price: 520, line_total: 520, arrival_status: '已到貨', sale_type: '預購', ship_id: 'S9', spec: 'x' });
r = await edit('O5', 1); ok(r.ok && O('O5').promo_discount == 26, 'has shipment → unchanged: ' + (r.error || O('O5').promo_discount));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
