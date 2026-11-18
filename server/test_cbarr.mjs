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
DB['商品_內部'].push({ product_id: 'P072', vendor: '酷柏', cost: 900, cost_tax_incl: 'N', source: '韓國', locked: 'N' });
DB['商品_內部'].push({ product_id: 'P008', vendor: '酷柏', cost: 700, cost_tax_incl: 'N', source: '韓國', locked: 'Y' });
const INN = (pid) => DB['商品_內部'].find(r => r.product_id === pid);
const order = (id, at, lid) => DB['訂單'].push({ order_id: id, ordered_at: at, name: '客' + id, phone: '0912345678', status: '處理中', subtotal: 1000, shipping: 0, total: 1000, line_id: lid });
const line = (oid, pid, name, spec, qty) => DB['訂單明細'].push({ id: NEXT++, order_id: oid, product_id: pid, product_name: name, qty, unit_price: 1000, line_total: 1000 * qty, arrival_status: '未到貨', shippable: '', ship_requested: '', ship_id: '', sale_type: '預購', spec });
order('O1', '2026-11-01 10:00:00', 'U1'); order('O2', '2026-11-02 10:00:00', 'U2'); order('O3', '2026-11-03 10:00:00', 'U3');
line('O1', 'P072', '蝴蝶結貓耳毛帽', '灰', 1); line('O2', 'P072', '蝴蝶結貓耳毛帽', '灰', 1); line('O3', 'P072', '蝴蝶結貓耳毛帽', '灰', 1);
line('O1', 'P008', 'Hello Kitty聯名款擴香3入禮盒組', '', 2);
const L = (oid, pid) => DB['訂單明細'].find(r => r.order_id === oid && r.product_id === pid);
const setv = (k) => (DB['設定'].find(r => r.key === k) || {}).value;
const GREY = { proid: 6717, specid: 22371, title: '【韓國】MLB 蝴蝶結貓耳毛帽-灰色(3ABNB0866-07GRP)', spec: '11/30左右', qty: 2, price: 983, single: 1 };
const KITTY = { proid: 7104, specid: 23001, title: '【韓國】Hetras x Hello Kitty聯名款擴香3入禮盒組', spec: '11/10左右', qty: 2, price: 850, single: 1 };

// 1) 還沒設定金鑰 → 503;金鑰錯 → 401;過期 → 401
let r = await post({ type: 'arrival', batch: 'b0', items: [GREY] });
ok(r.status === 503 && !r.body.ok, 'no secret configured → 503');
env.props.COOLBAU_ARR_SECRET = SECRET;
r = await post({ type: 'arrival', batch: 'b0', items: [GREY] }, { secret: 'wrong-secret-0123456789' });
ok(r.status === 401 && r.body.error === 'bad signature', 'wrong signature → 401');
r = await post({ type: 'arrival', batch: 'b0', items: [GREY], ts: Math.floor(Date.now() / 1000) - 3600 });
ok(r.status === 401 && r.body.error === 'stale', 'stale timestamp → 401');
ok(L('O1', 'P072').arrival_status === '未到貨' && !setv('酷柏待對應'), 'rejected requests change nothing');

