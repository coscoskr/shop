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
// 預購商品的現貨:多的數量(庫存進貨已到貨)→ 同一個商品顯示現貨;下單數量夠就整筆用現貨,不夠整筆預購;刪訂單/改品項/刪庫存進貨會退回或扣回
let r = await call('adminLogin', 'admin', 'Passw0rd!'); const tk = r.result.token;
r = await call('adminSaveProduct', tk, { name: '貓耳毛帽', price: 1280, stock: '', unlimited: true, type: '預購', tiers: '', cats: ['帽'], on: true, vendor: '酷柏', cost: 900, taxIncl: false, source: '韓國', newBrand: 'MLB', specs: [{ n: '黑', q: '' }, { n: '灰', q: '' }] });
ok(r.ok, 'save pre-order product with specs: ' + JSON.stringify(r).slice(0, 90));
r = await call('adminSaveProduct', tk, { name: '擴香禮盒', price: 1100, stock: '', unlimited: true, type: '預購', tiers: '', cats: ['香氛'], on: true, vendor: '酷柏', cost: 700, taxIncl: false, source: '韓國', newBrand: 'Hetras' });
r = await call('adminSaveProduct', tk, { name: '現貨餅乾', price: 100, stock: 5, type: '現貨', tiers: '', cats: ['零食'], on: true, vendor: 'B', cost: 40, taxIncl: true, source: 'KR', newBrand: 'DP' });
r = await call('getShop'); const P = Object.fromEntries(r.result.products.map(p => [p.name, p]));
const HAT = P['貓耳毛帽'].id, BOX = P['擴香禮盒'].id, COOKIE = P['現貨餅乾'].id;
ok(P['貓耳毛帽'].specs.join() === '黑,灰' && P['貓耳毛帽'].ready === null && P['貓耳毛帽'].stock === null, 'no ready stock at first');
const shop = async (name) => (await call('getShop')).result.products.find(p => p.name === name);
const set = (k) => (DB['設定'].find(x => x.key === k) || {}).value;
const lineOf = (oid, pid) => DB['訂單明細'].find(l => l.order_id === oid && l.product_id === pid);
const buy = async (items) => call('placeOrder', { email: 'a@b.co', name: '王', phone: '0912345678', items });
// 1) 庫存進貨已到貨 → 預購商品變成現貨;現貨型態的商品照舊加數量
r = await call('adminAddStockIn', tk, { pid: HAT, qty: 2, cost: 961, spec: '灰', arrived: true }); ok(r.ok, 'stock-in 灰 ×2 arrived');
r = await call('adminAddStockIn', tk, { pid: HAT, qty: 1, cost: 1000, spec: '灰', arrived: true });
r = await call('adminAddStockIn', tk, { pid: BOX, qty: 1, cost: 650, spec: '', arrived: true });
r = await call('adminAddStockIn', tk, { pid: COOKIE, qty: 3, cost: 40, spec: '', arrived: true });
ok(JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":3}' && JSON.stringify((await shop('擴香禮盒')).ready) === '{"":1}', 'ready stock shown on the same product: ' + set('現貨 ' + HAT));
ok((await shop('現貨餅乾')).stock === 8 && (await shop('現貨餅乾')).ready === null, 'in-stock product keeps old behaviour (5 → 8)');
r = await call('adminStockView', tk); ok(JSON.stringify(r.result.products.find(p => p.id === HAT).ready) === '{"灰":3}', 'admin stock view shows ready stock');
// 2) 數量夠:整筆用現貨(已到貨、可出貨、型態現貨、成本=那批貨的成本,先進先出)
r = await buy([{ id: HAT + '~灰', qty: 2 }, { id: HAT + '~黑', qty: 1 }]); const O1 = r.result.id || r.result.oid || DB['訂單'][DB['訂單'].length - 1].order_id;
let g = lineOf(O1, HAT + '~灰'), b = lineOf(O1, HAT + '~黑');
ok(r.ok && g.arrival_status === '已到貨' && g.shippable === 'Y' && g.sale_type === '現貨' && Number(g.cost) === 961, 'enough ready stock → whole line from stock, cost 961: ' + JSON.stringify(r).slice(0, 60));
ok(b.arrival_status === '待到貨' && b.shippable === 'N' && b.sale_type === '預購' && Number(b.cost) === 900, 'other spec without ready stock stays pre-order');
ok(JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":1}', 'ready 3 → 1');
// 3) 數量不夠:整筆預購,不拆單,現貨不動
r = await buy([{ id: HAT + '~灰', qty: 2 }]); const O2 = DB['訂單'][DB['訂單'].length - 1].order_id; g = lineOf(O2, HAT + '~灰');
ok(r.ok && g.arrival_status === '待到貨' && g.sale_type === '預購' && JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":1}', 'not enough → whole line pre-order, ready untouched');
// 4) 刪訂單:用現貨出的退回現貨(成本跟著回去)
r = await call('adminDeleteOrder', tk, O1); ok(r.ok && JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":3}', 'delete order → ready back to 3: ' + set('現貨 ' + HAT));
// 5) 後台改品項:現貨品項改數量,夠就照現貨;不夠會擋;改成預購就只退回
r = await buy([{ id: HAT + '~灰', qty: 1 }]); const O3 = DB['訂單'][DB['訂單'].length - 1].order_id;
ok(lineOf(O3, HAT + '~灰').sale_type === '現貨' && JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":2}', 'buy 1 from stock (ready 2 left)');
r = await call('adminEditLineFull', tk, O3, HAT + '~灰', { keep: true, qty: 3, unit: 1280 });
ok(r.ok && Number(lineOf(O3, HAT + '~灰').qty) === 3 && (await shop('貓耳毛帽')).ready === null, 'edit qty 1 → 3 uses the remaining ready stock: ' + JSON.stringify(r).slice(0, 70));
r = await call('adminEditLineFull', tk, O3, HAT + '~灰', { keep: true, qty: 4, unit: 1280 });
ok(!r.ok && /現貨不足/.test(r.error) && Number(lineOf(O3, HAT + '~灰').qty) === 3 && (await shop('貓耳毛帽')).ready === null, 'edit beyond ready stock is refused and nothing changes: ' + r.error);
r = await call('adminEditLineFull', tk, O3, HAT + '~灰', { keep: true, qty: 1, unit: 1280 });
ok(r.ok && JSON.stringify((await shop('貓耳毛帽')).ready) === '{"灰":2}', 'edit qty 3 → 1 returns 2');
// 6) 刪除已到貨的庫存進貨:現貨扣回
const K = DB['庫存進貨'].find(k => k.product_id === BOX).order_id;
r = await call('adminDeleteStockIn', tk, K); ok(r.ok && (await shop('擴香禮盒')).ready === null, 'delete stock-in → ready removed');
// 7) 沒有規格的商品也一樣;預購名額滿了但有現貨時,數量夠還是可以買(用現貨,不佔名額)
r = await call('adminAddStockIn', tk, { pid: BOX, qty: 2, cost: 650, spec: '', arrived: true });
DB['商品'].find(p => p.id === BOX).stock = 0;
r = await buy([{ id: BOX, qty: 2 }]); const O4 = DB['訂單'][DB['訂單'].length - 1].order_id;
ok(r.ok && lineOf(O4, BOX).sale_type === '現貨' && Number(lineOf(O4, BOX).cost) === 650 && DB['商品'].find(p => p.id === BOX).stock === 0, 'quota 0 but ready 2 → order of 2 goes through from stock: ' + JSON.stringify(r).slice(0, 60));
r = await buy([{ id: BOX, qty: 1 }]); ok(!r.ok, 'no ready stock and no quota → refused: ' + r.error);
// 8) 現貨商品下單照舊
r = await buy([{ id: COOKIE, qty: 2 }]); ok(r.ok && DB['商品'].find(p => p.id === COOKIE).stock === 6, 'in-stock product order still deducts quantity (8 → 6)');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
