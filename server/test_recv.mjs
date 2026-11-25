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
DB['訂單'].push({ order_id: 'O1', ordered_at: '2026-11-18 10:00:00', name: '王', phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: '' });
DB['出貨單'].push({ ship_id: 'S1', order_id: 'O1', status: '待匯款', name: '王', phone: '0912345678', pay_method: '匯款', receiver: '【店到店】7-11 竹中門市｜收件人 王小明', ship_method: '店到店', subtotal: 1000, promo_discount: 0, credit_used: 0, shipping: 60, total: 1060, line_id: '' });
const S = () => DB['出貨單'][0];
const base = { st: '待匯款', co: '', no: '', fee: '60', phone: '0912345678', link: '', ship: '', note: '' };
let r = await call('adminUpdateShip', tk, 'S1', Object.assign({}, base, { method: '宅配', rname: '王小明', addr: '台中市北區忠明五街20號' }));
ok(r.ok && S().ship_method === '宅配' && /【宅配】台中市/.test(S().receiver), 'to 宅配 ' + (r.error || S().receiver + ' fee=' + S().shipping));
ok(S().carrier === '新竹物流', '宅配 → 物流 auto 新竹物流: ' + S().carrier);
r = await call('adminUpdateShip', tk, 'S1', Object.assign({}, base, { fee: String(S().shipping), method: '宅配', rname: '王小明', addr: '台中市北區忠明五街20號', co: '黑貓', no: 'TN123', note: '備註X', phone: '0911222333', last5: '12345' }));
ok(r.ok && S().carrier === '黑貓' && S().tracking_no === 'TN123' && S().note === '備註X' && S().phone === '0911222333' && S().remit_last5 === '12345', 'edit saves 物流/單號/備註/電話/後五碼 ' + JSON.stringify({ c: S().carrier, no: S().tracking_no, note: S().note, ph: S().phone, l5: S().remit_last5 }));
r = await call('adminUpdateShip', tk, 'S1', Object.assign({}, base, { fee: String(S().shipping), method: '自取', rname: '王小明' }));
ok(r.ok && S().receiver === '【自取】取貨人 王小明' && Number(S().shipping) === 0, 'to 自取 fee ' + S().shipping);
r = await call('adminUpdateShip', tk, 'S1', Object.assign({}, base, { fee: '0', pay: '賣貨便', method: '店到店', cvs: '全家', store: '某店', rname: '王小明' }));
ok(!r.ok, '賣貨便 needs 7-11: ' + r.error);
r = await call('adminUpdateShip', tk, 'S1', Object.assign({}, base, { fee: '0', pay: '賣貨便', method: '店到店', cvs: '7-11', store: '竹中', rname: '王小明' }));
ok(r.ok && S().pay_method === '賣貨便' && S().status === '待出貨', 'to 賣貨便 ' + (r.error || S().receiver + ' fee=' + S().shipping));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
{ // 付現金自取:待自取通知 → 可自取 → 已自取付款
  DB['出貨單'].push({ ship_id: 'S9', order_id: 'O1', status: '待自取通知', name: '王', phone: '0912345678', pay_method: '付現金', receiver: '【自取】取貨人 王小明', ship_method: '自取', subtotal: 500, promo_discount: 0, credit_used: 0, shipping: 0, total: 500, line_id: '' });
  const S9 = () => DB['出貨單'].find(x => x.ship_id === 'S9');
  const b9 = { co: '', no: '', fee: '0', phone: '0912345678', link: '', ship: '', note: '', method: '自取', rname: '王小明' };
  let r9 = await call('adminUpdateShip', tk, 'S9', Object.assign({}, b9, { st: '可自取' }));
  ok(r9.ok && S9().status === '可自取' && !S9().shipped_at, 'cash → 可自取 ' + (r9.error || ''));
  r9 = await call('adminUpdateShip', tk, 'S9', Object.assign({}, b9, { st: '已自取付款' }));
  ok(r9.ok && S9().status === '已自取付款' && !!S9().shipped_at, 'cash → 已自取付款 ' + (r9.error || ''));
  if (fails) process.exit(1);
}
{ // 手動發購物金:可一次發多張;10 秒內重複發同額要確認(force)
  DB['會員'] = DB['會員'] || []; DB['會員'].push({ line_id: 'UG1', nickname: 'Avan', friend: 'Y', level: '一般會員' });
  DB['購物金'] = DB['購物金'] || [];
  const cnt = () => DB['購物金'].filter(g => g.line_id === 'UG1').length;
  let g = await call('adminGrant', tk, 'UG1', 50, 90, '', false, 2); ok(g.ok && cnt() === 2, 'grant 2 × 50 ' + (g.error || ''));
  g = await call('adminGrant', tk, 'UG1', 50, 90, '', false, 1); ok(!g.ok && /^DUPGRANT:/.test(g.error) && cnt() === 2, 'repeat within 10s needs confirm');
  g = await call('adminGrant', tk, 'UG1', 50, 90, '', true, 1); ok(g.ok && cnt() === 3, 'force repeat ok');
  if (fails) process.exit(1);
}
