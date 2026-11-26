// 2026-11-26 酷柏到貨多出來的貨:管理員回「已處理」結案(人工處理過,不上架、不動庫存、不再提醒)
import { createHmac } from 'node:crypto';
import * as code from './code.js';
import { TABLES, createRuntime } from './adapter.js';
import { handleCoolbau } from './core.js';
const INT = new Set(['stock','qty','used','usage_limit','item_count','valid_days']);
const DB = {}; Object.keys(TABLES).forEach(n => DB[n] = []); let NEXT = 1; const KV = new Map();
const tname = (tbl) => Object.keys(TABLES).find(k => TABLES[k].table === tbl);
const apply = (ops) => { for (const o of ops) { const n = tname(o.table), t = TABLES[n], rows = DB[n];
  if (o.kind === 'delete') { const i = rows.findIndex(r => String(r[o.pkcol]) === String(o.pk)); if (i >= 0) rows.splice(i, 1); }
  else if (o.kind === 'update') Object.assign(rows.find(r => String(r[o.pkcol]) === String(o.pk)), o.rec);
  else { const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; rows.push(r); } } };
const load = () => { const td = {}; for (const n in TABLES) { const t = TABLES[n]; td[n] = DB[n].map(r => { const o = {}; for (const k in r) { const v = r[k]; o[k] = (v !== null && typeof v === 'number' && t.numSet.has(k) && !INT.has(k)) ? String(v) : v; } return o; }); } return td; };
const PROPS = { LINE_MSG_TOKEN: 'tok' };
const fakeDb = { async withTx(fn) { return fn({ async loadAll() { return { tableData: load(), kv: KV, props: PROPS }; }, async commit(ops, kvOps) { apply(ops); } }); } };
// 直接在一個「交易」裡執行內部函式(模擬管理員在 LINE 回覆)
const run = (fn) => { const rt = createRuntime({ H: code.H, tableData: load(), kv: KV, props: PROPS, fetchMap: {} }); Object.assign(globalThis, rt.globals); code.__reset(); const r = fn(code.INTERNAL); apply(rt.collectOps()); return { r, pushes: rt.fetchQueue }; };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
run((I) => { I.setup(); });
// 外部網路:LINE 推播記下來;Anthropic 回傳預先準備好的配對
const sent = []; let aiReply = { items: [] }, aiCalls = 0, aiPrompt = '';
globalThis.fetch = async (url, init) => {
  if (/api\.anthropic\.com/.test(url)) { aiCalls++; aiPrompt = JSON.parse(init.body).messages[0].content[0].text; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify(aiReply) }] }), text: async () => '' }; }
  if (/api\.line\.me/.test(url)) { const j = JSON.parse(init.body); sent.push({ to: j.to || 'reply', text: (j.messages[0].text || j.messages[0].altText || '') }); return { ok: true, status: 200, json: async () => ({}), text: async () => '' }; }
  return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
};
const SECRET = 'test-secret-0123456789abcdef';
const env = { props: { LINE_MSG_TOKEN: 'tok', ANTHROPIC_API_KEY: 'k' } };
const post = async (d, o) => { const body = JSON.stringify(Object.assign({ v: 1, ts: Math.floor(Date.now() / 1000) }, d)); const sig = (o && o.sig) || createHmac('sha256', (o && o.secret) || SECRET).update(body).digest('hex'); const r = await handleCoolbau({ rawBody: body, signature: sig, db: fakeDb, env }); if (r.later) await r.later; return r; };

// 資料:兩個商品(一個有規格、一個沒有)、三張訂單
DB['商品'].push({ id: 'P072', name: '蝴蝶結貓耳毛帽', categories: '', sale_type: '預購', price: 1280, stock: null, specs: '黑|白|灰|粉', on_sale: 'Y', brand: 'MLB' });
DB['商品'].push({ id: 'P008', name: 'Hello Kitty聯名款擴香3入禮盒組', categories: '', sale_type: '預購', price: 1100, stock: null, specs: '', on_sale: 'Y', brand: 'Hetras' });
DB['設定'].push({ key: '到貨管理員LINE', value: 'UADMIN' });
const INN = (pid) => DB['商品_內部'].find(r => r.product_id === pid);
const order = (id, at, lid) => DB['訂單'].push({ order_id: id, ordered_at: at, name: '客' + id, phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: lid });
const line = (oid, pid, name, spec, qty) => DB['訂單明細'].push({ id: NEXT++, order_id: oid, product_id: pid, product_name: name, qty, unit_price: 1000, line_total: 1000 * qty, arrival_status: '未到貨', shippable: '', ship_requested: '', ship_id: '', sale_type: '預購', spec });
const L = (oid, pid) => DB['訂單明細'].find(r => r.order_id === oid && r.product_id === pid);
const setv = (k) => (DB['設定'].find(r => r.key === k) || {}).value;
env.props.COOLBAU_ARR_SECRET = SECRET;
const sz = ['EU36','EU37','EU38','EU39','EU40'];
const specs = (cols) => cols.flatMap(c => sz.map(z => c + ' / ' + z)).join('|');
DB['商品'].push({ id: 'P335', name: '雙帶羊毛拖鞋（OZ3010）', categories: '', sale_type: '預購', price: 2200, stock: null, specs: specs(['#WHITE NATURE FUR 白', '#GREY 灰']), on_sale: 'Y', brand: 'UGG' });
DB['商品'].push({ id: 'P048', name: 'OZLANA哈林頓穆勒鞋（OZ3019）-兩色', categories: '', sale_type: '預購', price: 2100, stock: null, specs: specs(['杏色', '栗子色']), on_sale: 'Y', brand: 'UGG' });
DB['商品'].push({ id: 'P400', name: '經典老帽', categories: '', sale_type: '預購', price: 900, stock: null, specs: '棕色|黑色', on_sale: 'Y', brand: '' });
['P335','P048','P400'].forEach(p => DB['商品_內部'].push({ product_id: p, vendor: '酷柏', cost: 500, cost_tax_incl: 'N', source: '', locked: 'N' }));
order('O1', '2026-11-01 10:00:00', 'U1'); line('O1', 'P400', '經典老帽', '棕色', 1);
const it = (proid, specid, title, spec, qty, single) => ({ proid, specid, title, spec, qty, price: 600, single: single ? 1 : 0, lots: [[qty, 600, 'w' + proid]] });
const K = (pid) => DB['庫存進貨'].filter(k => k.product_id === pid);
const P = (pid) => DB['商品'].find(p => p.id === pid);