// 2) 第一次出現:不入帳,配對後傳預覽給管理員
aiReply = { items: [{ ref: 1, pid: 'P072', spec: '灰' }, { ref: 2, pid: 'P008', spec: '' }] };
r = await post({ type: 'arrival', batch: 'b1', items: [GREY, KITTY] });
ok(r.status === 200 && r.body.ok && r.body.auto === 0 && r.body.pending === 2 && r.body.added === 2, 'first time: nothing auto, 2 pending ' + JSON.stringify(r.body));
ok(L('O1', 'P072').arrival_status === '未到貨', 'first time: order lines untouched');
ok(aiCalls === 1 && /#1\|【韓國】MLB 蝴蝶結貓耳毛帽-灰色/.test(aiPrompt) && /P072\|蝴蝶結貓耳毛帽/.test(aiPrompt), 'matcher got both lists');
const pv = sent.filter(s => s.to === 'UADMIN').pop();
ok(pv && /請確認對應/.test(pv.text) && /→ 蝴蝶結貓耳毛帽\(灰\)/.test(pv.text) && /回「確認」/.test(pv.text), 'admin got mapping preview');

// 3) 同一批重送:不重複
r = await post({ type: 'arrival', batch: 'b1', items: [GREY, KITTY] });
ok(r.body.dup === true && JSON.parse(setv('酷柏待對應')).reduce((s, x) => s + x.qty, 0) === 4 && aiCalls === 1, 'resend of same batch is ignored');

// 4) 管理員回「確認」:入帳、通知客人、記住對照、清掉待對應
sent.length = 0;
let a = run((I) => I.arrText_('UADMIN', '確認'));
ok(/已入帳:客訂到貨 3 筆/.test(a.r.reply), 'confirm applies: ' + a.r.reply.split('\n')[0]);
ok(L('O1', 'P072').arrival_status === '已到貨' && L('O2', 'P072').arrival_status === '已到貨' && L('O3', 'P072').arrival_status === '未到貨' && L('O1', 'P008').arrival_status === '已到貨', 'FIFO: O1,O2 灰 + O1 擴香 arrived, O3 still waiting');
ok(setv('酷柏對照 6717|22371') === 'P072|灰' && setv('酷柏對照 6717|*') === 'P072|灰' && setv('酷柏對照 7104|*') === 'P008|', 'mapping remembered');
ok(JSON.parse(setv('酷柏待對應')).length === 0, 'pending cleared');
ok(Number(L('O1', 'P072').cost) === 983 && L('O1', 'P072').vendor === '酷柏' && L('O1', 'P072').source === '韓國' && L('O1', 'P072').cost_tax_incl === 'N', 'cost sync: arrived line gets the real purchase price, vendor/source kept');
ok(Number(INN('P072').cost) === 983 && Number(INN('P008').cost) === 700 && Number(L('O1', 'P008').cost) === 850, 'cost sync: product cost follows latest price; locked product untouched (its line still gets real price)');
ok(a.pushes.filter(f => /message\/push/.test(f.url)).length === 2, 'customers notified (2 orders)');

// 5) 之後同品項(規格編號、規格文字都換了,但是單一規格商品):全自動
sent.length = 0;
order('O4', '2026-11-04 10:00:00', 'U4'); line('O4', 'P072', '蝴蝶結貓耳毛帽', '灰', 1);
Object.assign(L('O3', 'P072'), { vendor: '酷柏', cost: 800, cost_tax_incl: 'N', source: '韓國', vendor_payment_id: 'V001' }); // 已記錄廠商付款:成本不能動
r = await post({ type: 'arrival', batch: 'b2', items: [Object.assign({}, GREY, { specid: 23234, spec: '標準', qty: 4, price: 1060, lots: [[1, 1055], [3, 1060]] })] });
ok(r.body.auto === 2 && r.body.stock === 2 && r.body.pending === 0 && aiCalls === 1, 'known item: auto applied, surplus to stock ' + JSON.stringify(r.body));
ok(L('O3', 'P072').arrival_status === '已到貨' && L('O3', 'P072').arrived_by === '酷柏到貨', 'O3 arrived automatically');
ok(DB['庫存進貨'].length === 1 && Number(DB['庫存進貨'][0].qty) === 2 && DB['庫存進貨'][0].spec === '灰' && Number(DB['庫存進貨'][0].cost) === 1060, 'surplus 2 → 庫存進貨 with cost');
ok(Number(L('O3', 'P072').cost) === 800 && Number(L('O4', 'P072').cost) === 1060 && L('O4', 'P072').arrival_status === '已到貨' && Number(INN('P072').cost) === 1060, 'cost sync: lots applied in order (paid line kept 800, next line 1060), product cost → 1060');
ok(sent.some(s => s.to === 'UADMIN' && /已自動入帳/.test(s.text) && !/回「確認」/.test(s.text)) && sent.some(s => s.to === 'U3'), 'admin got summary, customer U3 notified');
ok(run((I) => I.arrPend_().length).r === 0, 'no leftover preview');

// 6) 對不上的品項:留在待對應並告訴管理員;「酷柏清除」可清掉
aiReply = { items: [{ ref: 1, pid: null, spec: '' }] };
sent.length = 0;
r = await post({ type: 'arrival', batch: 'b3', items: [{ proid: 9999, specid: 1, title: '【韓國】沒有上架的商品', spec: '標準', qty: 1, price: 100, single: 1 }] });
ok(r.body.pending === 1 && sent.some(s => s.to === 'UADMIN' && /找不到對應的商品/.test(s.text)), 'unmatched item reported to admin');
r = await post({ type: 'poke' });
ok(r.body.poke && r.body.pending === 1 && aiCalls === 3, 'daily poke re-runs matching while something is pending');
a = run((I) => I.arrText_('UADMIN', '酷柏清除'));
ok(/已清除 1 項/.test(a.r.reply) && JSON.parse(setv('酷柏待對應')).length === 0, 'clear command');
// 7) 非管理員不能用指令;配對結果的規格不存在時不會被記住
ok(run((I) => I.arrText_('UOTHER', '酷柏清除')).r === null, 'non-admin ignored');
aiReply = { items: [{ ref: 1, pid: 'P072', spec: '紫' }] };
r = await post({ type: 'arrival', batch: 'b4', items: [{ proid: 6710, specid: 22370, title: '【韓國】MLB 蝴蝶結貓耳毛帽-紫色', spec: '標準', qty: 1, price: 983, single: 1 }] });
ok(r.body.pending === 1 && !setv('酷柏對照 6710|*') && run((I) => I.arrPend_().length).r === 0, 'invalid spec from matcher is not planned');
// 8) 原本的「LINE 轉傳到貨通知」流程不受影響
line('O3', 'P008', 'Hello Kitty聯名款擴香3入禮盒組', '', 1);
a = run((I) => I.arrPlan_([{ pid: 'P008', spec: '', qty: 1, price: null, text: '擴香' }]));
ok(/^📦 到貨預覽/.test(a.r) && /回「確認」入帳/.test(a.r) && run((I) => I.arrPend_().length).r === 1, 'manual forward: preview saved');
a = run((I) => I.arrText_('UADMIN', '確認'));
ok(/客訂到貨 1 筆/.test(a.r.reply) && L('O3', 'P008').arrival_status === '已到貨' && L('O3', 'P008').arrived_by === '到貨助理' && run((I) => I.arrPend_().length).r === 0, 'manual forward: confirm applies as before');
// 9) 啟用酷柏自動同步後:手動轉傳的到貨裡,酷柏的商品一律略過(避免重複入帳),其他廠商照常
PROPS.COOLBAU_ARR_SECRET = SECRET;
DB['商品_內部'].push({ product_id: 'P072', vendor: '酷柏', cost: 900, cost_tax_incl: 'N', source: '', locked: 'N' });
DB['商品_內部'].push({ product_id: 'P008', vendor: 'JNB', cost: 800, cost_tax_incl: 'N', source: '', locked: 'N' });
const stk0 = DB['庫存進貨'].length;
a = run((I) => I.arrPlan_([{ pid: 'P072', spec: '灰', qty: 5, price: null, text: '毛帽' }]));
ok(/^🔄 這是酷柏的到貨/.test(a.r) && run((I) => I.arrPend_().length).r === 0, 'manual forward of 酷柏 only: blocked, nothing saved');
line('O2', 'P008', 'Hello Kitty聯名款擴香3入禮盒組', '', 1);
a = run((I) => I.arrPlan_([{ pid: 'P072', spec: '灰', qty: 5, price: null, text: '毛帽' }, { pid: 'P008', spec: '', qty: 1, price: null, text: '擴香' }]));
ok(/^📦 到貨預覽/.test(a.r) && /酷柏的商品/.test(a.r) && /蝴蝶結貓耳毛帽/.test(a.r) && run((I) => I.arrPend_()[0].assign.every((x) => x.pid === 'P008')).r, 'mixed forward: 酷柏 skipped, other vendor planned');
a = run((I) => I.arrText_('UADMIN', '確認'));
ok(DB['庫存進貨'].length === stk0 && L('O2', 'P008').arrival_status === '已到貨', 'mixed forward: only other vendor applied, no 酷柏 stock added');
a = run((I) => I.arrText_('UADMIN', '酷柏 到貨通知:蝴蝶結貓耳毛帽 灰 ×5 已到貨'));
ok(a.r && /^🔄 這看起來是酷柏的到貨通知/.test(a.r.reply), 'forwarded 酷柏 text answered without AI');
a = run((I) => I.arrText_('UADMIN', 'JNB 到貨:擴香 ×1'));
ok(a.r && a.r.ai && !a.r.reply, 'other vendor text still goes to AI');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
