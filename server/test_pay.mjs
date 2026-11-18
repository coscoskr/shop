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
import { handleEcpayPay } from './core.js';
import { payCfg, payMac, payFields } from './ecpay.js';
const cfg = payCfg({});
DB['訂單'].push({ order_id: 'O9', ordered_at: '2026-11-18 10:00:00', name: '王', phone: '0912345678', status: '處理中', pay_method: '', subtotal: 500, shipping: 0, total: 500, line_id: '' });
DB['出貨單'].push({ ship_id: 'S9', order_id: 'O9', status: '待刷卡', name: '王', phone: '0912345678', pay_method: '刷卡', subtotal: 500, promo_discount: 0, credit_used: 0, shipping: 60, total: 560, line_id: '' });
const cb = async (o) => { const p = Object.assign({ MerchantID: cfg.mid, MerchantTradeNo: 'S9CABC', RtnCode: '1', RtnMsg: '交易成功', TradeNo: '2311181234', TradeAmt: '560', PaymentDate: '2026/11/18 14:00:00', PaymentType: 'Credit_CreditCard', SimulatePaid: '0', CustomField1: 'S9', CustomField2: '', CustomField3: '', CustomField4: '', StoreID: '', TradeDate: '2026/11/18 13:59:00', PaymentTypeChargeFee: '9' }, o); p.CheckMacValue = await payMac(cfg, p); return handleEcpayPay({ rawBody: new URLSearchParams(p).toString(), db: fakeDb, env: {} }); };
const S = () => DB['出貨單'].find(x => x.ship_id === 'S9');
let r = await (async () => { const p = { MerchantID: cfg.mid, RtnCode: '1', CustomField1: 'S9', TradeAmt: '560', CheckMacValue: 'BAD' }; return handleEcpayPay({ rawBody: new URLSearchParams(p).toString(), db: fakeDb, env: {} }); })();
ok(r.startsWith('0|') && S().status === '待刷卡', 'bad mac rejected');
r = await cb({ TradeAmt: '100' }); ok(r === '1|OK' && S().status === '待刷卡', 'amount mismatch not applied');
r = await cb({}); ok(r === '1|OK' && S().status === '已刷卡待出貨', 'paid → 已刷卡待出貨 ' + S().status + ' ' + S().remit_date);
r = await cb({}); ok(r === '1|OK' && S().status === '已刷卡待出貨', 'duplicate ok');
const f = await payFields(cfg, { sid: 'S261118001', total: 560, items: '包包 x1#運費 x1', returnUrl: 'https://x/api?ecpay=pay', backUrl: 'https://coscoskr.github.io/shop/?s=S261118001' });
ok(f.fields.MerchantTradeNo.length <= 20 && f.fields.CheckMacValue.length === 64, 'fields ' + f.fields.MerchantTradeNo + ' ' + f.fields.MerchantTradeDate);
console.log(DB['操作紀錄'].slice(-3).map(x => x.action + ' ' + x.detail));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
