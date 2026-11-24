// 酷柏到貨自動入帳:簽章驗證、第一次出現的品項先配對→管理員確認→記住對照、之後同品項自動入帳、重送不重複入帳
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
// COS:同一頁多顏色(規格 顏色 / 尺寸)。P335 英文+中文、P048 只寫中文、P015 只賣一個顏色(規格只有尺寸)
DB['商品'].push({ id: 'P335', name: '雙帶羊毛拖鞋（OZ3010）', categories: '', sale_type: '預購', price: 2200, stock: null, specs: specs(['#WHITE NATURE FUR 白', '#MUSTARD SEED 杏', '#GREY 灰', '#CHESTNUT NATURE FUR 栗子棕']), on_sale: 'Y', brand: 'UGG' });
DB['商品'].push({ id: 'P048', name: 'OZLANA哈林頓穆勒鞋（OZ3019）-兩色', categories: '', sale_type: '預購', price: 2100, stock: null, specs: specs(['杏色', '栗子色']), on_sale: 'Y', brand: 'UGG' });
DB['商品'].push({ id: 'P015', name: 'AUSPECIAL毛絨拖鞋-粉色（ES5835）', categories: '', sale_type: '預購', price: 1800, stock: null, specs: sz.join('|'), on_sale: 'Y', brand: 'UGG' });
['P335','P048','P015'].forEach(p => DB['商品_內部'].push({ product_id: p, vendor: '酷柏', cost: 1500, cost_tax_incl: 'N', source: '澳洲', locked: 'N' }));
order('O1', '2026-11-01 10:00:00', 'U1'); order('O2', '2026-11-02 10:00:00', 'U2'); order('O3', '2026-11-03 10:00:00', 'U3');
line('O1', 'P335', '雙帶羊毛拖鞋（OZ3010）', '#MUSTARD SEED 杏 / EU36', 1);
line('O2', 'P335', '雙帶羊毛拖鞋（OZ3010）', '#CHESTNUT NATURE FUR 栗子棕 / EU38', 1);
line('O1', 'P048', 'OZLANA哈林頓穆勒鞋（OZ3019）-兩色', '杏色 / EU38', 1);
line('O3', 'P015', 'AUSPECIAL毛絨拖鞋-粉色（ES5835）', 'EU37', 1);
const it = (proid, specid, title, spec, qty) => ({ proid, specid, title, spec, qty, price: 1600, single: 0 });

// 1) 規格名稱可到 60 字:原本 30 字會把 EU36 切成 EU3
ok(run((I) => I.specNorm_('#CHESTNUT NATURE FUR 栗子棕 / EU36')).r === '#CHESTNUT NATURE FUR 栗子棕 / EU36', 'spec names up to 60 chars are kept whole');

// 2) 第一次到貨、沒綁定:用貨號找到商品、顏色+尺寸找到規格 → 直接入帳並記住綁定
let r = await post({ type: 'arrival', batch: 'c1', items: [
  it(7008, 9001, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#MUSTARD SEED', '11/10左右／EU36', 1),
  it(7007, 9002, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#CHESTNUT NATURE FUR', 'EU38（預售）', 1),
  it(6123, 9003, 'UGG OZLANA哈林頓穆勒鞋（OZ3019）APRICOT', 'EU38', 1),
  it(6200, 9004, 'UGG AUSPECIAL毛絨拖鞋（ES5835）#粉色PINK', '37碼', 1),
] });
ok(L('O1', 'P335').arrival_status === '已到貨' && L('O2', 'P335').arrival_status === '已到貨', 'two 酷柏 colors arrive into one COS product (right color/size)');
ok(L('O1', 'P048').arrival_status === '已到貨', 'English APRICOT matches Chinese-only 杏色');
ok(L('O3', 'P015').arrival_status === '已到貨', 'single-color COS product: size-only spec matched');
ok(setv('酷柏對照 7008|9001') === 'P335|#MUSTARD SEED 杏 / EU36' && setv('酷柏對照 7007|9002') === 'P335|#CHESTNUT NATURE FUR 栗子棕 / EU38' && setv('酷柏對照 6123|9003') === 'P048|杏色 / EU38', 'bindings remembered per 酷柏 product (many → one COS product)');
ok(r.body.pending === 0, 'nothing left pending: ' + r.body.pending);

// 3) 對不上的顏色不亂綁:黑色不能對到只賣粉色的商品;沒有的顏色(BLACK)也不能對到 P335
r = await post({ type: 'arrival', batch: 'c2', items: [
  it(6201, 9005, 'UGG AUSPECIAL毛絨拖鞋（ES5835）#黑色BLACK', '37碼', 1),
  it(7010, 9006, 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#BLACK', 'EU37', 1),
] });
ok(r.body.pending === 2 && !setv('酷柏對照 6201|9005') && !setv('酷柏對照 7010|9006'), 'unmatched colors stay pending (not bound)');

// 4) 後台一次綁兩個顏色
run((I) => { I.cbBindDo_({ acc: 't' }, 'P335', { proid: 7006, title: 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#WHITE NATURE FUR', single: false, rows: [{ specid: 9101, cspec: '#WHITE NATURE FUR 白 / EU36' }] });
  I.cbBindDo_({ acc: 't' }, 'P335', { proid: 7004, title: 'UGG OZLANA雙帶羊毛拖鞋（OZ3010）#GREY', single: false, rows: [{ specid: 9201, cspec: '#GREY 灰 / EU40' }] }); });
const binds = run((I) => I.cbBinds_('P335')).r;
ok(binds.filter(b => b.proid === '7006' || b.proid === '7004' || b.proid === '7008' || b.proid === '7007').length === 4, 'one COS product lists bindings from 4 酷柏 colors: ' + binds.map(b => b.proid).join(','));
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
