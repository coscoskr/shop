// 聖誕專區「上線通知我」:登記(去重、傳確認訊息)、專區第一次有可買商品才群發、只發一次、測試品/售完/下架不算
import * as code from './code.js';
import { TABLES, createRuntime } from './adapter.js';
const INT = new Set(['stock','qty','used','usage_limit','item_count','valid_days']);
const DB = {}; Object.keys(TABLES).forEach(n => DB[n] = []); let NEXT = 1; const KV = new Map();
const tname = (tbl) => Object.keys(TABLES).find(k => TABLES[k].table === tbl);
const apply = (ops) => { for (const o of ops) { const n = tname(o.table), t = TABLES[n], rows = DB[n];
  if (o.kind === 'delete') { const i = rows.findIndex(r => String(r[o.pkcol]) === String(o.pk)); if (i >= 0) rows.splice(i, 1); }
  else if (o.kind === 'update') Object.assign(rows.find(r => String(r[o.pkcol]) === String(o.pk)), o.rec);
  else { const r = { ...o.rec }; if (t.hasId) r.id = NEXT++; rows.push(r); } } };
const load = () => { const td = {}; for (const n in TABLES) { const t = TABLES[n]; td[n] = DB[n].map(r => { const o = {}; for (const k in r) { const v = r[k]; o[k] = (v !== null && typeof v === 'number' && t.numSet.has(k) && !INT.has(k)) ? String(v) : v; } return o; }); } return td; };
const PROPS = { LINE_MSG_TOKEN: 'tok', APP_URL: 'https://coscoskr.github.io/shop/' };
const run = (fn) => { const rt = createRuntime({ H: code.H, tableData: load(), kv: KV, props: PROPS, fetchMap: {} }); Object.assign(globalThis, rt.globals); code.__reset(); let r, err; try { r = fn(code.INTERNAL); } catch (e) { err = e; } apply(rt.collectOps()); return { r, err, pushes: rt.fetchQueue || [] }; };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
run((I) => { I.setup(); });
const U1 = 'U' + '1'.repeat(32), U2 = 'U' + '2'.repeat(32);
const tok = {}; for (const [k, u] of [['A', U1], ['B', U2]]) { const t = 'L' + k + 'x'.repeat(20); tok[k] = t; run((I) => { DB['登入階段'].push({ hash: I.sha_(t), line_id: u, expires: '2099-01-01 00:00:00' }); }); }
let x = run((I) => I.memberXmasSub(tok.A)); ok(x.r && x.r.ok && !x.r.already && x.pushes.length === 1 && /聖誕專區/.test(JSON.stringify(x.pushes[0])), 'sub A + confirm push');
x = run((I) => I.memberXmasSub(tok.A)); ok(x.r.already && x.pushes.length === 0, 'dup no push');
x = run((I) => I.memberXmasSub(tok.B));
x = run((I) => I.memberXmasSub('')); ok(!!x.err, 'need login');
const subs = run((I) => I.settings_()['聖誕專區訂閱']).r; ok(subs === U1 + ',' + U2, 'subs ' + subs);
const P = (id, o) => ({ id, name: '商品' + id, categories: '聖誕專區/交換禮物專區', sale_type: '現貨', price: 500, stock: 5, on_sale: 'Y', ...o });
DB['商品'].push(P('T1', { name: '【測試】樣式' }), P('S0', { stock: 0 }), P('OFF', { on_sale: '' }), P('X', { categories: '保養' }));
x = run((I) => I.xmzLaunch_('admin')); ok(x.pushes.length === 0, 'no launch for test/soldout/off/other');
DB['商品'].push(P('G1', { name: '水水500元交換禮物' }));
x = run((I) => I.xmzLaunch_('admin')); const js = JSON.stringify(x.pushes);
ok(x.pushes.length === 1 && /multicast/.test(js) && js.includes(U1) && js.includes(U2) && js.includes('c=%E8%81%96'), 'launch multicast');
x = run((I) => I.xmzLaunch_('admin')); ok(x.pushes.length === 0, 'only once');
x = run((I) => I.memberXmasSub(tok.A)); ok(x.r.live, 'after launch live flag');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
