// 預購商品、已到貨(非現貨下單)的品項:後台加數量要從現貨扣,不是看預購名額
import * as code from './code.js';
import { TABLES, createRuntime } from './adapter.js';
import { execute } from './core.js';
const INT = new Set(['stock','qty','used','usage_limit','item_count','valid_days']);
const DB = {}; Object.keys(TABLES).forEach(n => DB[n] = []); let NEXT = 1; const KV = new Map();
const tname = (tbl) => Object.keys(TABLES).find(k => TABLES[k].table === tbl);
const fakeDb = { async withTx(fn) { return fn({
  async loadAll() { const td = {}; for (const n in TABLES) { const t = TABLES[n]; td[n] = DB[n].map(r => { const o = {}; for (const k in r) { const v = r[k]; o[k] = (v !== null && typeof v === 'number' && t.numSet.has(k) && !INT.has(k)) ? String(v) : v; } return o; }); } return { tableData: td, kv: KV, props: {} }; },
  async commit(ops) { for (const o of ops) { const n = tname(o.table), t = TABLES[n], rows = DB[n];
    if (o.kind === 'delete') { const i = rows.findIndex(r => String(r[o.pkcol]) === String(o.pk)); if (i >= 0) rows.splice(i, 1); }
    else if (o.kind === 'update') Object.assign(rows.find(r => String(r[o.pkcol]) === String(o.pk)), o.rec);
    else { const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; rows.push(r); } } },
}); } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
{ const rt = createRuntime({ H: code.H, tableData: Object.fromEntries(Object.keys(TABLES).map(n => [n, []])), kv: KV, props: {}, fetchMap: {} });
  Object.assign(globalThis, rt.globals); code.__reset(); code.INTERNAL.setup(); code.INTERNAL.saveAdmin_('admin', '管理員', 'Passw0rd!', true);
  for (const o of rt.collectOps()) { const n = tname(o.table), t = TABLES[n]; const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; DB[n].push(r); } }
const call = async (fn, ...args) => { const { body } = await execute({ fn, args, db: fakeDb, env: {} }); return body; };
let r = await call('adminLogin', 'admin', 'Passw0rd!'); const tk = r.result.token;
r = await call('adminSaveProduct', tk, { name: '面膜-膠原蛋白', price: 390, stock: 0, type: '預購', tiers: '', cats: ['美妝'], on: true, vendor: '酷柏', cost: 246, taxIncl: false, source: '韓國', newBrand: 'Biodance' });
const PID = (await call('getShop')).result.products.find(p => p.name === '面膜-膠原蛋白').id;
r = await call('adminAddStockIn', tk, { pid: PID, qty: 26, cost: 246, spec: '', arrived: true });
const rdy = () => JSON.parse(DB['設定'].find(x => x.key === '現貨 ' + PID).value)[''].reduce((a, x) => a + Number(x[0]), 0);
ok(rdy() === 26, '現貨 26');
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-10-08 12:00:00', name: '王', phone: '0912345678', status: '已下訂', subtotal: 390, shipping: 0, total: 390 });
DB['訂單明細'].push({ id: NEXT++, order_id: 'O1', product_id: PID, product_name: '面膜-膠原蛋白', qty: 1, unit_price: 390, line_total: 390, arrival_status: '已到貨', shippable: 'Y', sale_type: '預購', cost: 246, ordered_status: '已叫貨' });
const L = () => DB['訂單明細'].find(l => l.order_id === 'O1');
const edit = (q, arr, type) => call('adminEditLineFull', tk, 'O1', PID, { name: '面膜-膠原蛋白', type: type || '現貨', qty: q, unit: 390, arr: arr || '已到貨', spec: '', vendor: '酷柏', cost: 246, tax: false, src: '韓國', eta: '' });
r = await edit(3); ok(r.ok && Number(L().qty) === 3 && rdy() === 24, '已到貨品項 1→3 從現貨扣 2:' + (r.error || rdy()));
r = await edit(30); ok(!r.ok && /現貨不足,只剩 24 件/.test(r.error) && rdy() === 24 && Number(L().qty) === 3, '超過現貨擋下:' + r.error);
r = await edit(2); ok(r.ok && rdy() === 25, '減 1 退回現貨:' + rdy());
r = await edit(4, '待到貨', '預購'); ok(!r.ok && /預購名額不足/.test(r.error), '待到貨照預購名額:' + r.error);
// LINE 會員下單也要填姓名+電話;會員資料沒有的會存起來
DB['登入階段'].push({ hash: code.INTERNAL.sha_('Lmem1'), line_id: 'UM1', expires: '2099-01-01 00:00:00' });
DB['會員'].push({ line_id: 'UM1', nickname: '小美', friend: 'Y', level: '一般會員', real_name: '', phone: '' });
r = await call('placeOrder', { token: 'Lmem1', items: [{ id: PID, qty: 1 }] }); ok(!r.ok && /姓名/.test(r.error), 'LINE 會員沒填姓名擋下:' + r.error);
r = await call('placeOrder', { token: 'Lmem1', name: '王小美', phone: '12', items: [{ id: PID, qty: 1 }] }); ok(!r.ok && /電話/.test(r.error), 'LINE 會員電話不對擋下:' + r.error);
r = await call('placeOrder', { token: 'Lmem1', name: '王小美', phone: '0912345678', items: [{ id: PID, qty: 1 }] });
const M = DB['會員'].find(m => m.line_id === 'UM1'), O = DB['訂單'].find(o => o.line_id === 'UM1');
ok(r.ok && O && O.name === '王小美' && O.phone === '0912345678' && M.real_name === '王小美' && M.phone === '0912345678', 'LINE 會員填了就能下單,資料存進會員:' + (r.error || JSON.stringify([O && O.name, M.real_name, M.phone])));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
