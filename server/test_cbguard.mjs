// 店面(酷柏)到貨防呆:商品規格完全對得上才自動入帳上架;規格只是相近或 COS 沒有這個規格 → 傳給到貨管理員＋確認人員,任一位回覆後才入帳上架
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

// 2) 顏色+尺寸完全對得上(沒有訂單在等)→ 直接入帳,但多出來的先記成待到貨(老闆 11/26:不自動上現貨);兩位都收到「上架 全部」的確認
sent.length = 0;
let r = await post({ type: 'arrival', batch: 'g1', items: [it(7004, 9201, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', 'EU40', 2)] });
ok(r.body.pending === 0 && r.body.stock === 2 && K('P335').length === 1 && K('P335')[0].arrival_status === '待到貨', 'exact color+size → booked, surplus held (待到貨) ' + JSON.stringify(r.body));
ok(sent.some(x => x.to === 'UNEW0000001' && /上架 全部/.test(x.text)) && sent.some(x => x.to === 'UADMIN' && /上架 全部/.test(x.text)) && !sent.some(x => /有現貨可以販售/.test(x.text)), 'both asked to confirm listing, nothing listed yet');
sent.length = 0;
a = run((I) => I.arrText_('UNEW0000001', '上架 全部'));
ok(K('P335')[0].arrival_status === '已到貨' && /已確認上架 1 筆/.test(a.r.reply) && /有現貨可以販售/.test(a.r.reply), 'confirmer 上架 全部 → listed as 現貨: ' + a.r.reply);
ok(a.pushes.some(f => /已由小美回覆/.test(JSON.stringify(f))), 'the other person is told 小美 listed it');

// 3) COS 沒有這個顏色 → 不入帳,問兩位;回「A+」新增規格後才入帳上架
sent.length = 0;
r = await post({ type: 'arrival', batch: 'g2', items: [it(7010, 9006, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#BLACK', 'EU37', 1)] });
ok(r.body.pending === 1 && K('P335').length === 1, 'missing spec → not booked, not listed');
const ask = sent.filter(x => /店面到貨上架確認/.test(x.text));
ok(ask.some(x => x.to === 'UADMIN') && ask.some(x => x.to === 'UNEW0000001'), 'both 到貨管理員 and 確認人員 asked');
ok(ask.length && /原因:COS 這個商品沒有這個規格/.test(ask[0].text) && /A\+ → 在 P335 .*新增規格「黑 \/ EU37」/.test(ask[0].text), 'message gives the reason and a new-spec option: ' + (ask[0] || {}).text);
sent.length = 0;
a = run((I) => I.arrText_('UNEW0000001', 'A+'));
ok(P('P335').specs.split('|').indexOf('黑 / EU37=0') >= 0, 'spec added with pre-order quota 0: ' + P('P335').specs.slice(-30));
ok(setv('酷柏對照 7010|9006') === 'P335|黑 / EU37' && K('P335').length === 2 && K('P335')[1].arrival_status === '待到貨', 'after confirmation: bound and booked; surplus waits for 上架');
ok(a.pushes.some(f => /已由小美回覆/.test(String(f.options && f.options.payload || JSON.stringify(f)))), 'the other person (到貨管理員) is told 小美 handled it');

// 4) 規格只是相近(從品名找到「棕色」)→ 不自動,系統猜的排第一個;回 B1 才入帳
sent.length = 0;
r = await post({ type: 'arrival', batch: 'g3', items: [it(8001, 1, '【韓國】經典老帽-棕色', '標準', 1, true)] });
ok(r.body.pending === 1 && L('O1', 'P400').arrival_status !== '已到貨', 'fuzzy spec (from title) → customer order NOT booked yet');
const ask2 = sent.filter(x => /店面到貨上架確認/.test(x.text)).map(x => x.text)[0] || '';
const code2 = (ask2.match(/([A-Z])｜【韓國】經典老帽/) || [])[1];
ok(code2 && new RegExp(code2 + '1 → P400 經典老帽\\(棕色\\)').test(ask2) && /規格對不上\(只是相近\)/.test(ask2), 'guess listed first with reason: ' + ask2);
a = run((I) => I.arrText_('UADMIN', code2 + '1'));
ok(L('O1', 'P400').arrival_status === '已到貨' && setv('酷柏對照 8001|1') === 'P400|棕色', 'after 到貨管理員 confirms: booked and remembered');

// 5) 酷柏沒寫顏色、只對到尺寸 → 不算確定,不自動,也不亂建議新規格
sent.length = 0;
r = await post({ type: 'arrival', batch: 'g4', items: [it(6300, 9300, 'UGG OZLANA哈林頓穆勒鞋（OZ3019）', 'EU38', 1)] });
ok(r.body.pending === 1 && !K('P048').length, 'size-only (no color) → waits for confirmation');
const ask3 = sent.filter(x => /店面到貨上架確認/.test(x.text)).map(x => x.text)[0] || '';
ok(!/\+ → 在 P048/.test(ask3), 'no new-spec suggestion without a color');
const code3 = (ask3.match(/([A-Z])｜UGG OZLANA哈林頓/) || [])[1];
a = run((I) => I.arrText_('UNEW0000001', code3));
ok(a.r && a.r.reply && new RegExp(code3 + '刪 → ').test(a.r.reply) && new RegExp(code3 + '0 → ').test(a.r.reply) && !a.r.ai, 'bare code (例「A」) → replies with that item\'s options, not AI: ' + (a.r && a.r.reply));
ok(!run((I) => I.arrText_('UOTHER00001', code3)).r, 'bare code from non-admin ignored');

// 6) 已綁定的下次直接入帳(不用再確認)
r = await post({ type: 'arrival', batch: 'g5', items: [Object.assign(it(7010, 9006, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#BLACK', 'EU37', 3), { lots: [[3, 600, 'w-g5']] })] });
ok(r.body.stock === 3 && K('P335').length === 3, 'confirmed item auto next time ' + JSON.stringify(r.body));
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
