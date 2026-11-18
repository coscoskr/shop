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
import { ecpayCfg, encData, decData } from './ecpay.js';
const cfg = ecpayCfg({}); const seen = [];
let mode = 'ok';
globalThis.fetch = async (url, init) => { const b = JSON.parse(init.body); const d = await decData(cfg, b.Data); seen.push({ url, d });
  const out = mode === 'ok' ? { RtnCode: 1, RtnMsg: '開立發票成功', InvoiceNo: 'AB' + String(10000000 + seen.length), InvoiceDate: '2026-11-18 12:00:00', RandomNumber: '1234' } : { RtnCode: 5000001, RtnMsg: '格式錯誤' };
  return { status: 200, text: async () => JSON.stringify({ TransCode: 1, Data: await encData(cfg, out) }) }; };
let r; const r0 = await call('adminLogin', 'admin', 'Passw0rd!'); const tk = r0.result.token;
const ship = (id, st, extra) => Object.assign({ ship_id: id, order_id: 'O1', status: st, name: '王小明', phone: '0912-345-678', pay_method: '匯款', receiver: 'x', subtotal: 1000, promo_discount: 100, credit_used: 50, shipping: 60, total: 910, line_id: '', invoice_no: '', invoice_date: '' }, extra || {});
DB['出貨單'].push(ship('S1', '已出貨'), ship('S2', '待匯款'), ship('S3', '已出貨', { phone: '04-1234567' }), ship('S4', '已出貨', { subtotal: 300, promo_discount: 0, credit_used: 0, shipping: 0, total: 300 }));
DB['訂單明細'].push({ order_id: 'O1', product_name: '包包', qty: 1, unit_price: 700, line_total: 700, ship_id: 'S1', spec: '黑' }, { order_id: 'O1', product_name: '帽子', qty: 3, unit_price: 100, line_total: 300, ship_id: 'S1' },
  { order_id: 'O1', product_name: '襪子', qty: 3, unit_price: 100, line_total: 300, ship_id: 'S4' });
r = await call('adminIssueInvoice', tk, ['S1', 'S2', 'S3', 'S4']);
ok(r.ok, 'issue ok ' + (r.error || ''));
console.log(r.result && r.result.msg);
const d1 = seen[0].d; const sum = d1.Items.reduce((t, i) => t + i.ItemAmount, 0);
ok(d1.SalesAmount === 910 && sum === 910, 'S1 amount 910, items sum ' + sum + ' ' + JSON.stringify(d1.Items.map(i => [i.ItemName, i.ItemCount, i.ItemPrice, i.ItemAmount])));
ok(d1.CustomerPhone === '0912345678' && d1.CarrierType === '1', 'phone normalized');
ok(seen.length === 2, 'only 2 sent (S2 status, S3 phone skipped): ' + seen.length);
const S = (id) => DB['出貨單'].find(x => x.ship_id === id);
ok(S('S1').invoice_no.startsWith('測試AB') && S('S4').invoice_no && !S('S2').invoice_no, 'saved: ' + S('S1').invoice_no + ' ' + S('S1').invoice_date);
ok(seen[1].d.Items.length === 1 && seen[1].d.Items[0].ItemCount === 3 && seen[1].d.Items[0].ItemPrice === 100, 'S4 no shipping, qty kept');
r = await call('adminIssueInvoice', tk, ['S1']); ok(r.ok && /已開過發票/.test(r.result.msg) && seen.length === 2, 'no double issue');
r = await call('adminDeleteShip', tk, 'S1'); ok(!r.ok, 'cannot delete invoiced: ' + r.error);
r = await call('adminOrders', tk, {}); 
mode = 'bad'; S('S2').status = '已出貨';
r = await call('adminIssueInvoice', tk, ['S2']); ok(r.ok && /開立失敗 1/.test(r.result.msg) && !S('S2').invoice_no, 'failure reported: ' + r.result.msg.split('\n').slice(-1));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
