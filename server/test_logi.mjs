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
import { handleEcpayLogi, handleEcpayMap } from './core.js';
import { logiCfg, logiMac } from './ecpay.js';
const cfg = logiCfg({});
const r0 = await call('adminLogin', 'admin', 'Passw0rd!'); const tk = r0.result.token;
DB['設定'].push({ key: '寄件人姓名', value: '陳緯安' }, { key: '寄件人手機', value: '0958072395' });
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-11-18 10:00:00', name: '王', phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: 'U1' });
DB['出貨單'].push({ ship_id: 'S1', order_id: 'O1', status: '待出貨', name: '王', phone: '0912-345-678', pay_method: '賣貨便', receiver: '【店到店】7-11 竹中門市(店號 123456)｜收件人 王小明', ship_method: '店到店', subtotal: 1000, promo_discount: 0, credit_used: 0, shipping: 65, total: 1065, line_id: 'U1', logistics_id: '' });
DB['出貨單'].push({ ship_id: 'S2', order_id: 'O1', status: '待匯款', name: '王', phone: '0912345678', pay_method: '匯款', receiver: '【店到店】全家 某店(店號 F001)｜收件人 王小明', ship_method: '店到店', subtotal: 500, promo_discount: 0, credit_used: 0, shipping: 65, total: 565, line_id: 'U1', logistics_id: '' });
const S = (id) => DB['出貨單'].find(x => x.ship_id === id);
let sent = null;
globalThis.fetch = async (url, init) => { sent = { url, body: Object.fromEntries(new URLSearchParams(init.body)) }; return { status: 200, text: async () => '1|AllPayLogisticsID=1718546&BookingNote=&CVSPaymentNo=C9876543&CVSValidationNo=1234&CheckMacValue=X' }; };
let r = await call('adminLogiCreate', tk, 'S1');
ok(r.ok && /寄件代碼:C98765431234/.test(r.result.msg), 'create COD ' + (r.error || ''));
ok(sent.body.IsCollection === 'Y' && sent.body.CollectionAmount === '1065' && sent.body.ReceiverStoreID === '123456' && sent.body.ReceiverCellPhone === '0912345678' && sent.body.SenderName === '陳緯安' && sent.body.LogisticsSubType === 'UNIMARTC2C', 'payload ' + JSON.stringify(sent.body).slice(0, 200));
ok(sent.body.CheckMacValue === logiMac(cfg, sent.body), 'mac ok');
ok(S('S1').logistics_id.startsWith('測試:1718546|C9876543|1234|UNIMARTC2C') && S('S1').carrier === '7-11', 'saved ' + S('S1').logistics_id);
r = await call('adminLogiCreate', tk, 'S1'); ok(!r.ok, 'no double: ' + r.error);
r = await call('adminLogiCreate', tk, 'S2'); ok(!r.ok && /還沒付款/.test(r.error), 'unpaid blocked: ' + r.error);
r = await call('adminLogiPrint', tk, 'S1'); ok(r.ok && /PrintUniMartC2COrderInfo/.test(r.result.action) && r.result.fields.CVSValidationNo === '1234', 'print fields');
const cb = async (code) => { const p = { MerchantID: cfg.mid, MerchantTradeNo: 'S1LX', RtnCode: code, RtnMsg: 'x', AllPayLogisticsID: '1718546', LogisticsType: 'CVS', LogisticsSubType: 'UNIMARTC2C', GoodsAmount: '1065', UpdateStatusDate: '2026/11/20 10:00:00', ReceiverName: '王小明', ReceiverPhone: '', ReceiverCellPhone: '0912345678', ReceiverEmail: '', ReceiverAddress: '', CVSPaymentNo: 'C9876543', CVSValidationNo: '1234', BookingNote: '' }; p.CheckMacValue = logiMac(cfg, p); return handleEcpayLogi({ rawBody: new URLSearchParams(p).toString(), db: fakeDb, env: {} }); };
globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' });
r = await cb('2063'); ok(r === '1|OK', 'arrive cb');
S('S1').status = '已出貨'; r = await cb('2074'); ok(r === '1|OK' && S('S1').status === '已退回', 'return → 已退回');
r = await handleEcpayLogi({ rawBody: 'MerchantID=' + cfg.mid + '&AllPayLogisticsID=1&CheckMacValue=BAD', db: fakeDb, env: {} }); ok(r.startsWith('0|'), 'bad mac');
const html = await handleEcpayMap({ rawBody: 'LogisticsSubType=FAMIC2C&CVSStoreID=F012&CVSStoreName=' + encodeURIComponent('全家台中店') + '&CVSAddress=x', db: fakeDb, env: {} });
ok(/#cvs=/.test(html) && /F012/.test(decodeURIComponent(html)), 'map redirect');
console.log(DB['操作紀錄'].slice(-4).map(x => x.action + ' ' + x.detail));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