// 1) 第二位確認人員用綁定碼綁定
DB['設定'].push({ key: '確認人員綁定碼', value: 'ABC234|小美' });
let a = run((I) => I.arrText_('UNEW0000001', '綁定確認人員 ABC234'));
ok(/已綁定為酷柏到貨確認人員/.test(a.r.reply) && /UNEW0000001/.test(setv('酷柏通知對象')) && setv('確認人員 UNEW0000001') === '小美' && !setv('確認人員綁定碼'), 'second confirmer bound by one-time code');
ok(run((I) => I.cbTargets_()).r.join(',') === 'UADMIN,UNEW0000001', 'targets = 到貨管理員 + 確認人員');
ok(run((I) => I.arrText_('UOTHER00001', '綁定確認人員 ABC234')).r.reply.indexOf('不正確') >= 0, 'code cannot be reused');

// 兩批多出來的貨(沒有訂單在等)→ 待到貨
let r = await post({ type: 'arrival', batch: 'd1', items: [it(7004, 9201, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU40', 2)] });
r = await post({ type: 'arrival', batch: 'd2', items: [it(7005, 9202, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU39', 1)] });
const held = () => DB['庫存進貨'].filter(k => k.created_by === '酷柏到貨' && k.arrival_status === '待到貨');
ok(held().length === 2, 'two surplus rows held ' + held().length);
ok(sent.some(x => /已處理 全部/.test(x.text)), 'notice tells how to close as 已處理');
const stock0 = JSON.stringify(P('P335'));
const [k1, k2] = held().map(k => k.order_id);
// 非管理員無效
ok(run((I) => I.arrText_('UFAKE000001', '已處理 全部')).r === null && held().length === 2, 'non-admin cannot close');
// 不存在的編號 → 不動
a = run((I) => I.arrText_('UADMIN', '已處理 K99999'));
ok(/找不到/.test(a.r.reply) && held().length === 2, 'unknown id → nothing closed: ' + a.r.reply.slice(0, 40));
// 只結案一筆;另一位確認人員收到「已由…回覆」
sent.length = 0;
a = run((I) => I.arrText_('UNEW0000001', '已處理 ' + k1));
ok(/已結案 1 筆/.test(a.r.reply) && held().length === 1 && held()[0].order_id === k2 && /還有 1 筆/.test(a.r.reply), 'close one: ' + a.r.reply);
ok(a.pushes.some(f => /已由小美回覆/.test(JSON.stringify(f))), 'the other person is told 小美 closed it');
ok(JSON.stringify(P('P335')) === stock0, 'product stock / ready stock untouched');
ok(DB['重大事件'] ? DB['重大事件'].some(e => JSON.stringify(e).indexOf(k1) >= 0) : true, 'major event keeps the deleted row');
ok(DB['操作紀錄'] ? DB['操作紀錄'].some(e => /人工處理結案/.test(JSON.stringify(e))) : true, 'log has 人工處理結案');
// 再回一次同編號 → 找不到;全部結案
ok(/找不到/.test(run((I) => I.arrText_('UADMIN', '已處理 ' + k1)).r.reply), 'closing again → 找不到');
a = run((I) => I.arrText_('UADMIN', '全部已處理'));
ok(/已結案 1 筆/.test(a.r.reply) && held().length === 0, 'close all: ' + a.r.reply);
ok(/目前沒有等確認上架/.test(run((I) => I.arrText_('UADMIN', '待上架')).r.reply), 'nothing held anymore');
// 同一張批發單重送不會再入帳
r = await post({ type: 'arrival', batch: 'd1', items: [it(7004, 9201, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU40', 2)] });
ok(held().length === 0, 'resend of a closed batch does not create a new held row ' + JSON.stringify(r.body));
// 其他寫法
r = await post({ type: 'arrival', batch: 'd3', items: [it(7006, 9203, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU38', 1)] });
ok(held().length === 1 && /已結案 1 筆/.test(run((I) => I.arrText_('UADMIN', '結案 全部')).r.reply) && held().length === 0, '「結案 全部」 also works');
// 上架 指令照舊
r = await post({ type: 'arrival', batch: 'd4', items: [it(7007, 9204, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU37', 1)] });
ok(/已確認上架 1 筆/.test(run((I) => I.arrText_('UADMIN', '上架 全部')).r.reply), '上架 全部 still works');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
