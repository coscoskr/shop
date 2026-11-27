// 由 Code.gs 自動產生(build.py),請不要直接修改;要改請改 Code.gs 再重新產生
/** 銷售網站 + 後台(第一階段) — 資料庫:Google 試算表 */
var TZ = 'Asia/Taipei';
/** 類別用「大項/小項」命名;只有大項的直接寫大項名稱 */
var CATS_DEFAULT = ['活動中商品', '明星商品', '精品/錢包', '精品/包包', '精品/墨鏡', '韓國潮流/上衣', '韓國潮流/帽子', '韓國潮流/鞋子', '韓國潮流/包包', 'ugg', '專櫃美妝香氛保養品', '韓國美妝香氛保養品', '玩偶/三麗鷗', '玩偶/蒙奇奇', '玩偶/其他'];
function catHit_(pcats, vs) {
  return pcats.some(function (c) { return vs.some(function (v) { return c === v || c.indexOf(v + '/') === 0; }); });
}
var MH_STORE = '(門市在賣貨便下單時填寫)';
var PAY = { '刷卡': '待刷卡', '匯款': '待匯款', '賣貨便': '待出貨', '付現金': '待自取通知' };
var H = {
  '商品': ['商品ID', '名稱', '類別', '銷售型態', '單價', '數量', '到貨日期', '說明', '階梯價', '圖片', '上架', '規格', '品牌', '關團日期', '規格圖片'],
  '商品_內部': ['商品ID', '廠商', '成本', '成本含稅', '貨源', '鎖定'],
  '類別': ['類別'],
  '品牌': ['品牌'],
  '折扣碼': ['折扣碼', '類型', '數值', '啟用', '備註', '使用次數', '建立時間', '使用上限', '開始日', '截止日', '最低消費'],
  '廠商': ['廠商'],
  '訂單': ['訂單ID', '下單時間', '姓名', '電話', '付款方式', '狀態', '商品金額', '運費', '總額', '收件資訊', '備註', 'LINE ID', '付款連結', '匯款後五碼', '會員等級', '優惠名稱', '優惠折抵', '購物金折抵', '購物金明細', '電子郵件', '折扣碼'],
  '訂單明細': ['訂單ID', '商品ID', '品名', '數量', '單價', '小計', '到貨狀態', '可出貨', '申請出貨', '出貨單ID', '型態', '廠商', '成本', '成本含稅', '貨源', '廠商付款ID', '規格', '到貨操作人', '到貨時間', '叫貨狀態', '叫貨人', '叫貨時間'],
  '庫存進貨': ['訂單ID', '商品ID', '品名', '規格', '數量', '到貨狀態', '廠商', '成本', '成本含稅', '貨源', '廠商付款ID', '到貨操作人', '到貨時間', '日期', '建立人', '出貨單ID'],
  '支出': ['支出ID', '日期', '類別', '項目', '金額', '付款方式', '備註', '建立人', '建立時間'],
  '固定支出': ['固定ID', '名稱', '金額', '備註', '啟用'],
  '人事': ['人員ID', '姓名', '薪資', '勞保', '健保', '勞退', '其他', '備註', '啟用'],
  '廠商付款': ['付款ID', '付款日期', '廠商', '金額', '匯款備註', '品項數', '應付成本', '品項', '建立人', '建立時間', '圖片'],
  '出貨單': ['出貨單ID', '訂單ID', '狀態', '物流', '物流單號', '品項', '建立時間', '出貨時間', 'LINE ID', '姓名', '電話', '付款方式', '收件資訊', '備註', '商品金額', '優惠折抵', '購物金折抵', '運費', '總額', '付款連結', '匯款後五碼', '會員等級', '折抵明細', '配送方式', '購物金明細', '匯款日期', '收款帳號', '列印時間', '出貨單圖片', '發票號碼', '發票日期', '付款類型', '綠界物流ID', '匯款明細'],
  '會員': ['LINE ID', '暱稱', '頭像', '等級', '加入時間', '最近登入', '已加好友', '備註', '姓名', '電話', 'Email', '收件地址', '封鎖時間'],
  '購物金': ['序號', 'LINE ID', '發放時間', '金額', '剩餘', '到期日', '來源', '備註', '操作人', '訂單ID', '活動ID'],
  '等級': ['等級', '折扣率', '適用類別'],
  '活動': ['活動ID', '名稱', '開始', '結束', '範圍', '範圍值', '適用等級', '類型', '數值', '最低消費', '觸發', '有效天數', '啟用'],
  '登入階段': ['雜湊', 'LINE ID', '到期'],
  '管理員': ['帳號', '顯示名稱', '鹽', '密碼雜湊', '啟用'],
  '操作紀錄': ['時間', '帳號', '動作', '對象', '內容'],
  '重大事件': ['時間', '帳號', '類型', '對象', '摘要', '刪除前資料'],
  '設定': ['項目', '值']
};

/* ---------- 入口 ---------- */
function page_(name, title, boot) {
  var t = HtmlService.createTemplateFromFile(name);
  t.boot = JSON.stringify(boot || {}).replace(/</g, '\\u003c');
  return t.evaluate().setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.page === 'admin') return page_('Admin', '後台管理', {});
  var boot = {};
  if (p.code && p.state) boot = lineCallback_(p);
  else if (p.error) boot = { err: 'LINE 登入已取消' };
  return page_('Index', '選物商店', boot);
}

/* ---------- 一次性初始化:在編輯器執行 setup() ---------- */
function setup() {
  var ss = ss_();
  Object.keys(H).forEach(function (n) {
    var s = ss.getSheetByName(n) || ss.insertSheet(n);
    if (s.getLastRow() === 0) {
      s.getRange(1, 1, 1, H[n].length).setValues([H[n]]).setFontWeight('bold');
      s.setFrozenRows(1);
    }
  });
  txt_('商品', ['商品ID', '到貨日期', '階梯價']);
  txt_('商品_內部', ['商品ID']);
  txt_('訂單', ['訂單ID', '下單時間', '姓名', '電話', '收件資訊', '備註', '付款連結', '匯款後五碼']);
  txt_('訂單明細', ['訂單ID', '商品ID', '出貨單ID']);
  txt_('廠商付款', ['付款ID', '付款日期']);
  txt_('庫存進貨', ['訂單ID', '商品ID', '日期', '出貨單ID']);
  txt_('出貨單', ['出貨單ID', '訂單ID', '物流單號', '品項', '建立時間', '出貨時間', '電話', '收件資訊', '付款連結', '匯款後五碼', '匯款日期', '收款帳號', '列印時間', '出貨單圖片', '匯款明細']);
  txt_('操作紀錄', ['時間']);
  if (!rows_('類別').length) CATS_DEFAULT.forEach(function (c) { put_('類別', 0, { '類別': c }); });
  ensureSettings_();
  if (!rows_('等級').length) ['一般會員', '群友'].forEach(function (n) { put_('等級', 0, { '等級': n, '折扣率': 100, '適用類別': '' }); });
  var msg = '設定完成。';
  if (!rows_('管理員').length) {
    var pw = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    saveAdmin_('admin', '管理員', pw, true);
    msg += '\n第一個管理員帳號:admin\n密碼:' + pw + '\n(登入後請立即到「管理員」分頁修改)';
  }
  ['工作表1', 'Sheet1'].forEach(function (n) { var s = ss.getSheetByName(n); if (s && s.getLastRow() <= 1 && ss.getSheets().length > 1) ss.deleteSheet(s); });
  Logger.log(msg);
}

/** 忘記密碼時,在編輯器執行,會把 admin 重設為新密碼並顯示在執行記錄 */
function resetAdmin() {
  var pw = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  saveAdmin_('admin', '管理員', pw, true);
  Logger.log('admin 新密碼:' + pw);
}

/* ---------- 試算表工具 ---------- */
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
var SS_ = null, SHC_ = {}, RC_ = {};   // 同一次執行內重複使用試算表物件與讀取結果,避免一直重讀
var SHOP_KEYS_ = { '商品': 1, '商品_內部': 1, '類別': 1, '設定': 1 };
function raw_(n) {
  if (!SS_) SS_ = ss_();
  return SHC_[n] || (SHC_[n] = SS_.getSheetByName(n));
}
/** 取得工作表以便寫入:會清掉該表的讀取快取;動到商品/類別/設定時也清掉前台商品快取 */
function sh_(n) {
  delete RC_[n];
  if (SHOP_KEYS_[n]) { try { CacheService.getScriptCache().remove('shop1'); } catch (e) {} }
  return raw_(n);
}
function t_(v, m) { return String(v == null ? '' : v).trim().slice(0, m || 200); }
function txt_(n, cols) {
  var s = sh_(n);
  cols.forEach(function (c) { s.getRange(2, H[n].indexOf(c) + 1, Math.max(s.getMaxRows() - 1, 1), 1).setNumberFormat('@'); });
}
function rows_(n) {
  if (!RC_[n]) {
    var v = raw_(n).getDataRange().getValues(), h = v[0], out = [];
    for (var i = 1; i < v.length; i++) {
      if (v[i][0] === '') continue;
      var o = { _r: i + 1 };
      h.forEach(function (k, j) { var c = v[i][j]; o[k] = c instanceof Date ? Utilities.formatDate(c, TZ, 'yyyy-MM-dd') : c; });
      out.push(o);
    }
    RC_[n] = out;
  }
  return RC_[n].map(function (r) { var c = {}; for (var k in r) c[k] = r[k]; return c; });
}
function put_(n, r, o) {
  var s = sh_(n), vals = [H[n].map(function (k) { return o[k] === undefined ? '' : o[k]; })];
  if (r) s.getRange(r, 1, 1, H[n].length).setValues(vals);
  else s.getRange(s.getLastRow() + 1, 1, 1, H[n].length).setValues(vals);
}
function log_(acc, act, target, detail) {
  put_('操作紀錄', 0, { '時間': Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), '帳號': acc, '動作': act, '對象': target, '內容': t_(detail, 2000) });
}
/** 重大事件(刪除訂單/出貨單/庫存進貨)另外記在「重大事件」工作表,並保留刪除前的完整資料(JSON)以便追查 */
function major_(acc, type, target, summary, snap) {
  try {
    var ss = ss_(), sh = ss.getSheetByName('重大事件');
    if (!sh) { sh = ss.insertSheet('重大事件'); sh.getRange(1, 1, 1, H['重大事件'].length).setValues([H['重大事件']]).setFontWeight('bold'); sh.setFrozenRows(1); delete SHC_['重大事件']; }
    var js = ''; try { js = JSON.stringify(snap, function (k, v) { return k === '_r' || k === '_sh' ? undefined : v; }); } catch (e) {}
    put_('重大事件', 0, { '時間': now_(), '帳號': acc, '類型': type, '對象': target, '摘要': t_(summary, 500), '刪除前資料': js.slice(0, 45000) });
  } catch (e) { log_(acc, '重大事件記錄失敗', target, String(e.message || e)); }
}
function diff_(a, b) {
  if (!a) return '新增';
  return Object.keys(b).filter(function (k) { return String(a[k] == null ? '' : a[k]) !== String(b[k]); })
    .map(function (k) { return k + ':' + (a[k] == null ? '' : a[k]) + '→' + b[k]; }).join(';');
}
function settings_() { var s = {}; rows_('設定').forEach(function (r) { s[r.項目] = r.值; }); return s; }
function cats_() { return rows_('類別').map(function (r) { return String(r.類別); }); }
function cs_(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

/* ---------- 價格 ---------- */
/** 階梯價格式「3=450,5=400」:買3件以上每件450、買5件以上每件400 */
function tiers_(s, strict) {
  var out = [];
  String(s || '').split(/[,，;；\s]+/).forEach(function (x) {
    if (!x) return;
    var m = x.match(/^(\d+)=(\d+(\.\d+)?)$/);
    if (m) out.push({ min: Number(m[1]), price: Number(m[2]) });
    else if (strict) throw new Error('階梯價格式請用「3=450,5=400」(買3件以上每件450元、買5件以上每件400元)');
  });
  return out.sort(function (a, b) { return a.min - b.min; });
}
function unit_(base, tiers, n) {
  var u = base;
  tiers.forEach(function (t) { if (n >= t.min) u = t.price; });
  return u;
}
function img_(u) {
  u = String(u || '').trim();
  var m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || (/drive\.google\.com/.test(u) && u.match(/[?&]id=([\w-]+)/));
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w800';
  return /^https:\/\//.test(u) ? u : '';
}

/* ---------- 前台 API ---------- */
/** 圖片欄可存多張,用 | 分隔,第一張為封面 */
function imgList_(v, max) { // max 省略 = 不限張數(商品圖片);其他地方可指定上限
  var l = String(v || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean);
  if (max) l = l.slice(0, max);
  l.forEach(function (u) { if (!img_(u)) throw new Error('圖片網址需為 https:// 開頭,或 Google 雲端硬碟分享連結'); });
  var out = l.join('|');
  return out;
}
function bp_(x) { return String(x).split('~')[0]; }
function spec_(x) { var s = String(x), i = s.indexOf('~'); return i < 0 ? '' : s.slice(i + 1); }
/** 規格欄位格式:「黑色=5|白色=3|紅色」,=後面是該規格的數量,沒有=代表不限量(舊資料也相容) */
function specParse_(p) {
  var names = [], q = {};
  String(p.規格 || '').split('|').forEach(function (x) {
    x = x.trim(); if (!x) return;
    var i = x.lastIndexOf('='), n = x, v = null;
    if (i > 0 && /^\d+$/.test(x.slice(i + 1))) { n = x.slice(0, i); v = Number(x.slice(i + 1)); }
    if (names.indexOf(n) < 0) { names.push(n); q[n] = v; }
  });
  return { names: names, q: q };
}
function specs_(p) { return specParse_(p).names; }
/** 規格名稱整理:最多 60 字,| ~ = 是系統分隔用的字元,換成 / - - */
function specNorm_(s) { return t_(s, 60).split('|').join('/').split('~').join('-').split('=').join('-'); }
function specQty_(p) { return specParse_(p).q; }
/** 這個商品(含規格)目前還能賣幾件;null=不限量 */
function availOf_(p, sp) {
  var q = specQty_(p);
  if (sp && q[sp] !== undefined && q[sp] !== null) return q[sp];
  return p.數量 === '' ? null : Number(p.數量);
}
/* --- 預購商品的現貨 ---
   預購商品到貨時多出來的數量(庫存進貨已到貨),會變成這個商品「可以直接出貨的現貨」:前台同一個商品顯示現貨件數,
   客人下單時,該規格的現貨夠這筆的數量就整筆用現貨(已到貨、可出貨、型態=現貨、成本用那批貨的成本);不夠就整筆照預購,不拆單。
   存在設定表「現貨 <商品ID>」= {"規格": [[件數, 成本], …]}(先進先出),不需要改資料表。現貨型態的商品維持原本的數量邏輯。 */
var RDY_ = '現貨 ';
function rdyIs_(p) { return !!p && p.銷售型態 !== '現貨'; }
function rdyGet_(pid) { try { var o = JSON.parse(String(settings_()[RDY_ + pid] || '{}')); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; } }
function rdySave_(pid, o) {
  var c = {}; Object.keys(o).forEach(function (k) { var l = (o[k] || []).filter(function (x) { return Number(x[0]) > 0; }); if (l.length) c[k] = l; });
  setSet_(RDY_ + pid, JSON.stringify(c));
}
function rdyQty_(o, sp) { var n = 0; (o[sp] || []).forEach(function (x) { n += Number(x[0]); }); return n; }
/** 現貨 +qty(cost 是這批的每件成本,沒有就空字串) */
function rdyAdd_(pid, sp, qty, cost) {
  qty = Math.floor(Number(qty)); if (!(qty >= 1)) return;
  var o = rdyGet_(pid), l = o[sp] || (o[sp] = []), c = (cost === '' || cost === undefined || cost === null || !(Number(cost) >= 0)) ? '' : Number(cost);
  if (l.length && String(l[l.length - 1][1]) === String(c)) l[l.length - 1][0] = Number(l[l.length - 1][0]) + qty; else l.push([qty, c]);
  rdySave_(pid, o);
}
/** 取出 q 件(先進先出),回傳這 q 件的平均成本('' = 沒有成本資料);現貨不夠回 null,不動現貨 */
function rdyTake_(pid, sp, q) {
  q = Math.floor(Number(q)); var o = rdyGet_(pid);
  if (!(q >= 1) || rdyQty_(o, sp) < q) return null;
  var l = o[sp], got = 0, sum = 0, known = 0;
  while (got < q && l.length) { var t = Math.min(q - got, Number(l[0][0])); if (l[0][1] !== '') { sum += t * Number(l[0][1]); known += t; } got += t; l[0][0] = Number(l[0][0]) - t; if (l[0][0] <= 0) l.shift(); }
  rdySave_(pid, o);
  return known === q ? Math.round(sum / q * 100) / 100 : '';
}
/** 扣回 q 件(刪除庫存進貨、改回待到貨時):從最新的批次扣,最多扣到 0 */
function rdyCut_(pid, sp, q) {
  q = Math.floor(Number(q)); var o = rdyGet_(pid), l = o[sp] || [];
  while (q > 0 && l.length) { var x = l[l.length - 1], t = Math.min(q, Number(x[0])); x[0] = Number(x[0]) - t; q -= t; if (x[0] <= 0) l.pop(); }
  rdySave_(pid, o);
}
var RDYN_ = []; // 這次新增的現貨(通知用);每個酷柏請求開頭都要清空,避免同一個執行個體裡別的請求(後台手動進貨)留下的項目被誤報
function cbRdyReset_() { RDYN_ = []; }
/** 把這次新增的現貨通知到貨管理員與通知對象(有現貨可以販售),並清空 */
function cbRdyTell_(res) {
  if (!RDYN_.length) return;
  if (res) res.relist = RDYN_.filter(function (x) { return x.re; }).map(function (x) { return x.name; });
  cbTell_('🛒 有現貨可以販售了:\n' + RDYN_.map(function (x) { return '・' + x.name + (x.spec ? '(' + x.spec + ')' : '') + ' 現貨 ' + x.qty + ' 件' + (x.re ? '(原本下架/已關團,已自動上架,只賣現貨)' : ''); }).join('\n') + '\n前台會顯示「有現貨」,客人下單先用現貨。');
  RDYN_ = [];
}
/** 有現貨了:商品下架中或已關團 → 自動上架,但預購名額設成 0(只賣現貨,不會重新開放預購);回傳是否有改 */
function rdyRelist_(p) {
  if (p.上架 === 'Y' && !closed_(p)) return false;
  var n = cp_(p), was = (p.上架 !== 'Y' ? '下架' : '') + (closed_(p) ? '已關團 ' + p.關團日期 : '');
  n.上架 = 'Y'; n.關團日期 = ''; n.數量 = 0;
  put_('商品', p._r, n); p.上架 = 'Y'; p.關團日期 = ''; p.數量 = 0;
  log_('酷柏到貨', '現貨自動上架', String(p.商品ID) + ' ' + p.名稱, '原本' + was + ';有現貨了,自動上架(預購名額 0,只賣現貨)');
  return true;
}
/** 每個預購商品目前的現貨 {商品ID: {規格: 件數}}(沒有規格的商品,規格是空字串) */
function rdyAll_() {
  var st = settings_(), out = {};
  Object.keys(st).forEach(function (k) {
    if (k.indexOf(RDY_) !== 0) return;
    var o; try { o = JSON.parse(String(st[k] || '{}')); } catch (e) { o = {}; }
    var m = {}, any = false; Object.keys(o || {}).forEach(function (sp) { var n = rdyQty_(o, sp); if (n > 0) { m[sp] = n; any = true; } });
    if (any) out[k.slice(RDY_.length)] = m;
  });
  return out;
}
/** 訂單品項退回庫存(刪訂單、改數量/規格):用現貨出的預購商品品項退回現貨,其餘照原本的數量邏輯 */
var RDY_WHO_ = '預購現貨'; // 用現貨出的預購商品品項,叫貨人記這個,才能跟「下單時商品還是現貨型態」的舊品項分開
function rdyLine_(p, l) { return rdyIs_(p) && String(l.型態) === '現貨' && String(l.叫貨人 || '') === RDY_WHO_; }
function lineBack_(p, l, sp, q) {
  if (rdyLine_(p, l)) rdyAdd_(String(p.商品ID), sp, q, l.成本); else adjStock_(p, sp, q);
}
/** 拆單:把一筆訂單品項拆成兩列(同一張訂單、同商品同規格)。原列改成 keep 件,剩下的另開一列。
    新列的商品ID 是「商品ID~規格~序號」(bp_ 取商品ID、前後台取規格的方式都相容),其他欄位照抄。回傳新列的商品ID;不需要拆回 null */
function lineSplit_(l, keep) {
  var q = Number(l.數量), rest = q - keep; if (!(keep >= 1) || !(rest >= 1)) return null;
  var base = bp_(l.商品ID), sp = String(l.規格 || ''), n = 2, used = {};
  rows_('訂單明細').forEach(function (x) { if (String(x.訂單ID) === String(l.訂單ID)) used[String(x.商品ID)] = 1; });
  while (used[base + '~' + sp + '~' + n]) n++;
  var a = cp_(l); a.數量 = keep; a.小計 = keep * Number(l.單價);
  var b = {}; H['訂單明細'].forEach(function (k) { b[k] = l[k] === undefined ? '' : l[k]; });
  b.商品ID = base + '~' + sp + '~' + n; b.數量 = rest; b.小計 = rest * Number(l.單價);
  put_('訂單明細', l._r, a); put_('訂單明細', 0, b);
  return b.商品ID;
}
/** 增減庫存(delta 負=扣庫存):有設定數量的規格扣該規格,商品總數量也同步 */
function adjStock_(p, sp, delta) {
  var ps = specParse_(p);
  if (sp && ps.q[sp] !== undefined && ps.q[sp] !== null) {
    ps.q[sp] = Math.max(0, ps.q[sp] + delta);
    p.規格 = ps.names.map(function (n) { return ps.q[n] === null ? n : n + '=' + ps.q[n]; }).join('|');
    sh_('商品').getRange(p._r, H['商品'].indexOf('規格') + 1).setValue(p.規格);
  }
  if (p.數量 !== '') { p.數量 = Math.max(0, Number(p.數量) + delta); sh_('商品').getRange(p._r, H['商品'].indexOf('數量') + 1).setValue(p.數量); }
}
var RDYC_ = null; // 這次組前台資料用的現貨表
function imgs_(v) { return String(v || '').split('|').map(img_).filter(Boolean); }
/** 到貨日期可以是:日期(yyyy-MM-dd)、排隊中、下單後N週(N=1~52) */
function etaOk_(v) { v = String(v || ''); return v === '排隊中' || /^\d{4}-\d{2}-\d{2}$/.test(v) || (/^下單後([1-9]\d?)週$/.test(v) && +/\d+/.exec(v)[0] <= 52); }
/** 關團:關團日期當天台灣時間下午 14:00 起視同下架(資料庫每分鐘也會自動把上架改成 N) */
function closeAt_(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(String(v || '').trim()); if (!m) return 0;
  var h = m[4] === undefined ? 14 : +m[4], mi = m[5] === undefined ? 0 : +m[5]; if (h > 23 || mi > 59) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], h - 8, mi, 0); // 沒寫時間 = 台灣下午 14:00;可寫「yyyy-MM-dd HH:mm」指定時間
}
/** 關團時間的文字:「11/30 14:00」 */
function closeTx_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(String(v || '').trim()); return m ? (+m[2]) + '/' + (+m[3]) + ' ' + (m[4] === undefined ? '14:00' : ('0' + m[4]).slice(-2) + ':' + m[5]) : String(v || ''); }
function closed_(p) { var t = closeAt_(p && p.關團日期); return !!t && Date.now() >= t; }
function onSale0_(p) { return !!p && p.上架 === 'Y' && !closed_(p); }
// 前台看得到、可以下單:上架中、沒關團;聖誕專區的商品要等後台按「開放聖誕專區＋通知客人」後才出現
function onSale_(p) { return onSale0_(p) && !xmzHide_(p); }
function xmzHide_(p) { return cs_(p.類別).some(function (c) { return c === '聖誕專區' || c.indexOf('聖誕專區/') === 0; }) && !String(settings_()['聖誕專區上線通知'] || ''); }
function pub_(p) {
  var rd = rdyIs_(p) ? (RDYC_ || (RDYC_ = rdyAll_()))[String(p.商品ID)] : null;
  return {
    id: p.商品ID, name: p.名稱, cats: cs_(p.類別), type: p.銷售型態, price: Number(p.單價),
    stock: p.數量 === '' ? null : (rd && Number(p.數量) === 0 ? Object.keys(rd).reduce(function (a, k) { return a + rd[k]; }, 0) : Number(p.數量)), arrival: p.到貨日期, desc: p.說明, // 只賣現貨(預購名額 0):剩餘數量＝現貨件數
    tiers: tiers_(p.階梯價), img: imgs_(p.圖片)[0] || '', imgs: imgs_(p.圖片), specs: specs_(p), specQty: specQty_(p), specImg: specImg_(p), brand: String(p.品牌 || ''), ready: rd || null, rdyOnly: !!rd && p.數量 !== '' && Number(p.數量) === 0, close: String(p.關團日期 || '')
  };
}
function getShop() {
  var c = CacheService.getScriptCache();
  try { var hit = c.get('shop1'); if (hit) { var h = JSON.parse(hit); h.products = (h.products || []).filter(function (p) { return !closed_({ 關團日期: p.close }); }); return h; } } catch (e) {}
  var r = shopData_();
  try { var js = JSON.stringify(r); if (js.length < 90000) c.put('shop1', js, 120); } catch (e) {}
  return r;
}
function shopData_() {
  var st = settings_(); RDYC_ = null;
  return { payLive: prop_('ECPAY_PAY_LIVE') === '1', logiLive: prop_('ECPAY_LOGI_LIVE') === '1', instLive: prop_('ECPAY_INST_LIVE') === '1', bnplLive: prop_('ECPAY_BNPL_LIVE') === '1',
    store: st.店名 || '', notice: st.公告 || '', deco: String(st.節慶裝飾 || ''), creditNote: st.購物金注意事項 === undefined ? defSet_('購物金注意事項') : String(st.購物金注意事項 || ''), free: Number(st.免運門檻) || 0, fee: Number(st.宅配運費) || 0, feeCvs: Number(st.店到店運費) || 0,
    line: { on: lineOn_(), liff: prop_('LIFF_ID'), friend: String(st.加好友連結 || ''), community: String(st.LINE社群連結 || '') },
    biz: { name: String(st.公司名稱 || ''), addr: String(st.公司地址 || ''), tax: /^\d+$/.test(String(st.統一編號 || '')) ? ('00000000' + st.統一編號).slice(-8) : String(st.統一編號 || ''), ig: String(st.IG連結 || '') },
    cats: cats_(), products: rows_('商品').filter(onSale_).map(pub_)
  };
}
function placeOrder(o) {
  o = o || {};
  var nk = o.nonce ? 'pn_' + String(o.nonce).slice(0, 40) : '', nc = CacheService.getScriptCache();
  if (nk) { var prev = nc.get(nk); if (prev) return JSON.parse(prev); } // 同一次結帳重複送出:直接回傳第一次的結果,不會重複下單
  var res0 = placeOrder0_(o);
  if (nk) nc.put(nk, JSON.stringify(res0), 1800);
  return res0;
}
function placeOrder0_(o) {
  var ctx = null;
  if (o.token) { try { ctx = mem_(o.token); } catch (e) { ctx = null; } }
  if (ctx && !ctx.lid) ctx = null;
  var name = t_(o.name, 40), phone = t_(o.phone, 20), ship = '', pay = '', email = t_(o.email, 80);
  if (ctx) { // LINE 會員也要填姓名+聯絡電話才能下單;會員資料還沒有的話順便存起來,下次自動帶入
    if (!name) throw new Error('請填寫姓名');
    if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
    lk_(function () { var mr = memberRow_(ctx.lid); if (!mr) return; var mn = cp_(mr), ch = false;
      if (!String(mr.姓名 || '')) { try { mn.姓名 = realName_(name); ch = true; } catch (e) {} }
      if (!String(mr.電話 || '')) { mn.電話 = phone; ch = true; }
      if (ch) put_('會員', mr._r, mn); });
  }
  else {
    if (!name) throw new Error('請填寫姓名');
    if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('請填寫正確的電子郵件(到貨與出貨通知會寄到這裡)');
  }
  if (ctx && email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) email = '';
  var want = {};
  (o.items || []).slice(0, 60).forEach(function (i) {
    var n = Math.floor(Number(i.qty));
    if (n >= 1 && n <= 99) want[i.id] = (want[i.id] || 0) + n;
  });
  if (!Object.keys(want).length) throw new Error('購物車是空的');
  return placeCore_(want, ctx, o, name, phone, email, '客人 ' + name, '');
}
/** 建立訂單的共用流程(客人自己下單、後台代客下單都走這裡)。who=寫進操作紀錄的人;notePre=備註前綴 */
function placeCore_(want, ctx, o, name, phone, email, who, notePre) {
  var ship = '', pay = '';
  var res;
  lk_(function () {
    var c = calc_(want, ctx, o.useCredit ? 1e9 : 0, o.code);
    if (String(o.code || '').trim() && !c.codeOk) throw new Error(c.codeMin ? '此折扣碼需商品金額滿 NT$ ' + c.codeMin + ' 才能使用' : '折扣碼不正確或已失效');
    if (c.codeOk && c.discount > 0 && /^折扣碼 /.test(c.dname)) codeUsed_(c.codeName);
    var st = settings_();
    var d = Utilities.formatDate(new Date(), TZ, 'yyMMdd');
    var cnt = 0;
    rows_('訂單').forEach(function (r) { var id = String(r.訂單ID); if (id.indexOf('O' + d) === 0) cnt = Math.max(cnt, Number(id.slice(7)) || 0); });
    var oid = 'O' + d + ('000' + (cnt + 1)).slice(-3);
    var innM = {}; rows_('商品_內部').forEach(function (r) { innM[String(r.商品ID)] = r; });
    c.lines.forEach(function (l) {
      var p = l[0], inStock = p.銷售型態 === '現貨', lpid = l[3] ? String(p.商品ID) + '~' + l[3] : String(p.商品ID);
      // 預購商品:這個規格有現貨就先用現貨(已到貨、可出貨、不佔預購名額);現貨不夠這筆的數量就拆成兩列——現貨一列、剩下的預購一列
      var inn0 = innM[String(p.商品ID)] || {}, sp0 = l[3] || '';
      var rq = inStock ? 0 : Math.min(l[1], rdyQty_(rdyGet_(String(p.商品ID)), sp0)), pre = l[1] - rq;
      var mk = function (id, qty, rc) {
        var st = inStock || rc !== null;
        put_('訂單明細', 0, { '訂單ID': oid, '商品ID': id, '規格': sp0, '品名': p.名稱, '數量': qty, '單價': l[2], '小計': qty * l[2], '到貨狀態': st ? '已到貨' : '待到貨', '可出貨': st ? 'Y' : 'N', '型態': rc !== null ? '現貨' : p.銷售型態,
          '廠商': inn0.廠商 || '', '成本': (rc !== null && rc !== '') ? rc : (inn0.成本 === undefined ? '' : inn0.成本), '成本含稅': inn0.成本含稅 || 'N', '貨源': inn0.貨源 || '', '叫貨狀態': st ? '已叫貨' : '', '叫貨人': rc !== null ? RDY_WHO_ : st ? '系統' : '', '叫貨時間': st ? now_() : '' });
      };
      if (rq > 0) mk(lpid, rq, rdyTake_(String(p.商品ID), sp0, rq));
      if (pre > 0) { adjStock_(p, sp0, -pre); mk(rq > 0 ? String(p.商品ID) + '~' + sp0 + '~2' : lpid, pre, null); }
    });
    var detail = c.credit > 0 ? spend_(ctx.lid, c.credit) : {};
    put_('訂單', 0, { '訂單ID': oid, '下單時間': now_(), '姓名': name, '電話': phone, '付款方式': '', '狀態': '已下訂', '商品金額': c.sub, '運費': c.fee, '總額': c.total, '收件資訊': ship, '備註': t_((notePre || '') + (o.note || ''), 200),
      'LINE ID': ctx ? ctx.lid : '', '電子郵件': email, '折扣碼': c.codeOk ? String(o.code).trim() : '', '會員等級': (ctx || c.codeOk) ? c.level : '', '優惠名稱': c.dname, '優惠折抵': c.discount, '購物金折抵': c.credit, '購物金明細': JSON.stringify(detail) });
    log_(who, '下單', oid, '合計 ' + c.total + ',' + pay + (c.discount ? ',優惠 ' + c.dname + ' -' + c.discount : '') + (c.credit ? ',購物金 -' + c.credit : ''));
    // 下單成功:用官方 LINE 傳訊息給客人(只有 LINE 登入的會員;沒加好友會自動失敗,不影響下單)
    if (ctx && ctx.lid) {
      var tpl = String(st.下單成功通知內容 === undefined ? defSet_('下單成功通知內容') : st.下單成功通知內容 || '');
      if (tpl) {
        var vals = { '姓名': String(name), '訂單編號': oid, '品項': c.lines.map(function (l) { return l[0].名稱 + (l[3] ? '(' + l[3] + ')' : '') + '×' + l[1]; }).join('、'), '金額': String(c.total), '連結': appUrl_() };
        var otx = Object.keys(vals).reduce(function (t, k) { return t.split('{' + k + '}').join(vals[k]); }, tpl);
        pushLine_(ctx.lid, otx, null, orderFlex_(oid, name, c, otx));
      }
    }
    res = { orderId: oid, total: c.total, fee: c.fee, pay: pay, bank: '', discount: c.discount, dname: c.dname, credit: c.credit, mt: ctx ? '' : mk_(nz_(phone)) };
  });
  return res;
}


/* ---------- 代客下單(客人私訊官方 LINE 時,由後台登記) ---------- */
function proxyCtx_(o) {
  var lid = t_(o.lid, 60), ctx = null, name = t_(o.name, 40), phone = t_(o.phone, 20);
  if (lid) {
    var m = memberRow_(lid); if (!m) throw new Error('找不到這位 LINE 會員');
    ctx = { lid: lid }; name = name || String(m.暱稱 || 'LINE會員');
    if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
  } else {
    if (!name) throw new Error('請填寫客人姓名');
    if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
  }
  return { ctx: ctx, name: name, phone: phone };
}
function proxyWant_(o) {
  var want = {}, ovr = {};
  (o.items || []).slice(0, 60).forEach(function (i) {
    var n = Math.floor(Number(i.qty)); if (!(n >= 1 && n <= 99)) return;
    var id = String(i.id || ''); if (!id) return;
    want[id] = (want[id] || 0) + n;
    if (i.unit !== undefined && i.unit !== '' && i.unit !== null) {
      var u = Number(i.unit); if (!(u >= 0) || u > 1000000) throw new Error('單價不正確');
      ovr[id] = Math.round(u);
    }
  });
  if (!Object.keys(want).length) throw new Error('請先加入商品');
  return { want: want, ovr: Object.keys(ovr).length ? ovr : null };
}
/** 試算金額(不建立訂單):回傳每項單價、折扣、合計 */
function adminProxyQuote(tk, o) {
  me_(tk); o = o || {};
  try {
    var c0 = proxyCtx_(o), w = proxyWant_(o);
    OVR_ = w.ovr;
    try {
      var c = calc_(w.want, c0.ctx, o.useCredit ? 1e9 : 0, o.code);
      return { ok: true, sub: c.sub, discount: c.discount, dname: c.dname, credit: c.credit, total: c.total, codeOk: c.codeOk, codeMin: c.codeMin, level: c.level, balance: c.balance,
        lines: c.lines.map(function (l) { return { id: spec_(l[3]) ? String(l[0].商品ID) + '~' + l[3] : String(l[0].商品ID), name: String(l[0].名稱), spec: l[3] || '', qty: l[1], unit: l[2] }; }) };
    } finally { OVR_ = null; }
  } catch (e) { return { ok: false, msg: e.message }; }
}
function adminPlaceOrder(tk, o) {
  var u = me_(tk); o = o || {};
  var c0 = proxyCtx_(o), w = proxyWant_(o);
  if (String(o.code || '').trim() === '') o.code = '';
  var note = t_(o.note, 160);
  OVR_ = w.ovr;
  try {
    var res = placeCore_(w.want, c0.ctx, { note: note, code: o.code, useCredit: !!o.useCredit }, c0.name, c0.phone, '', u.name + ' 代客下單', '【LINE私訊】');
    return res;
  } finally { OVR_ = null; }
}
/** LINE 官方帳號收到私訊 / 加好友時,把這位使用者記進會員清單(沒有的才新增),之後可在代客下單選他 */
function contactSeen_(lid, name, pic, follow) {
  lid = String(lid || ''); if (!lid) return;
  var m = memberRow_(lid);
  if (m) {
    var n = cp_(m), ch = false;
    if (!String(n.暱稱) && name) { n.暱稱 = name; ch = true; }
    if (!String(n.頭像) && pic) { n.頭像 = pic; ch = true; }
    // LINE 的 unfollow 事件 = 客人封鎖官方帳號;記下封鎖時間,重新加好友(解除封鎖)時清掉
    if (follow !== false && n.已加好友 !== 'Y') { n.已加好友 = 'Y'; ch = true; if (String(n.封鎖時間 || '')) { n.封鎖時間 = ''; log_('LINE', '解除封鎖官方帳號', String(n.暱稱 || lid), ''); } }
    if (follow === false && (n.已加好友 !== 'N' || !String(n.封鎖時間 || ''))) { n.已加好友 = 'N'; n.封鎖時間 = now_(); ch = true; log_('LINE', '封鎖官方帳號', String(n.暱稱 || lid), ''); }
    if (ch) put_('會員', m._r, n);
    return;
  }
  put_('會員', 0, { 'LINE ID': lid, '暱稱': name || 'LINE使用者', '頭像': pic || '', '等級': '一般會員', '加入時間': now_(), '最近登入': '', '已加好友': follow === false ? 'N' : 'Y', '備註': '由 LINE 私訊自動建立', '封鎖時間': follow === false ? now_() : '' });
}

/* ---------- 管理員帳號 ---------- */
function hex_(b) { return b.map(function (x) { return ((x < 0 ? x + 256 : x) + 256).toString(16).slice(1); }).join(''); }
function hash_(pw, salt) {
  var s = pw;
  for (var i = 0; i < 200; i++) s = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + s));
  return s;
}
function admins_() {
  return rows_('管理員').map(function (a) { return { acc: String(a.帳號), name: a.顯示名稱, on: a.啟用 === 'Y' }; });
}
function saveAdmin_(acc, name, pw, on) {
  var ex = rows_('管理員').filter(function (a) { return String(a.帳號) === acc; })[0];
  var o = ex ? { '帳號': acc, '顯示名稱': name || ex.顯示名稱, '鹽': ex.鹽, '密碼雜湊': ex.密碼雜湊, '啟用': on ? 'Y' : 'N' }
             : { '帳號': acc, '顯示名稱': name || acc, '鹽': '', '密碼雜湊': '', '啟用': on ? 'Y' : 'N' };
  if (pw) { o.鹽 = Utilities.getUuid(); o.密碼雜湊 = hash_(pw, o.鹽); }
  put_('管理員', ex ? ex._r : 0, o);
}
function adminLogin(acc, pw, remember) {
  acc = String(acc || '').trim();
  var c = CacheService.getScriptCache(), k = 'f_' + acc, n = Number(c.get(k) || 0);
  if (n >= 5) return { ok: false, msg: '嘗試次數過多,請10分鐘後再試' };
  var a = rows_('管理員').filter(function (x) { return String(x.帳號) === acc && x.啟用 === 'Y'; })[0];
  if (!pw || !String(pw).length || !a || !a.鹽 || !a.密碼雜湊 || hash_(String(pw), String(a.鹽)) !== String(a.密碼雜湊)) {
    c.put(k, String(n + 1), 600);
    return { ok: false, msg: '帳號或密碼錯誤' };
  }
  var tk = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  c.put('t_' + tk, JSON.stringify({ acc: acc, name: a.顯示名稱 }), remember ? 2592000 : 21600);
  c.remove(k);
  log_(acc, '登入', '', '');
  return { ok: true, token: tk, name: a.顯示名稱 };
}
function me_(tk) {
  var v = CacheService.getScriptCache().get('t_' + tk);
  if (!v) throw new Error('登入已過期,請重新登入');
  return JSON.parse(v);
}

/* ---------- 後台 API ---------- */
function adminProducts_() {
  var inn = {};
  rows_('商品_內部').forEach(function (r) { inn[r.商品ID] = r; });
  return rows_('商品').map(function (p) {
    var i = inn[p.商品ID] || {};
    return {
      id: p.商品ID, name: p.名稱, cats: cs_(p.類別), type: p.銷售型態, price: Number(p.單價),
      stock: p.數量 === '' ? '' : Number(p.數量), arrival: p.到貨日期, desc: p.說明, tiers: String(p.階梯價 || ''),
      img: String(p.圖片 || ''), on: p.上架 === 'Y', close: String(p.關團日期 || ''), closed: closed_(p), xmzWait: p.上架 === 'Y' && xmzHide_(p), brand: String(p.品牌 || ''), vendor: String(i.廠商 || ''),
      cost: (i.成本 === undefined || i.成本 === '') ? '' : Number(i.成本), taxIncl: i.成本含稅 === 'Y',
      source: String(i.貨源 || ''), locked: i.鎖定 === 'Y', specs: specs_(p), specQty: specQty_(p), specImg: specImg_(p)
    };
  });
}
/** 廠商清單(設定頁管理,商品與訂單明細用選的);第一次使用時由現有資料帶入 */
function vendors_() {
  var rs = rows_('廠商');
  if (!rs.length) {
    var seen = {};
    rows_('商品_內部').forEach(function (r) { if (String(r.廠商).trim()) seen[String(r.廠商).trim()] = 1; });
    rows_('訂單明細').forEach(function (r) { if (String(r.廠商 || '').trim()) seen[String(r.廠商).trim()] = 1; });
    var ks = Object.keys(seen).sort();
    if (ks.length) lk_(function () { ks.forEach(function (k) { put_('廠商', 0, { '廠商': k }); }); });
    return ks;
  }
  return rs.map(function (r) { return String(r.廠商); });
}
function adminVendors(tk) { me_(tk); return vendors_(); }
/* ---------- 品牌(設定頁管理;商品只能從清單選,大小寫不同視為同一個) ---------- */
function brandSheet_() {
  var ss = ss_(), sh = ss.getSheetByName('品牌');
  if (!sh) { sh = ss.insertSheet('品牌'); sh.getRange(1, 1, 1, 1).setValues([['品牌']]).setFontWeight('bold'); sh.setFrozenRows(1); delete SHC_['品牌']; delete RC_['品牌']; }
  return sh;
}
function brands_() { brandSheet_(); return rows_('品牌').map(function (r) { return String(r.品牌); }).sort(function (a, b) { var x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }); }
function brandKey_(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }
/** 回傳清單中對應的標準寫法(忽略大小寫與空白);空白回傳空字串;不在清單就丟錯 */
function brandPick_(v) {
  v = String(v || '').trim(); if (!v) return '';
  var k = brandKey_(v), hit = brands_().filter(function (b) { return brandKey_(b) === k; })[0];
  if (!hit) throw new Error('品牌「' + v + '」不在清單裡,請在「新品牌」空白格輸入來新增');
  return hit;
}
/** 商品存檔時決定品牌:有填「新品牌」就加入清單(大小寫不同視為同一個,直接用既有寫法);否則必須是清單內的品牌 */
function brandResolve_(u, d) {
  var nb = String(d.newBrand || '').trim();
  if (!nb) return brandPick_(d.brand);
  nb = brandName_(nb);
  var k = brandKey_(nb), hit = brands_().filter(function (b) { return brandKey_(b) === k; })[0];
  if (hit) return hit;
  sh_('品牌'); put_('品牌', 0, { '品牌': nb }); log_(u.acc, '新增品牌', nb, '(商品上架時新增)');
  return nb;
}
function brandList_() {
  var cnt = {}; rows_('商品').forEach(function (p) { var b = String(p.品牌 || ''); if (b) cnt[b] = (cnt[b] || 0) + 1; });
  return brands_().map(function (b) { return { name: b, n: cnt[b] || 0 }; });
}
function brandName_(v) {
  v = String(v || '').replace(/[,，|]/g, '').replace(/\s+/g, ' ').trim();
  if (!v) throw new Error('請輸入品牌名稱');
  if (v.length > 40) throw new Error('品牌名稱太長(最多 40 字)');
  return v;
}
function adminBrands(tk) { me_(tk); return brandList_(); }
function adminAddBrand(tk, name) {
  var u = me_(tk); name = brandName_(name);
  lk_(function () {
    var k = brandKey_(name), dup = brands_().filter(function (b) { return brandKey_(b) === k; })[0];
    if (dup) throw new Error('品牌「' + dup + '」已經存在(大小寫不同視為同一個)');
    sh_('品牌'); put_('品牌', 0, { '品牌': name }); log_(u.acc, '新增品牌', name, '');
  });
  return brandList_();
}
function adminRenameBrand(tk, oldName, newName) {
  var u = me_(tk); oldName = String(oldName || ''); newName = brandName_(newName);
  lk_(function () {
    brandSheet_();
    var r = rows_('品牌').filter(function (x) { return String(x.品牌) === oldName; })[0];
    if (!r) throw new Error('找不到品牌「' + oldName + '」');
    var k = brandKey_(newName), dup = brands_().filter(function (b) { return b !== oldName && brandKey_(b) === k; })[0];
    if (dup) throw new Error('品牌「' + dup + '」已經存在');
    if (newName === oldName) return;
    var n = cp_(r); n.品牌 = newName; put_('品牌', r._r, n);
    rows_('商品').forEach(function (p) { if (String(p.品牌) === oldName) { var pn = cp_(p); pn.品牌 = newName; put_('商品', p._r, pn); } });
    log_(u.acc, '修改品牌', oldName, oldName + '→' + newName);
  });
  return brandList_();
}
function adminDeleteBrand(tk, name) {
  var u = me_(tk); name = String(name || '');
  lk_(function () {
    brandSheet_();
    var r = rows_('品牌').filter(function (x) { return String(x.品牌) === name; })[0];
    if (!r) throw new Error('找不到品牌「' + name + '」');
    var hit = 0;
    rows_('商品').forEach(function (p) { if (String(p.品牌) === name) { var pn = cp_(p); pn.品牌 = ''; put_('商品', p._r, pn); hit++; } });
    sh_('品牌').deleteRow(r._r);
    log_(u.acc, '刪除品牌', name, '影響 ' + hit + ' 項商品');
  });
  return brandList_();
}
/* ---------- 商品分類(設定頁管理) ---------- */
function catList_() {
  var cnt = {}; rows_('商品').forEach(function (p) { cs_(p.類別).forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; }); });
  return cats_().map(function (c) { return { name: c, n: cnt[c] || 0 }; });
}
function catName_(v) {
  v = String(v || '').replace(/[,，]/g, '').replace(/\s*\/\s*/g, '/').trim();
  if (!v) throw new Error('請輸入分類名稱');
  if (v.length > 40) throw new Error('分類名稱太長(最多 40 字)');
  if (/^\/|\/$|\/\//.test(v)) throw new Error('分類名稱格式不正確;大項/小項請寫成「大項/小項」');
  return v;
}
function adminCats(tk) { me_(tk); return catList_(); }
function adminAddCat(tk, name) {
  var u = me_(tk); name = catName_(name);
  lk_(function () {
    if (cats_().indexOf(name) >= 0) throw new Error('分類「' + name + '」已經存在');
    sh_('類別'); put_('類別', 0, { '類別': name }); log_(u.acc, '新增分類', name, '');
  });
  return catList_();
}
/** 依對照表 {舊名:新名} 改分類名稱,並同步商品、會員等級適用類別、活動範圍值 */
function renameCats_(map) {
  var olds = Object.keys(map);
  var fix = function (str) { return cs_(str).map(function (c) { return map[c] !== undefined ? map[c] : c; }).join(','); };
  var hit = function (str) { return cs_(str).some(function (c) { return map[c] !== undefined; }); };
  rows_('類別').forEach(function (r) { var o = String(r.類別); if (map[o] !== undefined) { var n = cp_(r); n.類別 = map[o]; put_('類別', r._r, n); } });
  rows_('商品').forEach(function (p) { if (hit(p.類別)) { var pn = cp_(p); pn.類別 = fix(p.類別); put_('商品', p._r, pn); } });
  rows_('等級').forEach(function (l) { if (hit(l.適用類別)) { var ln = cp_(l); ln.適用類別 = fix(l.適用類別); put_('等級', l._r, ln); } });
  rows_('活動').forEach(function (a) { if (String(a.範圍) === '類別' && hit(a.範圍值)) { var an = cp_(a); an.範圍值 = fix(a.範圍值); put_('活動', a._r, an); } });
}
function adminRenameCat(tk, oldName, newName) {
  var u = me_(tk); oldName = String(oldName || ''); newName = catName_(newName);
  lk_(function () {
    if (cats_().indexOf(oldName) < 0) throw new Error('找不到分類「' + oldName + '」');
    if (newName === oldName) return;
    if (cats_().indexOf(newName) >= 0) throw new Error('分類「' + newName + '」已經存在');
    var m = {}; m[oldName] = newName; renameCats_(m);
    log_(u.acc, '修改分類', oldName, oldName + '→' + newName);
  });
  return catList_();
}
/** 改大分類名稱:底下所有小分類(大項/小項)一起改 */
function adminRenameBig(tk, oldBig, newBig) {
  var u = me_(tk); oldBig = String(oldBig || ''); newBig = catName_(newBig);
  if (newBig.indexOf('/') >= 0) throw new Error('大分類名稱不能包含「/」');
  lk_(function () {
    var all = cats_(), m = {}, n = 0;
    all.forEach(function (c) { if (c === oldBig || c.indexOf(oldBig + '/') === 0) { m[c] = newBig + c.slice(oldBig.length); n++; } });
    if (!n) throw new Error('找不到大分類「' + oldBig + '」');
    if (newBig === oldBig) return;
    Object.keys(m).forEach(function (o) { if (all.indexOf(m[o]) >= 0 && !m[m[o]]) throw new Error('分類「' + m[o] + '」已經存在'); });
    renameCats_(m);
    log_(u.acc, '修改大分類', oldBig, oldBig + '→' + newBig + '(' + n + ' 個分類)');
  });
  return catList_();
}
/** 刪除大分類:連同底下所有小分類,並從商品上移除 */
function adminDeleteBig(tk, big) {
  var u = me_(tk); big = String(big || '');
  lk_(function () {
    var del = {}; cats_().forEach(function (c) { if (c === big || c.indexOf(big + '/') === 0) del[c] = 1; });
    if (!Object.keys(del).length) throw new Error('找不到大分類「' + big + '」');
    var hit = 0;
    rows_('商品').forEach(function (p) {
      var cs = cs_(p.類別); if (cs.some(function (c) { return del[c]; })) { var pn = cp_(p); pn.類別 = cs.filter(function (c) { return !del[c]; }).join(','); put_('商品', p._r, pn); hit++; }
    });
    rows_('類別').filter(function (r) { return del[String(r.類別)]; }).map(function (r) { return r._r; }).sort(function (a, b) { return b - a; }).forEach(function (r) { sh_('類別').deleteRow(r); });
    log_(u.acc, '刪除大分類', big, Object.keys(del).length + ' 個分類,影響 ' + hit + ' 項商品');
  });
  return catList_();
}
function adminDeleteCat(tk, name) {
  var u = me_(tk); name = String(name || '');
  lk_(function () {
    var r = rows_('類別').filter(function (x) { return String(x.類別) === name; })[0];
    if (!r) throw new Error('找不到分類「' + name + '」');
    var hit = 0;
    rows_('商品').forEach(function (p) {
      if (cs_(p.類別).indexOf(name) >= 0) { var pn = cp_(p); pn.類別 = cs_(p.類別).filter(function (c) { return c !== name; }).join(','); put_('商品', p._r, pn); hit++; }
    });
    sh_('類別').deleteRow(r._r);
    log_(u.acc, '刪除分類', name, '影響 ' + hit + ' 項商品');
  });
  return catList_();
}
function adminAddVendor(tk, name) {
  var u = me_(tk); name = t_(name, 60);
  if (!name) throw new Error('請輸入廠商名稱');
  vendors_();
  lk_(function () {
    if (vendors_().indexOf(name) >= 0) throw new Error('廠商「' + name + '」已經存在');
    put_('廠商', 0, { '廠商': name }); log_(u.acc, '新增廠商', name, '');
  });
  return vendors_();
}
function adminDeleteVendor(tk, name) {
  var u = me_(tk); name = String(name || '');
  vendors_();
  lk_(function () {
    var r = rows_('廠商').filter(function (x) { return String(x.廠商) === name; })[0];
    if (!r) throw new Error('找不到這個廠商');
    sh_('廠商').deleteRow(r._r); log_(u.acc, '刪除廠商', name, '已存在的商品與訂單仍保留原廠商名稱');
  });
  return vendors_();
}

/* ===== 物流清單(存在設定「物流追蹤連結」,每行「名稱=查詢網址」,網址可含 {單號}) ===== */
function carriers_() {
  var s = settings_(), raw = s.物流追蹤連結 === undefined ? defSet_('物流追蹤連結') : String(s.物流追蹤連結 || ''), out = [];
  raw.split('\n').forEach(function (ln) {
    var i = ln.indexOf('='); if (i < 1) return;
    var k = ln.slice(0, i).trim(), v = ln.slice(i + 1).trim(); if (k) out.push({ name: k, url: v });
  });
  return out;
}
function trackUrl_(co, no) {
  co = String(co || ''); var list = carriers_(), hit = list.filter(function (c) { return c.name === co; })[0] || list.filter(function (c) { return co.indexOf(c.name) >= 0; })[0];
  return hit && /^https:\/\//.test(hit.url) ? hit.url.split('{單號}').join(encodeURIComponent(String(no || ''))) : '';
}
/** 客人看到的短連結:網站網址/t.html?i=出貨單號(頁面會顯示單號、可複製,再帶去物流官網) */
function shortTrack_(s) {
  var co = String(s.物流 || ''), no = String(s.物流單號 || '');
  if (!co && !no) return '';
  var u = trackUrl_(co, no); if (!u) return '';
  var base = appUrl_();
  return /\/$/.test(base) ? base + 't.html?i=' + encodeURIComponent(String(s.出貨單ID)) : u;
}
function saveCarriers_(list, acc, what, target) {
  var text = list.map(function (c) { return c.name + '=' + c.url; }).join('\n');
  if (text.length > 1000) throw new Error('物流清單太長');
  var ex = rows_('設定').filter(function (r) { return r.項目 === '物流追蹤連結'; })[0];
  if (ex) put_('設定', ex._r, { '項目': '物流追蹤連結', '值': text }); else put_('設定', 0, { '項目': '物流追蹤連結', '值': text });
  log_(acc, what, target, '');
}
function adminCarriers(tk) { me_(tk); return carriers_(); }
function adminSaveCarrier(tk, name, url, old) {
  var u = me_(tk); name = t_(name, 30); url = t_(url, 300); old = t_(old, 30);
  if (!name) throw new Error('請輸入物流名稱');
  if (/[=\n]/.test(name)) throw new Error('物流名稱不能包含「=」');
  if (!/^https:\/\//.test(url)) throw new Error('查詢網址需以 https:// 開頭');
  lk_(function () {
    var list = carriers_(), i = -1;
    list.forEach(function (c, k) { if (c.name === (old || name)) i = k; });
    if (old && i < 0) throw new Error('找不到原本的物流');
    if (list.some(function (c, k) { return c.name === name && k !== i; })) throw new Error('物流「' + name + '」已經存在');
    if (i >= 0) list[i] = { name: name, url: url }; else list.push({ name: name, url: url });
    saveCarriers_(list, u.acc, i >= 0 ? '修改物流' : '新增物流', name);
  });
  return carriers_();
}
function adminDeleteCarrier(tk, name) {
  var u = me_(tk); name = String(name || '');
  lk_(function () {
    var list = carriers_(), n = list.filter(function (c) { return c.name !== name; });
    if (n.length === list.length) throw new Error('找不到這個物流');
    saveCarriers_(n, u.acc, '刪除物流', name);
  });
  return carriers_();
}
/** 客人點通知裡的短連結:回傳物流名稱、單號與官網查詢網址 */
function trackLink(id) {
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === String(id || ''); })[0];
  if (!s || (!s.物流 && !s.物流單號)) throw new Error('查無這筆物流資料');
  return { id: String(s.出貨單ID), co: String(s.物流 || ''), no: String(s.物流單號 || ''), url: trackUrl_(s.物流, s.物流單號) };
}
function adminInit(tk) { var u0 = me_(tk); return { boss: isBoss_(u0.acc), products: adminProducts_(), cats: cats_(), admins: admins_(), vendors: vendors_(), brands: brands_(), carriers: carriers_() }; }

function adminSaveProduct(tk, d) {
  var u = me_(tk), L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    var name = t_(d.name, 80);
    if (!name) throw new Error('請填寫品名');
    var price = Number(d.price);
    if (d.price === '' || !(price >= 0)) throw new Error('單價不正確');
    var stock = '';
    var specs = [], specAll = true, specSum = 0, seenSp = {};
    [].concat(d.specs || []).forEach(function (s) {
      var sq = '';
      if (s && typeof s === 'object') { sq = s.q; s = s.n; }
      s = specNorm_(s);
      if (!s || seenSp[s]) return; seenSp[s] = 1;
      if (sq === '' || sq == null) { specAll = false; specs.push(s); return; }
      sq = Math.floor(Number(sq)); if (!(sq >= 0)) throw new Error('規格「' + s + '」的數量不正確');
      specSum += sq; specs.push(s + '=' + sq);
    });
    if (specs.join('|').length > 40000) throw new Error('規格太多');
    if (specs.length && (specAll || specSum > 0 || specs.some(function (x) { return x.indexOf('=') > 0; }))) { stock = specAll ? specSum : ''; }
    else if (!d.unlimited) {
      if (d.stock === '' || d.stock == null) throw new Error('請填寫數量,或勾選「無限」');
      stock = Math.floor(Number(d.stock));
      if (!(stock >= 0)) throw new Error('數量不正確');
    }
    if (['現貨', '預購'].indexOf(d.type) < 0) throw new Error('請選擇現貨或預購');
    if (d.arrival && !etaOk_(d.arrival)) throw new Error('到貨日期格式不正確(日期、排隊中,或下單後 1~52 週)');
    tiers_(d.tiers, true);
    var cl = String(d.close || '').trim();
    if (cl && !closeAt_(cl)) throw new Error('關團日期格式不正確');
    if (d.on && closed_({ 關團日期: cl })) throw new Error('關團時間 ' + closeTx_(cl) + ' 已經過了,要上架請先改關團日期或清空');
    var ps = rows_('商品'), id = d.id;
    var old = id ? ps.filter(function (p) { return p.商品ID === id; })[0] : null;
    if (!old) {
      var mx = 0;
      ps.forEach(function (p) { mx = Math.max(mx, parseInt(String(p.商品ID).slice(1), 10) || 0); });
      id = 'P' + ('000' + (mx + 1)).slice(-3);
    }
    var oi = rows_('商品_內部').filter(function (r) { return r.商品ID === id; })[0] || null;
    var inn = { '商品ID': id, '廠商': t_(d.vendor, 60), '成本': (d.cost === '' || d.cost == null) ? '' : Number(d.cost), '成本含稅': d.taxIncl ? 'Y' : 'N', '貨源': t_(d.source, 60), '鎖定': 'N' };
    var row = { '商品ID': id, '名稱': name, '類別': (d.cats || []).join(','), '銷售型態': d.type, '單價': price, '數量': stock, '到貨日期': d.arrival || '', '說明': t_(d.desc, 1000), '階梯價': String(d.tiers || '').trim(), '圖片': imgList_(d.img), '上架': d.on ? 'Y' : 'N', '規格': specs.join('|'), '規格圖片': specImgSave_(d.specImg, imgList_(d.img)), '品牌': brandResolve_(u, d), '關團日期': cl };
    put_('商品', old ? old._r : 0, row);
    put_('商品_內部', oi ? oi._r : 0, inn);
    log_(u.acc, old ? '修改商品' : '新增商品', id + ' ' + name, old ? [diff_(old, row), diff_(oi, inn)].filter(function (x) { return x && x !== '新增'; }).join(';') : '新增');
    [].concat(d.cb || []).slice(0, 20).forEach(function (x) { if (x && x.proid) cbBindDo_(u, id, x); }); // 同一次儲存一起綁定酷柏商品(可一次綁多個顏色;規格不對會整筆不存,畫面會顯示原因)
    return adminProducts_();
  } finally { L.releaseLock(); }
}
function adminDeleteProduct(tk, id) {
  var u = me_(tk), L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    var p0 = rows_('商品').filter(function (x) { return String(x.商品ID) === String(id); })[0];
    if (p0) major_(u.acc, '刪除商品', id, String(p0.名稱), { product: cp_(p0), inner: rows_('商品_內部').filter(function (x) { return String(x.商品ID) === String(id); }).map(cp_) });
    ['商品', '商品_內部'].forEach(function (n) {
      var r = rows_(n).filter(function (x) { return x.商品ID === id; })[0];
      if (r) sh_(n).deleteRow(r._r);
    });
    log_(u.acc, '刪除商品', id, '');
    return adminProducts_();
  } finally { L.releaseLock(); }
}
/** 商品批次上架 / 下架 / 刪除 */
/* ---------- 聖誕專區上線通知 ----------
 * 客人在前台按「上線通知我」(要 LINE 登入)→ 記在設定「聖誕專區訂閱」(LINE ID 用逗號分開),並傳一則確認訊息。
 * 聖誕專區的商品上架後先不顯示在前台;全部上架好後,管理員在後台「設定」按「開放聖誕專區＋通知客人」,
 * 商品才出現在前台,同時一次通知所有登記的客人(只能按一次)。
 * 「可以買的商品」= 上架中、沒關團、沒售完、品名沒有【測試】。 */
var XMZ_CAT_ = '聖誕專區';
function xmzSubs_() { return String(settings_()['聖誕專區訂閱'] || '').split(',').filter(function (x) { return /^U[0-9a-f]{32}$/.test(x); }); }
function xmzLive_() { return xmzItems_().length > 0; }
function xmzItems_() {
  return rows_('商品').filter(function (p) {
    if (!onSale0_(p) || String(p.名稱).indexOf('【測試】') >= 0) return false;
    if (!cs_(p.類別).some(function (c) { return c === XMZ_CAT_ || c.indexOf(XMZ_CAT_ + '/') === 0; })) return false;
    return pub_(p).stock !== 0; // 跟前台「已售完」同一套判斷(含預購商品的現貨)
  });
}
function memberXmasSub(tk) {
  var ctx = mem_(tk); if (!ctx.lid) throw new Error('請先用 LINE 登入,上線時才能用 LINE 通知您');
  var already = false, live = false;
  lk_(function () {
    var a = xmzSubs_(); live = !!String(settings_()['聖誕專區上線通知'] || '');
    if (a.indexOf(ctx.lid) >= 0) { already = true; return; }
    a.push(ctx.lid); setSet_('聖誕專區訂閱', a.join(','));
    log_('客人', '聖誕專區上線通知登記', ctx.lid.slice(0, 8) + '…', '目前共 ' + a.length + ' 位');
  });
  if (!already && !live) pushLine_(ctx.lid, '🎄 已收到您的聖誕專區上線通知登記!\n\n交換禮物、聖誕大禮包正在準備中,專區一上線我們會第一時間用 LINE 通知您 🎁\n\n— coscos 韓國選物店');
  return { ok: true, already: already, live: live };
}
/** 後台按鈕:go=false 只看目前狀態;go=true 通知所有登記的客人(只能發一次) */
function adminXmasNotify(tk, go) {
  var u = me_(tk);
  return lk_(function () {
    var sent = String(settings_()['聖誕專區上線通知'] || ''), its = xmzItems_(), n = xmzSubs_().length;
    if (go) {
      if (sent) throw new Error('聖誕專區已經開放了(' + sent + '),不會重複通知');
      if (!its.length) throw new Error('聖誕專區還沒有可以買的商品(要上架、沒售完、品名沒有【測試】),先上架再開放');
      xmzLaunch_(u.acc); sent = String(settings_()['聖誕專區上線通知'] || '');
    }
    return { subs: n, items: its.map(function (p) { return String(p.名稱); }), sent: sent };
  });
}
/** 由 adminXmasNotify 呼叫(已在鎖裡):通知所有登記的客人,只發一次 */
function xmzLaunch_(who) {
  if (String(settings_()['聖誕專區上線通知'] || '')) return;
  var its = xmzItems_(); if (!its.length) return;
  var subs = xmzSubs_();
  setSet_('聖誕專區上線通知', now_() + ' 開放,通知 ' + subs.length + ' 位');
  log_(who || '系統', '開放聖誕專區', '', its.length + ' 項商品顯示在前台,通知已登記的 ' + subs.length + ' 位客人');
  if (!subs.length) return;
  var url = appUrl_() || 'https://coscoskr.github.io/shop/';
  var text = '🎄 coscos 聖誕專區上線囉!\n\n您登記的聖誕專區已經開放,數量有限,先逛先選 🎁\n\n' + its.slice(0, 5).map(function (p) { return '🎁 ' + p.名稱 + '  NT$' + Number(p.單價 || 0); }).join('\n') + (its.length > 5 ? '\n…還有 ' + (its.length - 5) + ' 項' : '') + '\n\n👉 ' + url + (url.indexOf('?') >= 0 ? '&' : '?') + 'c=' + encodeURIComponent(XMZ_CAT_);
  var tkn = prop_('LINE_MSG_TOKEN'); if (!tkn) return;
  for (var i = 0; i < subs.length; i += 500) {
    try {
      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/multicast', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tkn }, muteHttpExceptions: true,
        payload: JSON.stringify({ to: subs.slice(i, i + 500), messages: [{ type: 'text', text: text }] }) });
    } catch (e) {}
  }
}
function adminBatchProducts(tk, ids, op) {
  var u = me_(tk), done = 0, skip = [];
  if (['on', 'off', 'delete'].indexOf(op) < 0) throw new Error('未知的操作');
  ids = (ids || []).slice(0, 200).map(String);
  if (!ids.length) throw new Error('請先勾選商品');
  lk_(function () {
    ids.forEach(function (id) {
      var p = rows_('商品').filter(function (x) { return String(x.商品ID) === id; })[0];
      if (!p) { skip.push(id + ' 不存在'); return; }
      if (op === 'delete') {
        var snap = { product: cp_(p), inner: rows_('商品_內部').filter(function (x) { return String(x.商品ID) === id; }).map(cp_) };
        ['商品', '商品_內部'].forEach(function (n) {
          var r = rows_(n).filter(function (x) { return String(x.商品ID) === id; })[0];
          if (r) sh_(n).deleteRow(r._r);
        });
        log_(u.acc, '刪除商品', id + ' ' + p.名稱, '(批次)');
        major_(u.acc, '刪除商品', id, String(p.名稱), snap);
      } else {
        var want = op === 'on' ? 'Y' : 'N';
        if (String(p.上架) === want) { skip.push(id + ' 已經是' + (op === 'on' ? '上架' : '下架')); return; }
        if (op === 'on' && closed_(p)) { skip.push(id + ' 已過關團日期 ' + p.關團日期 + '(請先改關團日期)'); return; }
        var n = cp_(p); n.上架 = want; put_('商品', p._r, n);
        log_(u.acc, op === 'on' ? '上架商品' : '下架商品', id + ' ' + p.名稱, '(批次)');
      }
      done++;
    });
  });
  var label = { on: '上架', off: '下架', delete: '刪除' }[op];
  return { products: adminProducts_(), msg: '已' + label + ' ' + done + ' 項商品' + (skip.length ? ',略過 ' + skip.length + ' 項:\n' + skip.join('\n') : '') };
}
/** 批次改關團日期/到貨日期。d = { close?: 'yyyy-MM-dd' 或 ''(清除), arrival?: 日期/排隊中/下單後N週 或 ''(清除) };沒帶的欄位不動 */
function adminBatchProductDates(tk, ids, d) {
  var u = me_(tk), done = 0, skip = []; d = d || {};
  var doC = Object.prototype.hasOwnProperty.call(d, 'close'), doA = Object.prototype.hasOwnProperty.call(d, 'arrival');
  if (!doC && !doA) throw new Error('請選擇要修改關團日期或到貨日期');
  var cl = doC ? String(d.close || '').trim() : '', ar = doA ? String(d.arrival || '').trim() : '';
  if (cl && !closeAt_(cl)) throw new Error('關團日期格式不正確');
  if (cl && closed_({ 關團日期: cl })) throw new Error('關團時間 ' + closeTx_(cl) + ' 已經過了,請選之後的時間');
  if (ar && !etaOk_(ar)) throw new Error('到貨日期格式不正確(日期、排隊中,或下單後 1~52 週)');
  ids = (ids || []).slice(0, 500).map(String);
  if (!ids.length) throw new Error('請先勾選商品');
  lk_(function () {
    ids.forEach(function (id) {
      var p = rows_('商品').filter(function (x) { return String(x.商品ID) === id; })[0];
      if (!p) { skip.push(id + ' 不存在'); return; }
      var n = cp_(p);
      if (doC) n.關團日期 = cl;
      if (doA) n.到貨日期 = ar;
      var df = diff_(p, n); if (!df) { skip.push(id + ' 沒有變動'); return; }
      put_('商品', p._r, n);
      log_(u.acc, '修改商品', id + ' ' + p.名稱, df + '(批次改日期)');
      done++;
    });
  });
  return { products: adminProducts_(), msg: '已修改 ' + done + ' 項商品' + (doC ? '\n關團日期:' + (cl ? closeTx_(cl) + ' 自動下架' : '清除(不關團)') : '') + (doA ? '\n到貨日期:' + (ar || '清除') : '') + (skip.length ? '\n\n略過 ' + skip.length + ' 項:\n' + skip.join('\n') : '') };
}
/* ---------- 折扣碼(後台獨立功能:名稱 + 百分比或金額擇一) ---------- */
function codeSheet_() {
  var ss = ss_(), sh = ss.getSheetByName('折扣碼');
  if (!sh) { sh = ss.insertSheet('折扣碼'); sh.getRange(1, 1, 1, H['折扣碼'].length).setValues([H['折扣碼']]).setFontWeight('bold'); sh.setFrozenRows(1); sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); sh.getRange(2, 9, Math.max(sh.getMaxRows() - 1, 1), 2).setNumberFormat('@'); delete SHC_['折扣碼']; delete RC_['折扣碼']; }
  else if (sh.getLastColumn() < H['折扣碼'].length) { sh.getRange(1, 1, 1, H['折扣碼'].length).setValues([H['折扣碼']]).setFontWeight('bold'); sh.getRange(2, 9, Math.max(sh.getMaxRows() - 1, 1), 2).setNumberFormat('@'); delete SHC_['折扣碼']; delete RC_['折扣碼']; }
  return sh;
}
function codes_() { codeSheet_(); return rows_('折扣碼'); }
function dstr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  var m = String(v || '').match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : '';
}
function codeState_(r) {
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), st = dstr_(r.開始日), en = dstr_(r.截止日), lim = Number(r.使用上限) || 0;
  if (String(r.啟用) !== 'Y') return '停用';
  if (lim > 0 && (Number(r.使用次數) || 0) >= lim) return '已用完';
  if (st && today < st) return '未開始';
  if (en && today > en) return '已過期';
  return '可用';
}
function findCode_(v) {
  var k = String(v || '').trim().toLowerCase(); if (!k) return null;
  return codes_().filter(function (r) { return String(r.折扣碼).toLowerCase() === k && codeState_(r) === '可用'; })[0] || null;
}
function codeUsed_(name, delta) {
  var r = codes_().filter(function (x) { return String(x.折扣碼) === String(name); })[0];
  if (r) { var n = cp_(r); n.使用次數 = Math.max(0, (Number(r.使用次數) || 0) + (delta === undefined ? 1 : delta)); put_('折扣碼', r._r, n); }
}
function codeList_() {
  return codes_().map(function (r) { return { code: String(r.折扣碼), type: String(r.類型), value: Number(r.數值), on: String(r.啟用) === 'Y', note: String(r.備註 || ''), used: Number(r.使用次數) || 0, limit: Number(r.使用上限) || 0, start: dstr_(r.開始日), end: dstr_(r.截止日), min: Number(r.最低消費) || 0, state: codeState_(r), at: String(r.建立時間 || '').slice(0, 16) }; });
}
function adminCodes(tk) { me_(tk); return codeList_(); }
function adminSaveCode(tk, d) {
  var u = me_(tk); d = d || {};
  var code = String(d.code || '').trim(), old = String(d.old || '');
  if (!/^[^\s,|]{2,30}$/.test(code)) throw new Error('折扣碼名稱請填 2-30 字,不能有空白或逗號');
  var type = String(d.type || ''); if (['百分比', '金額'].indexOf(type) < 0) throw new Error('請選擇折扣方式(百分比或金額)');
  var v = Number(d.value);
  if (type === '百分比' && !(v >= 1 && v <= 99 && Math.floor(v) === v)) throw new Error('折扣 % 請填 1-99 的整數(例:10 代表折抵 10%,也就是打九折)');
  if (type === '金額' && !(v >= 1 && Math.floor(v) === v)) throw new Error('折扣金額請填 1 以上的整數');
  var lim = d.limit === '' || d.limit == null ? 0 : Number(d.limit);
  if (!(lim >= 0) || Math.floor(lim) !== lim) throw new Error('使用數量上限請填 1 以上的整數,空白代表不限');
  var mn = d.min === '' || d.min == null ? 0 : Number(d.min);
  if (!(mn >= 0) || Math.floor(mn) !== mn) throw new Error('最低消費請填整數金額,空白代表不限');
  if (type === '金額' && mn > 0 && v >= mn) throw new Error('折扣金額不能大於或等於最低消費門檻');
  var st = String(d.start || '').trim(), en = String(d.end || '').trim();
  if ((st && !dstr_(st)) || (en && !dstr_(en))) throw new Error('日期格式不正確');
  st = dstr_(st); en = dstr_(en);
  if (st && en && en < st) throw new Error('截止日不能早於開始日');
  lk_(function () {
    var all = codes_(), k = code.toLowerCase();
    var dup = all.filter(function (r) { return String(r.折扣碼).toLowerCase() === k && String(r.折扣碼) !== old; })[0];
    if (dup) throw new Error('折扣碼「' + dup.折扣碼 + '」已經存在');
    var cur = old ? all.filter(function (r) { return String(r.折扣碼) === old; })[0] : null;
    if (old && !cur) throw new Error('找不到折扣碼「' + old + '」');
    var row = { '折扣碼': code, '類型': type, '數值': v, '啟用': d.on === false ? 'N' : 'Y', '備註': t_(d.note, 100), '使用次數': cur ? cur.使用次數 : 0, '建立時間': cur ? cur.建立時間 : now_(), '使用上限': lim, '開始日': st, '截止日': en, '最低消費': mn };
    sh_('折扣碼'); put_('折扣碼', cur ? cur._r : 0, row);
    log_(u.acc, cur ? '修改折扣碼' : '新增折扣碼', code, type + ' ' + v + (lim ? ' 上限' + lim : '') + (st || en ? ' ' + st + '~' + en : '') + (row.啟用 === 'N' ? '(停用)' : ''));
  });
  return codeList_();
}
function adminSetCodeOn(tk, code, on) {
  var u = me_(tk);
  lk_(function () {
    var r = codes_().filter(function (x) { return String(x.折扣碼) === String(code); })[0];
    if (!r) throw new Error('找不到折扣碼');
    var n = cp_(r); n.啟用 = on ? 'Y' : 'N'; put_('折扣碼', r._r, n);
    log_(u.acc, on ? '啟用折扣碼' : '停用折扣碼', code, '');
  });
  return codeList_();
}
function adminDeleteCode(tk, code) {
  var u = me_(tk);
  lk_(function () {
    var r = codes_().filter(function (x) { return String(x.折扣碼) === String(code); })[0];
    if (!r) throw new Error('找不到折扣碼');
    sh_('折扣碼').deleteRow(r._r);
    log_(u.acc, '刪除折扣碼', code, '已使用 ' + (Number(r.使用次數) || 0) + ' 次');
  });
  return codeList_();
}
function adminSaveAdmin(tk, d) {
  var u = me_(tk), acc = String(d.acc || '').trim(), pw = String(d.pw || '');
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(acc)) throw new Error('帳號需為 3-20 碼英數字');
  var ex = admins_().filter(function (a) { return a.acc === acc; })[0];
  if (!ex && pw.length < 8) throw new Error('新帳號需設定至少 8 碼密碼');
  if (pw && pw.length < 8) throw new Error('密碼至少 8 碼');
  if (!d.on && !admins_().some(function (a) { return a.on && a.acc !== acc; })) throw new Error('至少要保留一個啟用中的管理員');
  saveAdmin_(acc, t_(d.name, 30), pw, !!d.on);
  log_(u.acc, ex ? '修改管理員' : '新增管理員', acc, (pw ? '已重設密碼;' : '') + '啟用:' + (d.on ? '是' : '否'));
  return admins_();
}
function adminLogs(tk) {
  me_(tk);
  return rows_('操作紀錄').reverse().slice(0, 300).map(function (r) { return [r.時間, r.帳號, r.動作, r.對象, r.內容]; });
}

/* ---------- 會員中心 ----------
 * 目前以「電話 + 任一訂單編號」驗證身分;串接 LINE 登入後改用 LINE ID。 */
function nz_(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
function mk_(p) {
  var t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('m_' + t, p, 1800);
  return t;
}
function mem_(tk) {
  tk = String(tk || '');
  if (tk.charAt(0) === 'L') {
    var h = sha_(tk), n = now_();
    var r = rows_('登入階段').filter(function (x) { return String(x.雜湊) === h && String(x.到期) > n; })[0];
    if (!r) throw new Error('登入已過期,請重新登入');
    return { lid: String(r['LINE ID']) };
  }
  var p = CacheService.getScriptCache().get('m_' + tk);
  if (!p) throw new Error('驗證已過期,請重新驗證');
  return { phone: p };
}
function lineMeta_(admin) {
  var pm = {}, im = {};
  rows_('商品').forEach(function (p) { pm[String(p.商品ID)] = p; });
  if (admin) rows_('商品_內部').forEach(function (r) { im[String(r.商品ID)] = r; });
  return function (r) {
    var p = pm[bp_(r.商品ID)] || {}, i = im[bp_(r.商品ID)] || {};
    var m = { typ: String(r.型態 || p.銷售型態 || ''), eta: String(p.到貨日期 || ''), brand: String(p.品牌 || '') };
    if (admin) {
      var has = ['廠商', '成本', '貨源'].some(function (k) { return r[k] !== undefined && r[k] !== ''; });
      if (has) { m.vendor = String(r.廠商 || ''); m.cost = (r.成本 === undefined || r.成本 === '') ? '' : Number(r.成本); m.tax = r.成本含稅 === 'Y'; m.src = String(r.貨源 || ''); }
      else { m.vendor = String(i.廠商 || ''); m.cost = (i.成本 === undefined || i.成本 === '') ? '' : Number(i.成本); m.tax = i.成本含稅 === 'Y'; m.src = String(i.貨源 || ''); }
      m.pay = String(r.廠商付款ID || ''); m.spec = String(r.規格 || '');
    }
    return m;
  };
}
function mine_(ctx, o) { return ctx.lid ? String(o['LINE ID']) === ctx.lid : nz_(o.電話) === ctx.phone; }
function memberLogin(phone, oid) {
  var p = nz_(phone), id = String(oid || '').trim().toUpperCase();
  if (!p || !id) return { ok: false, msg: '請同時輸入下單時的電話與訂單編號' };
  var c = CacheService.getScriptCache(), k1 = 'mf_' + p, k2 = 'mf_' + id, n1 = Number(c.get(k1) || 0), n2 = Number(c.get(k2) || 0), gn = Number(c.get('mfg') || 0);
  if (n1 >= 5 || n2 >= 5 || gn >= 60) return { ok: false, msg: '嘗試次數過多,請10分鐘後再試' };
  var hit = rows_('訂單').filter(function (r) { return String(r.訂單ID).toUpperCase() === id && nz_(r.電話) === p; })[0];
  if (!hit) {
    c.put(k1, String(n1 + 1), 600); c.put(k2, String(n2 + 1), 600); c.put('mfg', String(gn + 1), 600);
    return { ok: false, msg: '電話與訂單編號不符,請確認後再試' };
  }
  return { ok: true, token: mk_(nz_(hit.電話)) };
}
function shipObj_(r) {
  return { id: String(r.出貨單ID), oids: String(r.訂單ID).split(','), st: String(r.狀態), pay: String(r.付款方式), co: String(r.物流 || ''), no: String(r.物流單號 || ''), it: String(r.品項 || ''),
    cr: String(r.建立時間 || ''), at: String(r.出貨時間 || ''), name: String(r.姓名 || ''), phone: String(r.電話 || ''), ship: String(r.收件資訊 || ''), note: String(r.備註 || ''), inv: String(r.發票號碼 || ''), invd: String(r.發票日期 || ''), kind: String(r.付款類型 || ''), lgid: String(r.綠界物流ID || ''),
    sub: Number(r.商品金額), disc: Number(r.優惠折抵), cred: Number(r.購物金折抵), fee: Number(r.運費), total: Number(r.總額),
    link: /^https:\/\//.test(String(r.付款連結)) ? String(r.付款連結) : '', last5: String(r.匯款後五碼 || ''), rdate: String(r.匯款日期 || ''), rparts: rparts_(r.匯款明細), bank: String(r.收款帳號 || ''), pr: String(r.列印時間 || ''), img: String(r.出貨單圖片 || ''), method: String(r.配送方式 || ''), trk: shortTrack_(r) };
}
function memberOrders(tk) {
  var ctx = mem_(tk), lm = lineMeta_(false), items = {}, sh = {};
  rows_('出貨單').forEach(function (r) { if (mine_(ctx, r)) sh[String(r.出貨單ID)] = shipObj_(r); });
  rows_('訂單明細').forEach(function (r) {
    var m = lm(r);
    (items[r.訂單ID] = items[r.訂單ID] || []).push({ pid: String(r.商品ID), name: r.品名, qty: r.數量, unit: r.單價, sub: r.小計, arr: r.到貨狀態, sid: String(r.出貨單ID || ''), typ: m.typ, eta: m.eta });
  });
  var orders = rows_('訂單').filter(function (r) { return mine_(ctx, r); }).reverse().map(function (r) {
    return { id: String(r.訂單ID), nm: String(r.姓名), ph: String(r.電話), at: String(r.下單時間), st: String(r.狀態), sub: Number(r.商品金額), disc: Number(r.優惠折抵), cred: Number(r.購物金折抵), code: String(r.折扣碼 || ''), dname: String(r.優惠名稱 || ''), total: Number(r.總額), items: items[r.訂單ID] || [] };
  });
  var ships = Object.keys(sh).map(function (k) { return sh[k]; }).sort(function (a, b) { return a.id < b.id ? 1 : -1; });
  return { bank: String(settings_().匯款資訊 || ''), free: Number(settings_().免運門檻) || 0, fee: Number(settings_().宅配運費) || 0, feeCvs: Number(settings_().店到店運費) || 0, me: ctx.lid ? meInfo_(ctx.lid) : null, orders: orders, ships: ships };
}
/** 會員自己修改基本資料(姓名、電話、Email、預設收件地址);只有 LINE 會員可用 */
function memberSaveProfile(tk, d) {
  var ctx = mem_(tk); d = d || {};
  if (!ctx.lid) throw new Error('請先用 LINE 登入,才能修改會員資料');
  var nm = t_(d.name, 40), ph = t_(d.phone, 20), em = t_(d.email, 80), ad = t_(d.addr, 150);
  if (!nm) throw new Error('請填寫姓名');
  if (ph && !/^[0-9+\-\s]{8,20}$/.test(ph)) throw new Error('請填寫正確的聯絡電話');
  if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) throw new Error('請填寫正確的電子郵件');
  lk_(function () {
    var m = memberRow_(ctx.lid); if (!m) throw new Error('找不到會員資料');
    var n = cp_(m); n.姓名 = nm; n.電話 = ph; n.Email = em; n.收件地址 = ad; put_('會員', m._r, n);
  });
  return meInfo_(ctx.lid);
}
/** 客人更改付款方式:只限還沒付款/還沒處理的出貨單;運費、應付、狀態跟著重算 */
function memberChangePay(tk, sid, d) {
  var ctx = mem_(tk); d = d || {}; sid = String(sid || '');
  var pay = String(d.pay || ''), out = '';
  if (!PAY[pay]) throw new Error('請選擇付款方式');
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid && mine_(ctx, x); })[0];
    if (!s) throw new Error('找不到出貨單');
    var f0 = FLOW[s.付款方式] || [];
    if (String(s.匯款後五碼 || '')) throw new Error('這張出貨單已經回報匯款,不能再改付款方式,請聯繫客服');
    if (f0.indexOf(String(s.狀態)) !== 0) throw new Error('這張出貨單已經付款或開始處理(' + s.狀態 + '),不能再改付款方式,請聯繫客服');
    if (String(s.發票號碼 || '') || String(s.綠界物流ID || '')) throw new Error('這張出貨單已經在處理中,不能再改付款方式,請聯繫客服');
    var m = String(s.配送方式 || ''), c = cvsOf_(s);
    if (pay === '賣貨便' && String(s.付款方式) !== '賣貨便' && !mhFriendOk_(ctx, d)) throw new Error(MH_FRIEND_MSG);
    if (pay === '賣貨便' && m !== '店到店') throw new Error((logiOn_(d) ? '超商取貨付款' : '賣貨便') + '只能搭配超商店到店');
    if (pay === '賣貨便' && !logiOn_(d) && c && c.cvs !== '7-11') throw new Error('賣貨便只能寄 7-11,你的取貨門市是 ' + c.cvs + ',請改選其他付款方式');
    if (pay === '付現金' && m !== '自取') throw new Error('付現金只能搭配到店自取');
    if (pay !== '賣貨便' && c && c.store.indexOf(MH_STORE) >= 0) throw new Error('這張賣貨便出貨單沒有選超商門市,不能改成其他付款方式,請聯繫客服');
    if (pay === '刷卡' && prop_('ECPAY_PAY_LIVE') !== '1' && !d.paytest) throw new Error('線上付款即將開放,請選擇其他付款方式');
    var kind = pay === '刷卡' ? kindOk_(d) : '';
    var n = cp_(s), oldPay = String(s.付款方式), oldFee = Number(s.運費) || 0;
    if (oldPay === pay && String(s.付款類型 || '') === kind) { out = 'same'; return; }
    n.付款方式 = pay; n.付款類型 = kind; n.狀態 = PAY[pay]; n.收款帳號 = pay === '匯款' ? String(settings_().匯款資訊 || '') : '';
    if (!String(s.物流 || '')) n.物流 = defCo_(pay, s.配送方式);
    if ((oldPay === '賣貨便') !== (pay === '賣貨便')) n.運費 = feeFor_(m, pay, Number(s.商品金額) - Number(s.優惠折抵 || 0)); // 賣貨便運費和店到店不同
    n.總額 = Math.max(0, Number(s.商品金額) - Number(s.優惠折抵 || 0) - Number(s.購物金折抵 || 0)) + Number(n.運費 || 0);
    put_('出貨單', s._r, n);
    log_('客人 ' + s.姓名, '更改付款方式', sid, oldPay + (s.付款類型 ? '(' + s.付款類型 + ')' : '') + '→' + pay + (kind ? '(' + kind + ')' : '') + (Number(n.運費) !== oldFee ? ',運費 ' + oldFee + '→' + n.運費 : '') + ',應付 ' + n.總額);
    String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, '客人'); });
    var lid = String(s['LINE ID'] || '');
    if (pay === '賣貨便' && lid && !logiOn_(d)) { var mt = String(settings_().賣貨便成立通知內容 === undefined ? defSet_('賣貨便成立通知內容') : settings_().賣貨便成立通知內容 || '').trim(); if (mt) pushLine_(lid, mt.split('{出貨單號}').join(sid)); }
  });
  var r = memberOrders(tk); r.sid = sid; return r;
}
function memberReportPay(tk, sid, last5) {
  var ctx = mem_(tk), l5 = String(last5 || '').trim();
  if (!/^\d{5}$/.test(l5)) throw new Error('請輸入 5 位數字');
  lk_(function () {
    var r = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid && mine_(ctx, x); })[0];
    if (!r) throw new Error('找不到出貨單');
    if (r.付款方式 !== '匯款' || ['待匯款', '已匯款待查帳'].indexOf(r.狀態) < 0) throw new Error('此出貨單目前不需要回報匯款');
    var n = cp_(r); n.匯款後五碼 = l5; n.匯款日期 = today_(); n.狀態 = '已匯款待查帳';
    put_('出貨單', r._r, n);
    log_('客人 ' + r.姓名, '回報匯款', sid, '後五碼 ' + l5 + ',匯款日期 ' + today_() + ',狀態→已匯款待查帳');
  });
  return memberOrders(tk);
}

/* ---------- 商品圖片上傳(存到雲端硬碟) ---------- */
/** 第一次使用前,在編輯器執行一次這個函式並完成授權 */
function authDrive() { DriveApp.getRootFolder(); Logger.log('雲端硬碟已授權,可以上傳商品圖片了。'); }
function adminUploadImage(tk, fname, mime, b64) {
  var u = me_(tk);
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) throw new Error('只能上傳 JPG、PNG 或 WebP 圖片');
  if (!b64 || String(b64).length > 4000000) throw new Error('圖片太大,請換小一點的圖');
  var folders = DriveApp.getFoldersByName('coscos商品圖片');
  var fo = folders.hasNext() ? folders.next() : DriveApp.createFolder('coscos商品圖片');
  var ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  var f = fo.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, 'p' + Date.now() + ext));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log_(u.acc, '上傳商品圖片', f.getId(), t_(fname, 60));
  return 'https://lh3.googleusercontent.com/d/' + f.getId() + '=w800';
}

/** 批次修改到貨狀態(整合在 adminLineInfo 裡,這裡保留單獨呼叫) */
function adminBatchArrival(tk, keys, arr, notify) { return adminLineInfo(tk, keys, { arr: arr, notify: notify }); }
/** 庫存進貨品項改到貨時,同步增減商品庫存數量(無限庫存的商品不動) */
function stockMove_(l, delta) {
  var p = rows_('商品').filter(function (x) { return String(x.商品ID) === bp_(l.商品ID); })[0];
  if (!p) return;
  if (rdyIs_(p)) { // 預購商品:到貨的庫存進貨變成可以直接出貨的現貨
    if (delta > 0) { rdyAdd_(String(p.商品ID), String(l.規格 || ''), delta, l.成本); var re = rdyRelist_(p); RDYN_.push({ name: String(p.名稱), spec: String(l.規格 || ''), qty: delta, re: re }); } else rdyCut_(String(p.商品ID), String(l.規格 || ''), -delta);
    return;
  }
  adjStock_(p, String(l.規格 || ''), delta);
}
/** 單一品項的詳細資料與操作紀錄(誰、何時、做了什麼) */
function adminLineHistory(tk, oid, pid) {
  me_(tk); oid = String(oid);
  var l = allPurch_().filter(function (x) { return String(x.訂單ID) === oid && String(x.商品ID) === String(pid); })[0];
  if (!l) throw new Error('找不到這個品項');
  var logs = rows_('操作紀錄').filter(function (r) { var t = String(r.對象); return t.indexOf(oid) === 0 && (t === oid || t.indexOf(String(l.品名)) > 0); })
    .reverse().map(function (r) { return { at: String(r.時間), acc: String(r.帳號), act: String(r.動作), note: String(r.內容) }; });
  var lm = lineMeta_(true)(l);
  return { oid: oid, pid: String(pid), name: String(l.品名), arr: String(l.到貨狀態), arrBy: String(l.到貨操作人 || ''), arrAt: String(l.到貨時間 || ''), vendor: lm.vendor, pay: lm.pay, logs: logs };
}

/** 批次標示叫貨(on=true 標為已叫貨,false 取消);只處理客訂品項,庫存進貨略過 */
function adminBatchOrder(tk, keys, on) {
  var u = me_(tk), done = 0, skip = 0;
  lk_(function () {
    pickPurchase_(keys).forEach(function (l) {
      if ((l._sh || '訂單明細') !== '訂單明細') { skip++; return; }
      var cur = String(l.叫貨狀態 || '') === '已叫貨';
      if (cur === !!on) { skip++; return; }
      var n = cp_(l);
      n.叫貨狀態 = on ? '已叫貨' : ''; n.叫貨人 = on ? u.acc : ''; n.叫貨時間 = on ? now_() : '';
      put_('訂單明細', l._r, n); done++;
      log_(u.acc, on ? '叫貨' : '取消叫貨', String(l.訂單ID) + ' ' + l.品名, on ? '標示已叫貨(批次)' : '取消叫貨標示(批次)');
    });
  });
  var r = purchaseList_(); r.msg = (on ? '已標示叫貨 ' : '已取消叫貨 ') + done + ' 筆' + (skip ? ',略過 ' + skip + ' 筆(庫存進貨或狀態沒變)' : '');
  return r;
}
/* ---------- 進貨付款(付給廠商) ---------- */
function allPurch_() {
  var a = rows_('訂單明細').map(function (r) { r._sh = '訂單明細'; return r; });
  return a.concat(rows_('庫存進貨').map(function (r) { r._sh = '庫存進貨'; return r; }));
}
/** 訂購人顯示:已綁定 LINE 會員 → LINE 名稱;會員自己改過姓名且不同 → LINE名稱(會員名稱) */
function buyerName_(o, mem) {
  var m = mem[String(o['LINE ID'] || '')];
  if (!m) return String(o.姓名 || '');
  var nick = String(m.暱稱 || '').trim(), rn = String(m.姓名 || '').trim();
  if (!nick) return rn || String(o.姓名 || '');
  return rn && rn.toLowerCase() !== nick.toLowerCase() ? nick + '(' + rn + ')' : nick;
}
function purchaseList_() {
  var lm = lineMeta_(true), ords = {}, shs = {}, mem = {};
  rows_('會員').forEach(function (m) { mem[String(m['LINE ID'])] = m; });
  rows_('訂單').forEach(function (o) { ords[String(o.訂單ID)] = o; });
  rows_('出貨單').forEach(function (x) { shs[String(x.出貨單ID)] = String(x.狀態 || ''); });
  var lines = allPurch_().map(function (r) {
    var m = lm(r), st = r._sh === '庫存進貨', o = ords[String(r.訂單ID)] || {};
    return { key: String(r.訂單ID) + '|' + String(r.商品ID), oid: String(r.訂單ID), pid: String(r.商品ID), stock: st, at: st ? String(r.日期 || '') : String(o.下單時間 || '').slice(0, 10), name: String(r.品名), qty: Number(r.數量), unit: st ? 0 : Number(r.單價),
      code: st ? '' : String(o.折扣碼 || ''), dname: st ? '' : String(o.優惠名稱 || ''), disc: st ? 0 : Number(o.優惠折抵 || 0),
      buyer: st ? '【庫存】' : buyerName_(o, mem), buyer0: st ? '' : String(o.姓名 || ''), spec: String(r.規格 || ''), sid: String(r.出貨單ID || ''), sst: shs[String(r.出貨單ID || '')] || '', arrBy: String(r.到貨操作人 || ''), arrAt: String(r.到貨時間 || ''), ord: st ? '' : String(r.叫貨狀態 || ''), ordBy: st ? '' : String(r.叫貨人 || ''), ordAt: st ? '' : String(r.叫貨時間 || ''), brand: m.brand || '', typ: st ? '庫存' : m.typ, arr: String(r.到貨狀態), vendor: m.vendor, cost: m.cost, tax: m.tax, src: m.src, pay: m.pay };
  }).sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : (a.oid < b.oid ? 1 : -1); });
  var vs = {}; lines.forEach(function (l) { if (l.vendor) vs[l.vendor] = 1; });
  rows_('商品_內部').forEach(function (i) { if (i.廠商) vs[String(i.廠商)] = 1; });
  var pays = rows_('廠商付款').reverse().map(function (p) {
    return { id: String(p.付款ID), date: String(p.付款日期), vendor: String(p.廠商), amount: Number(p.金額), note: String(p.匯款備註 || ''), count: Number(p.品項數), expect: Number(p.應付成本), items: String(p.品項 || ''), by: String(p.建立人 || ''), at: String(p.建立時間 || ''), imgs: imgs_(p.圖片) };
  });
  return { lines: lines, payments: pays, vendors: Object.keys(vs).sort(), vlist: vendors_() };
}
function adminPurchaseList(tk) { me_(tk); return purchaseList_(); }
function pickPurchase_(keys) {
  var want = {}; (keys || []).slice(0, 500).forEach(function (k) { want[String(k)] = 1; });
  var lines = allPurch_().filter(function (l) { return want[String(l.訂單ID) + '|' + String(l.商品ID)]; });
  if (!lines.length) throw new Error('請先勾選品項');
  return lines;
}
/** 批次修改勾選品項:到貨狀態(可 LINE/Email 通知)與廠商、成本、含稅、貨源(只改有填的欄位;已記錄付款的品項不能改廠商/成本/貨源) */
function adminLineInfo(tk, keys, d) {
  var u = me_(tk), done = 0, infoDone = 0, skip = [], arrived = {}, kArr = [], kMsg = [];
  d = d || {};
  if (d.arr && ['待到貨', '已到貨', '已出貨'].indexOf(d.arr) < 0) throw new Error('到貨狀態不正確');
  lk_(function () {
    var cost = null;
    if (d.cost !== '' && d.cost != null) { cost = Number(d.cost); if (!(cost >= 0)) throw new Error('成本不正確'); }
    var vendor = t_(d.vendor, 60), src = t_(d.src, 60), hasInfo = !!(vendor || src || cost !== null || ['Y', 'N'].indexOf(d.tax) >= 0);
    var nm = t_(d.name, 200), ren = {}, synced = null;
    if (!d.arr && !hasInfo && !nm) throw new Error('請至少填寫一項要修改的內容');
    var lm = lineMeta_(true);
    pickPurchase_(keys).forEach(function (l) {
      var sh = l._sh || '訂單明細', n = cp_(l), m = lm(l), tag = String(l.訂單ID) + ' ' + l.品名, touched = false;
      if (d.arr && String(l.到貨狀態) !== d.arr) {
        if (l.出貨單ID) skip.push(tag + '(已建立出貨單 ' + l.出貨單ID + ',到貨狀態不能改)');
        else if (sh === '庫存進貨' && d.arr === '已出貨') skip.push(tag + '(公司庫存不能設為已出貨)');
        else {
          n.到貨狀態 = d.arr; n.可出貨 = d.arr === '已到貨' ? 'Y' : 'N'; n.到貨操作人 = u.acc; n.到貨時間 = now_(); if (d.arr !== '待到貨' && sh !== '庫存進貨') ordOk_(n, u.acc); touched = true;
          log_(u.acc, '到貨', tag, '到貨:' + l.到貨狀態 + '→' + d.arr + '(批次)');
          if (sh === '庫存進貨') { if (d.arr === '已到貨') kArr.push(String(l.訂單ID)); else stockMove_(l, -Number(l.數量)); }
          if (sh !== '庫存進貨' && (d.arr === '已出貨' || String(l.到貨狀態) === '已出貨')) (synced = synced || {})[String(l.訂單ID)] = 1;
          else if (d.arr === '已到貨') { (arrived[String(l.訂單ID)] = arrived[String(l.訂單ID)] || []).push(l.品名); cbPendSettle_([{ pid: l.商品ID, spec: l.規格, qty: l.數量 }], u.acc); }
        }
      }
      if (hasInfo) {
        if (l.廠商付款ID) skip.push(tag + '(已記錄付款 ' + l.廠商付款ID + ',廠商/成本/貨源不能改)');
        else {
          n.廠商 = vendor || m.vendor; n.成本 = cost !== null ? cost : m.cost; n.成本含稅 = (d.tax === 'Y' || d.tax === 'N') ? d.tax : (m.tax ? 'Y' : 'N'); n.貨源 = src || m.src; touched = true; infoDone++;
          log_(u.acc, '修改進貨資料', tag, '廠商:' + m.vendor + '→' + n.廠商 + ';成本:' + m.cost + '→' + n.成本 + ';貨源:' + m.src + '→' + n.貨源);
        }
      }
      if (nm && String(l.品名) !== nm) { n.品名 = nm; touched = true; log_(u.acc, '修改品名', String(l.訂單ID), l.品名 + ' → ' + nm); if (l.出貨單ID) (ren[String(l.出貨單ID)] = ren[String(l.出貨單ID)] || []).push([String(l.品名), nm]); }
      if (touched) { put_(sh, l._r, n); done++; }
    });
    if (synced) Object.keys(synced).forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
    kArr.forEach(function (kid) { var t = kFifo_(kid, u.acc); if (t) kMsg.push(t); }); // 庫存改成已到貨:先照下單順序分給在等的訂單,剩下的才是現貨
    // 改名後同步出貨單的「品項」文字
    if (Object.keys(ren).length) rows_('出貨單').forEach(function (s) {
      var rr = ren[String(s.出貨單ID)]; if (!rr) return;
      var t = String(s.品項 || ''), t0 = t;
      rr.forEach(function (p) { if (t.indexOf(p[1]) < 0) t = t.split(p[0]).join(p[1]); });
      if (t !== t0) { var ns = cp_(s); ns.品項 = t; put_('出貨單', s._r, ns); log_(u.acc, '同步出貨單品名', String(s.出貨單ID), t0 + ' → ' + t); }
    });
    log_(u.acc, '批次修改', '', '共 ' + done + ' 筆' + (skip.length ? ';略過:' + skip.join('、') : '') + ';內容:' + ['到貨=' + (d.arr || ''), '廠商=' + vendor, '貨源=' + src, '成本=' + (cost === null ? '' : cost), '含稅=' + (d.tax || '')].join(','));
  });
  var r = purchaseList_(); r.msg = '已修改 ' + done + ' 筆' + (skip.length ? ',略過 ' + skip.length + ' 筆:\n' + skip.join('\n') : '') + (kMsg.length ? '\n\n' + kMsg.join('\n\n') : '');
  if (d.notify && Object.keys(arrived).length) { var nt = notifyArrival_(arrived); r.msg += '\n通知:成功 ' + nt.sent + '、無 LINE/Email ' + nt.noLine + '、失敗 ' + nt.failed; }
  return r;
}
/** 勾選的已到貨品項(還沒建立出貨單)重新發 LINE/Email 到貨通知(每張訂單一則) */
function adminArrivalRenotify(tk, keys) {
  var u = me_(tk), arrived = {}, n = 0, skip = 0;
  pickPurchase_(keys).forEach(function (l) {
    if ((l._sh || '訂單明細') !== '訂單明細' || String(l.到貨狀態) !== '已到貨' || l.出貨單ID) { skip++; return; }
    (arrived[String(l.訂單ID)] = arrived[String(l.訂單ID)] || []).push(String(l.品名)); n++;
  });
  if (!n) throw new Error('勾選的品項中沒有「已到貨、還沒建立出貨單」的客人訂單');
  var nt = notifyArrival_(arrived);
  log_(u.acc, '發送到貨通知', '', Object.keys(arrived).length + ' 張訂單(' + n + ' 個品項):成功 ' + nt.sent + '、無 LINE/Email ' + nt.noLine + '、失敗 ' + nt.failed);
  var r = purchaseList_();
  r.msg = '到貨通知:' + Object.keys(arrived).length + ' 張訂單\n成功 ' + nt.sent + '、沒有 LINE/Email ' + nt.noLine + '、失敗 ' + nt.failed + (skip ? '\n(略過 ' + skip + ' 項:不是已到貨的客人品項或已建立出貨單)' : '');
  return r;
}
/** 湊成一筆總額付給同一家廠商:記錄日期、金額、匯款備註,並標記這些品項已付款 */
function adminRecordPayment(tk, keys, d) {
  var u = me_(tk), pid = '';
  d = d || {};
  lk_(function () {
    var date = String(d.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('請選擇付款日期');
    var amt = Number(d.amount);
    if (!(amt > 0)) throw new Error('請填寫付款金額');
    var lines = pickPurchase_(keys), lm = lineMeta_(true), vend = {}, expect = 0, noCost = 0;
    lines.forEach(function (l) {
      if (l.廠商付款ID) throw new Error('「' + l.品名 + '」(' + l.訂單ID + ')已記錄付款 ' + l.廠商付款ID);
      var m = lm(l); vend[m.vendor] = 1;
      if (m.cost === '') noCost++; else expect += m.cost * Number(l.數量);
    });
    var vs = Object.keys(vend);
    if (vs.length !== 1 || !vs[0]) throw new Error(vs.length > 1 ? '一筆付款只能對同一家廠商,目前勾選了:' + vs.join('、') : '勾選的品項還沒有填廠商,請先用「批次修改成本/廠商/貨源」補上');
    pid = seq_('廠商付款', 'V');
    var items = lines.map(function (l) { return (l._sh === '庫存進貨' ? '【庫存】' : l.訂單ID + ' ') + l.品名 + (l.規格 ? '(' + l.規格 + ')' : '') + '×' + l.數量; }).join(';');
    put_('廠商付款', 0, { '付款ID': pid, '付款日期': date, '廠商': vs[0], '金額': amt, '匯款備註': t_(d.note, 300), '品項數': lines.length, '應付成本': expect, '品項': items, '建立人': u.acc, '建立時間': now_(), '圖片': imgList_([].concat(d.imgs || []).join('|')) });
    lines.forEach(function (l) { var n = cp_(l); n.廠商付款ID = pid; put_(l._sh || '訂單明細', l._r, n); log_(u.acc, '廠商付款', String(l.訂單ID) + ' ' + l.品名, '記錄付款 ' + pid + '(' + vs[0] + ',付款日 ' + date + ')'); });
    log_(u.acc, '記錄廠商付款', pid, vs[0] + ',金額 ' + amt + '(品項成本合計 ' + expect + (noCost ? ',' + noCost + ' 筆沒填成本' : '') + '),' + lines.length + ' 項;備註:' + t_(d.note, 300));
  });
  var r = purchaseList_(); r.msg = '已記錄付款 ' + pid; return r;
}
function adminUpdatePayment(tk, pid, d) {
  var u = me_(tk); d = d || {};
  lk_(function () {
    var p = rows_('廠商付款').filter(function (x) { return String(x.付款ID) === pid; })[0];
    if (!p) throw new Error('找不到付款紀錄');
    var date = String(d.date || ''), amt = Number(d.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('付款日期格式不正確');
    if (!(amt > 0)) throw new Error('請填寫付款金額');
    var n = cp_(p); n.付款日期 = date; n.金額 = amt; n.匯款備註 = t_(d.note, 300);
    if (d.imgs) n.圖片 = imgList_([].concat(d.imgs).join('|'), 8);
    put_('廠商付款', p._r, n);
    log_(u.acc, '修改廠商付款', pid, diff_(p, n));
  });
  return purchaseList_();
}
function adminDeletePayment(tk, pid) {
  var u = me_(tk);
  lk_(function () {
    var p = rows_('廠商付款').filter(function (x) { return String(x.付款ID) === pid; })[0];
    if (!p) throw new Error('找不到付款紀錄');
    allPurch_().forEach(function (l) { if (String(l.廠商付款ID) === pid) { var n = cp_(l); n.廠商付款ID = ''; put_(l._sh, l._r, n); log_(u.acc, '廠商付款', String(l.訂單ID) + ' ' + l.品名, '刪除付款 ' + pid + ',回復未付款'); } });
    sh_('廠商付款').deleteRow(p._r);
    log_(u.acc, '刪除廠商付款', pid, p.廠商 + ',金額 ' + p.金額 + ',' + p.品項數 + ' 項已回復為未付款');
  });
  return purchaseList_();
}

/* ---------- 庫存表 ---------- */
/** 每個商品的庫存、客訂待到貨、庫存進貨待到貨;以及庫存進貨紀錄 */
function stockView_() {
  var inn = {}; rows_('商品_內部').forEach(function (r) { inn[String(r.商品ID)] = r; });
  var wait = {}, inb = {};
  rows_('訂單明細').forEach(function (l) { if (l.到貨狀態 === '待到貨') wait[bp_(l.商品ID)] = (wait[bp_(l.商品ID)] || 0) + Number(l.數量); });
  rows_('庫存進貨').forEach(function (l) { if (l.到貨狀態 === '待到貨') inb[String(l.商品ID)] = (inb[String(l.商品ID)] || 0) + Number(l.數量); });
  var rdy = rdyAll_();
  var products = rows_('商品').map(function (p) {
    var id = String(p.商品ID), i = inn[id] || {};
    return { id: id, name: String(p.名稱), type: String(p.銷售型態), on: p.上架 === 'Y', stock: p.數量 === '' ? '' : Number(p.數量), ready: rdyIs_(p) ? (rdy[id] || null) : null, specs: specs_(p), waitOrders: wait[id] || 0, waitStock: inb[id] || 0,
      vendor: String(i.廠商 || ''), cost: (i.成本 === undefined || i.成本 === '') ? '' : Number(i.成本), tax: i.成本含稅 === 'Y', src: String(i.貨源 || '') };
  });
  var ins = rows_('庫存進貨').reverse().map(function (l) {
    return { id: String(l.訂單ID), pid: String(l.商品ID), name: String(l.品名), spec: String(l.規格 || ''), qty: Number(l.數量), arr: String(l.到貨狀態), vendor: String(l.廠商 || ''), cost: l.成本 === '' ? '' : Number(l.成本), at: String(l.日期), by: String(l.建立人 || ''), pay: String(l.廠商付款ID || '') };
  });
  return { products: products, ins: ins, vlist: vendors_() };
}
function adminStockView(tk) { me_(tk); return stockView_(); }
/** 新增一筆「庫存進貨」:跟客訂分開記錄,可和訂單明細一起勾選做廠商付款;改成已到貨時才會加進商品庫存 */
function adminAddStockIn(tk, d) {
  var u = me_(tk), km = ''; d = d || {};
  lk_(function () {
    var p = rows_('商品').filter(function (x) { return String(x.商品ID) === String(d.pid); })[0];
    if (!p) throw new Error('請選擇商品');
    var qty = Math.floor(Number(d.qty));
    if (!(qty >= 1 && qty <= 99999)) throw new Error('進貨數量不正確');
    var cost = (d.cost === '' || d.cost == null) ? '' : Number(d.cost);
    if (cost !== '' && !(cost >= 0)) throw new Error('成本不正確');
    var sp = t_(d.spec, 60), sl = specs_(p);
    if (sl.length && sl.indexOf(sp) < 0) throw new Error('請選擇規格');
    if (!sl.length) sp = '';
    var inn = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === String(p.商品ID); })[0] || {};
    var id = seq_('庫存進貨', 'K'), arrived = !!d.arrived;
    var row = { '訂單ID': id, '商品ID': String(p.商品ID), '品名': String(p.名稱), '規格': sp, '數量': qty, '到貨狀態': arrived ? '已到貨' : '待到貨',
      '廠商': t_(d.vendor, 60) || String(inn.廠商 || ''), '成本': cost === '' ? (inn.成本 === undefined ? '' : inn.成本) : cost, '成本含稅': d.tax === 'Y' ? 'Y' : (d.tax === 'N' ? 'N' : (inn.成本含稅 || 'N')), '貨源': t_(d.src, 60) || String(inn.貨源 || ''),
      '廠商付款ID': '', '到貨操作人': arrived ? u.acc : '', '到貨時間': arrived ? now_() : '', '日期': today_(), '建立人': u.acc, '出貨單ID': '' };
    put_('庫存進貨', 0, row);
    log_(u.acc, '新增庫存進貨', id + ' ' + p.名稱, qty + ' 件' + (sp ? ',規格 ' + sp : '') + (arrived ? ',已到貨' : ''));
    if (arrived) km = kFifo_(id, u.acc);
  });
  var r = stockView_(); if (km) r.msg = km;
  return r;
}
/** 庫存進貨 kid 剛變成「已到貨」:先照下單先後分給在等這個商品(同規格)的訂單並通知客人,剩下的才加進現貨。
   全部分完就刪掉這筆庫存進貨;分掉一部分就把數量改成剩下的。回傳說明文字(沒有人在等回 '') */
function kFifo_(kid, who) {
  var k = rows_('庫存進貨').filter(function (x) { return String(x.訂單ID) === String(kid); })[0];
  if (!k) return '';
  var q = Number(k.數量), o = { auto: true, head: '庫存轉給在等的訂單' };
  arrPlan_([{ pid: String(k.商品ID), spec: String(k.規格 || ''), qty: q, price: k.成本 }], o);
  var pl = o.plan, used = 0;
  var us = pl && pl.surplus.filter(function (x) { return x.unsure; })[0];
  if (us) { // 可能有人在等但寫法不同、不確定:先不分也不上現貨,維持待到貨,請老闆確認
    var nk = cp_(k); nk.到貨狀態 = '待到貨'; nk.可出貨 = 'N'; nk.到貨操作人 = ''; nk.到貨時間 = ''; put_('庫存進貨', k._r, nk);
    log_(who, '庫存待確認', kid + ' ' + k.品名, '可能有訂單在等(寫法不同,不確定),維持待到貨:' + us.unsure.join('、'));
    return '❓ ' + k.品名 + (k.規格 ? '(' + k.規格 + ')' : '') + ' 可能有訂單在等,但商品或規格寫法不同、不確定是不是同一個,所以先維持「待到貨」,沒有分給訂單也沒有上現貨:\n・' + us.unsure.join('\n・') + '\n請確認後再處理(要分給哪張訂單或確定上現貨,可以跟我說)。';
  }
  if (pl && pl.assign.length) pl.assign.forEach(function (a) { used += Number(a.qty); });
  if (!used) { stockMove_(k, q); return ''; }
  var t = arrApply_([{ assign: pl.assign, surplus: [], skip: [], unk: [], cb: [], cost: {} }], '庫存進貨 ' + kid + ' 照下單順序分給在等的訂單', who);
  var left = q - used;
  k = rows_('庫存進貨').filter(function (x) { return String(x.訂單ID) === String(kid); })[0];
  if (left > 0) { var n = cp_(k); n.數量 = left; put_('庫存進貨', k._r, n); stockMove_(n, left); }
  else { sh_('庫存進貨').deleteRow(k._r); cbUnlinkK_(String(kid)); }
  log_(who, '庫存分給訂單', kid + ' ' + k.品名, '照下單順序分給在等的訂單 ' + used + ' 件' + (left > 0 ? ',剩 ' + left + ' 件加進現貨' : ',全部分完(這筆庫存進貨已移除)'));
  return '📦 ' + k.品名 + (k.規格 ? '(' + k.規格 + ')' : '') + ' 有訂單在等,已照下單順序先分給訂單 ' + used + ' 件' + (left > 0 ? ',剩 ' + left + ' 件加進現貨' : '') + '\n' + pl.assign.map(function (a) { return '・' + a.oid + ' ' + a.who + ' ×' + a.qty; }).join('\n') + '\n' + t;
}
function deleteStockIn_(u, id) {
  var l = rows_('庫存進貨').filter(function (x) { return String(x.訂單ID) === String(id); })[0];
  if (!l) throw new Error('找不到庫存進貨 ' + id);
  if (l.廠商付款ID) throw new Error(id + ' 已記錄廠商付款 ' + l.廠商付款ID + ',請先到「廠商付款紀錄」刪除付款');
  if (l.到貨狀態 === '已到貨') stockMove_(l, -Number(l.數量));
  var snap = cp_(l);
  sh_('庫存進貨').deleteRow(l._r);
  cbUnlinkK_(String(id));
  var sm = l.品名 + ' ' + l.數量 + ' 件' + (l.到貨狀態 === '已到貨' ? '(已從庫存扣回)' : '');
  log_(u.acc, '刪除庫存進貨', id, sm);
  major_(u.acc, '刪除庫存進貨', id, sm, snap);
}
function adminDeleteStockIn(tk, id) {
  var u = me_(tk);
  lk_(function () { deleteStockIn_(u, id); });
  return stockView_();
}
/** 訂單明細批次刪除:庫存進貨列直接刪;客訂品項會刪掉整張訂單(含該訂單其他品項) */
function adminBatchDeleteLines(tk, keys) {
  var u = me_(tk), done = 0, skip = [], orders = {}, stocks = {}; DELHELD_ = null;
  (keys || []).slice(0, 500).forEach(function (k) { var oid = String(k).split('|')[0]; if (/^K/.test(oid) && !orders[oid]) stocks[oid] = 1; else orders[oid] = 1; });
  lk_(function () {
    Object.keys(stocks).forEach(function (id) { try { deleteStockIn_(u, id); done++; } catch (e) { skip.push(e.message); } });
    Object.keys(orders).forEach(function (oid) { try { deleteOrder_(u, oid); done++; } catch (e) { skip.push(e.message); } });
  });
  var r = purchaseList_(); r.msg = '已刪除 ' + done + ' 筆(庫存進貨或整張訂單)' + (skip.length ? ',略過 ' + skip.length + ' 筆:\n' + skip.join('\n') : '') + heldMsg_();
  return r;
}

/* ---------- 報表 ---------- */
/** 以訂單明細為基礎統計:訂購日期、出貨日期、結帳狀態(出貨單狀態)、付款方式、關鍵字 */
function adminReport(tk, f) {
  me_(tk); f = f || {};
  var ords = {}, ships = {};
  rows_('訂單').forEach(function (o) { ords[String(o.訂單ID)] = o; });
  rows_('出貨單').forEach(function (s) { ships[String(s.出貨單ID)] = s; });
  // 營收 = 訂單金額(商品小計扣掉優惠折抵);優惠依各品項小計比例分攤,尾數補在第一個品項
  var dsc = {}, byO = {};
  rows_('訂單明細').forEach(function (l) { (byO[String(l.訂單ID)] = byO[String(l.訂單ID)] || []).push(l); });
  Object.keys(byO).forEach(function (oid) {
    var o = ords[oid]; if (!o) return;
    var d = Math.max(0, Number(o.優惠折抵) || 0), tot = byO[oid].reduce(function (t, l) { return t + Number(l.小計); }, 0), used = 0;
    if (d > tot) d = tot;
    byO[oid].forEach(function (l, i) { var x = tot > 0 ? Math.round(d * Number(l.小計) / tot) : 0; dsc[l._r] = x; used += x; });
    if (byO[oid].length) dsc[byO[oid][0]._r] += d - used;
  });
  var lm = lineMeta_(true), q = String(f.q || '').toLowerCase(), sum = { revenue: 0, cost: 0, profit: 0, qty: 0, orders: 0, ships: 0, noCost: 0, lines: 0 }, os = {}, ss = {}, prod = {}, status = {};
  rows_('訂單明細').forEach(function (l) {
    var o = ords[String(l.訂單ID)]; if (!o) return;
    var od = String(o.下單時間).slice(0, 10), s = l.出貨單ID ? ships[String(l.出貨單ID)] : null;
    if (f.oFrom && od < f.oFrom) return; if (f.oTo && od > f.oTo) return;
    var sd = s ? String(s.出貨時間 || '').slice(0, 10) : '';
    if ((f.sFrom || f.sTo) && !sd) return;
    if (f.sFrom && sd < f.sFrom) return; if (f.sTo && sd > f.sTo) return;
    var st = s ? String(s.狀態) : '尚未建立出貨單';
    if (f.status && f.status !== st) return;
    if (f.pay && (!s || String(s.付款方式) !== f.pay)) return;
    if (q && (String(l.訂單ID) + o.姓名 + l.品名 + (l.規格 || '')).toLowerCase().indexOf(q) < 0) return;
    var m = lm(l), qty = Number(l.數量), rev = Number(l.小計) - (dsc[l._r] || 0), has = m.cost !== '';
    sum.lines++; sum.qty += qty; sum.revenue += rev; os[String(l.訂單ID)] = 1;
    if (has) { sum.cost += m.cost * qty; sum.profit += rev - m.cost * qty; } else sum.noCost++;
    var k = String(l.品名) + (l.規格 ? '(' + l.規格 + ')' : ''), pr = prod[k] = prod[k] || { name: k, qty: 0, revenue: 0, cost: 0, profit: 0 };
    pr.qty += qty; pr.revenue += rev; if (has) { pr.cost += m.cost * qty; pr.profit += rev - m.cost * qty; }
    status[st] = (status[st] || 0) + 1;
  });
  sum.orders = Object.keys(os).length;
  // 出貨統計:依「出貨時間」(狀態改成已出貨的那天)落在期間內的出貨單;有填出貨日期就用出貨日期,否則用上方的日期區間
  var a0 = (f.sFrom || f.sTo) ? f.sFrom : f.oFrom, a1 = (f.sFrom || f.sTo) ? f.sTo : f.oTo, lnBy = {};
  rows_('訂單明細').forEach(function (l) { if (l.出貨單ID) (lnBy[String(l.出貨單ID)] = lnBy[String(l.出貨單ID)] || []).push(l); });
  sum.ships = 0; sum.shipRev = 0; sum.shipCost = 0; sum.shipProfit = 0; sum.shipNoCost = 0; sum.shipFee = 0;
  Object.keys(ships).forEach(function (sid) {
    var s = ships[sid], sd = String(s.出貨時間 || '').slice(0, 10);
    if (!sd || (a0 && sd < a0) || (a1 && sd > a1)) return;
    if ((FLOW[s.付款方式] || []).indexOf(String(s.狀態)) < si_(s.付款方式) || String(s.狀態) === '已退回') return;
    if (f.pay && String(s.付款方式) !== f.pay) return;
    if (q && (sid + s.姓名 + (s.品項 || '')).toLowerCase().indexOf(q) < 0) return;
    var rev = (Number(s.商品金額) || 0) - (Number(s.優惠折抵) || 0), cost = 0, miss = 0;
    (lnBy[sid] || []).forEach(function (l) { var m = lm(l); if (m.cost === '') miss++; else cost += m.cost * Number(l.數量); });
    sum.ships++; sum.shipRev += rev; sum.shipCost += cost; sum.shipProfit += rev - cost; sum.shipNoCost += miss; sum.shipFee += Number(s.運費) || 0;
  });
  var statuses = ['尚未建立出貨單']; Object.keys(FLOW).forEach(function (k) { FLOW[k].forEach(function (x) { if (statuses.indexOf(x) < 0) statuses.push(x); }); });
  return { sum: sum, prods: Object.keys(prod).map(function (k) { return prod[k]; }).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 200), statuses: statuses };
}

/* ---------- 第三階段:訂單與出貨管理 ---------- */
var FLOW = {
  '刷卡': ['待刷卡', '已刷卡待出貨', '可自取', '已出貨'],
  '匯款': ['待匯款', '已匯款待查帳', '已查帳待出貨', '可自取', '已出貨'],
  '賣貨便': ['待出貨', '已出貨', '已退回'],
  '付現金': ['待自取通知', '可自取', '已自取付款']
};
/** 出貨單沒填物流時的預設:賣貨便 → 7-11;宅配 → 新竹物流 */
/** 出貨單的分筆匯款明細(JSON [[金額,後五碼,日期],...]) */
function rparts_(v) { try { var a = JSON.parse(String(v || '') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function defCo_(pay, method) { return pay === '賣貨便' ? '7-11' : method === '宅配' ? '新竹物流' : ''; }
function lk_(fn) { var L = LockService.getScriptLock(); L.waitLock(20000); try { return fn(); } finally { L.releaseLock(); } }
function ri_(pay) { return (pay === '賣貨便' || pay === '付現金') ? 0 : pay === '匯款' ? 2 : 1; }   // 可出貨的狀態位置
function si_(pay) { return pay === '賣貨便' ? 1 : pay === '付現金' ? 2 : pay === '匯款' ? 4 : 3; }   // 已出貨的狀態位置
function paidOk_(o) { var f = FLOW[o.付款方式]; return !!f && f.indexOf(o.狀態) >= ri_(o.付款方式); }
/** 已到貨的品項自動視為已叫貨(叫貨人/時間已有就保留) */
function ordOk_(n, who) {
  if (String(n.叫貨狀態 || '') !== '已叫貨') { n.叫貨狀態 = '已叫貨'; n.叫貨人 = who || '系統'; n.叫貨時間 = now_(); }
  return n;
}
function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function cp_(o) { var n = {}; Object.keys(o).forEach(function (k) { n[k] = o[k]; }); return n; }
function ord_(oid) {
  var o = rows_('訂單').filter(function (x) { return String(x.訂單ID) === String(oid); })[0];
  if (!o) throw new Error('找不到訂單 ' + oid);
  return o;
}
function seq_(sheet, prefix) {
  var d = Utilities.formatDate(new Date(), TZ, 'yyMMdd'), key = prefix + d;
  var n = 0;
  rows_(sheet).forEach(function (r) { var id = String(r[H[sheet][0]]); if (id.indexOf(key) === 0) n = Math.max(n, Number(id.slice(key.length)) || 0); });
  return key + ('000' + (n + 1)).slice(-3);
}

function adminOrders(tk) {
  me_(tk);
  var items = {}, sh = {}, lm = lineMeta_(true);
  var bal = {}, td = today_(); rows_('購物金').forEach(function (g) { var l = String(g['LINE ID'] || ''); if (l && Number(g.剩餘) > 0 && String(g.到期日) >= td) bal[l] = (bal[l] || 0) + Number(g.剩餘); });
  rows_('出貨單').forEach(function (r) { var o = sh[String(r.出貨單ID)] = shipObj_(r); o.lid = String(r['LINE ID'] || ''); o.link = String(r.付款連結 || ''); o.bal = bal[o.lid] || 0; var al = shipAlloc_(r); o.ad = al[0]; o.ac = al[1]; });
  var ofShip = {};
  rows_('訂單明細').forEach(function (r) {
    var m = lm(r);
    (items[r.訂單ID] = items[r.訂單ID] || []).push({ pid: String(r.商品ID), name: r.品名, qty: Number(r.數量), unit: Number(r.單價), sub: Number(r.小計), arr: r.到貨狀態, sid: String(r.出貨單ID || ''), arrAt: String(r.到貨時間 || ''), typ: m.typ, eta: m.eta, vendor: m.vendor, cost: m.cost, tax: m.tax, src: m.src, spec: m.spec, brand: m.brand });
    if (r.出貨單ID && sh[String(r.出貨單ID)]) { var a = ofShip[r.訂單ID] = ofShip[r.訂單ID] || {}; a[String(r.出貨單ID)] = sh[String(r.出貨單ID)]; }
  });
  return { logiLive: logiOn_(),
    flow: FLOW,
    orders: rows_('訂單').reverse().map(function (o) {
      var ss = ofShip[o.訂單ID] ? Object.keys(ofShip[o.訂單ID]).map(function (k) { return ofShip[o.訂單ID][k]; }) : [];
      return { id: String(o.訂單ID), at: String(o.下單時間), name: String(o.姓名), phone: String(o.電話), st: String(o.狀態), sub: Number(o.商品金額), disc: Number(o.優惠折抵 || 0), cred: Number(o.購物金折抵 || 0), total: Number(o.總額),
        lid: String(o['LINE ID'] || ''), note: String(o.備註 || ''), code: String(o.折扣碼 || ''), dname: String(o.優惠名稱 || ''), items: items[o.訂單ID] || [], ships: ss };
    })
  };
}


/** 後台替客人輸入/更換折扣碼,或手動調整優惠折抵金額(已建立出貨單的訂單不能改) */
function adminOrderAdjust(tk, oid, d) {
  var u = me_(tk); d = d || {};
  lk_(function () { ordAdj_(u, oid, d); });
  return adminOrders(tk);
}
/** 後台批次補輸入折扣碼:勾選的品項所屬訂單(可多張)一次套用同一個折扣碼,依各訂單商品金額重算折抵 */
function adminBatchOrderCode(tk, keys, code) {
  var u = me_(tk), c = t_(code, 30), ok = [], skip = [];
  if (!c) throw new Error('請輸入折扣碼');
  var oids = []; (keys || []).slice(0, 500).forEach(function (k) { var o = String(k).split('|')[0]; if (o && !/^K/.test(o) && oids.indexOf(o) < 0) oids.push(o); });
  if (!oids.length) throw new Error('勾選的品項中沒有客人訂單');
  lk_(function () {
    oids.forEach(function (oid) {
      try {
        var o = ord_(oid);
        if (String(o.折扣碼 || '').toLowerCase() === c.toLowerCase()) { skip.push(oid + '(已經是這個折扣碼)'); return; }
        ordAdj_(u, oid, { code: c }); ok.push(oid);
      } catch (e) { skip.push(oid + '(' + String(e && e.message || e) + ')'); }
    });
  });
  var r = purchaseList_();
  r.msg = '折扣碼 ' + c + ':已套用 ' + ok.length + ' 張訂單' + (ok.length ? '\n' + ok.join('、') : '') + (skip.length ? '\n\n略過 ' + skip.length + ' 張:\n' + skip.join('\n') : '');
  return r;
}
function ordAdj_(u, oid, d) {
  (function () {
    var o = ord_(oid);
    if (rows_('訂單明細').some(function (x) { return String(x.訂單ID) === oid && x.出貨單ID; })) throw new Error('此訂單已有品項建立出貨單,不能再調整優惠;請先刪除出貨單');
    var sub = Number(o.商品金額) || 0, n = cp_(o), oldCode = String(o.折扣碼 || ''), newCode = t_(d.code, 30), msg = '';
    if (newCode !== oldCode) {
      if (newCode) {
        var cr = findCode_(newCode); if (!cr) throw new Error('折扣碼「' + newCode + '」不存在、已停用、已用完或不在使用期限內');
        if ((Number(cr.最低消費) || 0) > sub) throw new Error('此折扣碼需商品金額滿 NT$ ' + Number(cr.最低消費) + ' 才能使用(目前 ' + sub + ')');
        var cv = Number(cr.數值), amt = String(cr.類型) === '百分比' ? Math.round(sub * cv / 100) : Math.min(cv, sub);
        n.折扣碼 = String(cr.折扣碼); n.優惠名稱 = '折扣碼 ' + cr.折扣碼; n.優惠折抵 = Math.min(amt, sub);
        codeUsed_(String(cr.折扣碼), 1); msg = '套用折扣碼 ' + cr.折扣碼 + ' 折抵 ' + n.優惠折抵;
      } else { n.折扣碼 = ''; n.優惠名稱 = ''; n.優惠折抵 = 0; msg = '移除折扣碼 ' + oldCode; }
      if (oldCode) codeUsed_(oldCode, -1);
    } else if (d.discount !== undefined && d.discount !== '' && Number(d.discount) !== Number(o.優惠折抵 || 0)) {
      var dv = Math.round(Number(d.discount));
      if (!(dv >= 0)) throw new Error('折扣金額不正確');
      if (dv > sub) throw new Error('折扣金額不能超過商品金額 ' + sub);
      n.優惠折抵 = dv; n.優惠名稱 = dv ? (t_(d.dname, 30) || '手動調整') : ''; msg = '手動調整優惠 ' + (o.優惠折抵 || 0) + '→' + dv;
      if (oldCode) { n.折扣碼 = ''; codeUsed_(oldCode, -1); }
    } else if (d.dname !== undefined && Number(o.優惠折抵 || 0) > 0 && t_(d.dname, 30) && t_(d.dname, 30) !== String(o.優惠名稱 || '')) {
      n.優惠名稱 = t_(d.dname, 30); msg = '修改優惠名稱';
    } else throw new Error('沒有任何變更');
    n.總額 = tot_(sub, n, 0);
    put_('訂單', o._r, n);
    log_(u.acc, '調整訂單優惠', oid, msg + ';合計 ' + o.總額 + '→' + n.總額);
  })();
}
function adminUpdateOrder(tk, oid, d) {
  var u = me_(tk);
  lk_(function () {
    var o = ord_(oid), name = t_(d.name, 40), phone = t_(d.phone, 20);
    if (!name) throw new Error('請填寫姓名');
    var n = cp_(o);
    n.姓名 = name; n.電話 = phone; n.備註 = t_(d.note, 200);
    put_('訂單', o._r, n);
    log_(u.acc, '修改訂單', oid, diff_(o, n));
  });
  return adminOrders(tk);
}

function adminEditLine(tk, oid, pid, qty, unitPrice) { return adminEditLineFull(tk, oid, pid, { qty: qty, unit: unitPrice, keep: true }); }
/** 後台編輯訂單品項:品名、型態、數量、單價、到貨狀態,以及商品層級的到貨日期、廠商、成本、含稅、貨源 */
function adminEditLineFull(tk, oid, pid, d) {
  var u = me_(tk), arrNames = null;
  d = d || {};
  lk_(function () {
    var o = ord_(oid);
    var l = rows_('訂單明細').filter(function (x) { return String(x.訂單ID) === oid && String(x.商品ID) === pid; })[0];
    if (!l) throw new Error('找不到這個品項');
    var q = Math.floor(Number(d.qty)), up = Number(d.unit);
    if (!(q >= 1 && q <= 999)) throw new Error('數量需為 1-999');
    if (!(up >= 0)) throw new Error('單價不正確');
    var name = d.keep ? String(l.品名) : t_(d.name, 80), type = d.keep ? String(l.型態 || '') : String(d.type || l.型態 || '');
    var arr = d.keep ? String(l.到貨狀態) : String(d.arr || l.到貨狀態);
    if (!name) throw new Error('請填寫品名');
    if (type && ['現貨', '預購'].indexOf(type) < 0) throw new Error('型態只能是現貨或預購');
    if (['待到貨', '已到貨', '已出貨'].indexOf(arr) < 0) throw new Error('到貨狀態不正確');
    var shipped = !!l.出貨單ID;
    if (shipped && (q !== Number(l.數量) || up !== Number(l.單價) || arr !== String(l.到貨狀態))) throw new Error('此品項已建立出貨單,數量、單價、到貨狀態需先刪除出貨單才能修改');
    var delta = q - Number(l.數量);
    var p = rows_('商品').filter(function (x) { return String(x.商品ID) === bp_(pid); })[0];
    var oldSp = String(l.規格 || ''), newSp = (!d.keep && d.spec !== undefined) ? t_(d.spec, 60) : oldSp;
    var rdyL = rdyLine_(p, l), toPre = rdyL && type !== '現貨';
    if (rdyL && (delta !== 0 || newSp !== oldSp || toPre)) { // 用現貨出的預購商品品項:先退回現貨,再照新的規格/數量取;改成預購就只退回
      rdyAdd_(String(p.商品ID), oldSp, Number(l.數量), l.成本);
      if (!toPre && rdyTake_(String(p.商品ID), newSp, q) === null) throw new Error('「' + p.名稱 + (newSp ? ' ' + newSp : '') + '」現貨不足,只有 ' + rdyQty_(rdyGet_(String(p.商品ID)), newSp) + ' 件(含這筆原本的)。要讓它變成預購,請把型態改成「預購」');
    } else if (p && rdyIs_(p) && arr === '已到貨' && (delta !== 0 || newSp !== oldSp)) { // 預購商品、已到貨的品項:多加的件數從現貨扣,減少的退回現貨(不動預購名額)
      var id0 = String(p.商品ID), wasIn = String(l.到貨狀態) === '已到貨';
      var noRdy = function (sp) { return new Error('「' + p.名稱 + (sp ? ' ' + sp : '') + '」現貨不足,只剩 ' + rdyQty_(rdyGet_(id0), sp) + ' 件'); };
      if (newSp === oldSp) {
        if (delta > 0 && rdyTake_(id0, oldSp, delta) === null) throw noRdy(oldSp);
        if (delta < 0 && wasIn) rdyAdd_(id0, oldSp, -delta, l.成本);
      } else {
        if (wasIn) rdyAdd_(id0, oldSp, Number(l.數量), l.成本);
        if (rdyTake_(id0, newSp, q) === null) throw noRdy(newSp);
      }
    } else if (p && (delta !== 0 || newSp !== oldSp)) {
      var av = availOf_(p, newSp);
      if (av !== null && newSp === oldSp && delta > 0 && av - delta < 0) throw new Error(rdyIs_(p) ? '預購名額不足,最多還能加 ' + av + ' 件(已到貨的品項會改從現貨扣)' : '商品庫存不足,最多還能加 ' + av + ' 件');
      if (av !== null && newSp !== oldSp && av < q) throw new Error('「' + newSp + '」庫存不足,只剩 ' + av + ' 件');
      adjStock_(p, oldSp, Number(l.數量)); adjStock_(p, newSp, -q);
    }
    var extra = '', newInfo = null;
    if (!d.keep) {
      var cost = (d.cost === '' || d.cost == null) ? '' : Number(d.cost);
      if (cost !== '' && !(cost >= 0)) throw new Error('成本不正確');
      newInfo = { '廠商': t_(d.vendor, 60), '成本': cost, '成本含稅': d.tax ? 'Y' : 'N', '貨源': t_(d.src, 60) };
      var lm0 = lineMeta_(true)(l);
      var chg = String(newInfo.廠商) !== String(lm0.vendor) || String(newInfo.成本) !== String(lm0.cost) || (newInfo.成本含稅 === 'Y') !== !!lm0.tax || String(newInfo.貨源) !== String(lm0.src);
      if (chg && l.廠商付款ID) throw new Error('此品項已記錄廠商付款(' + l.廠商付款ID + '),請先到「進貨付款」刪除該筆付款紀錄,才能改廠商、成本、貨源');
      if (!chg) newInfo = null; else extra += ';廠商/成本/貨源已更新';
      var eta = String(d.eta || '');
      if (eta && !etaOk_(eta)) throw new Error('到貨日期格式不正確(日期、排隊中,或下單後 1~52 週)');
      if (p && eta !== String(p.到貨日期 || '')) { var pn = cp_(p); pn.到貨日期 = eta; put_('商品', p._r, pn); extra += ';到貨日期→' + eta; }
    }
    var n = cp_(l);
    if (!d.keep && d.spec !== undefined) n.規格 = t_(d.spec, 60);
    if (newSp !== oldSp) { // 規格改了:品項代碼(商品ID~規格)也要跟著改,前台、到貨分配、現貨都是看這個
      var base0 = bp_(pid), key = base0 + (newSp ? '~' + newSp : ''), k2 = key, nn = 2;
      var taken = {}; rows_('訂單明細').forEach(function (x) { if (String(x.訂單ID) === oid && x !== l) taken[String(x.商品ID)] = 1; });
      while (taken[k2]) k2 = key + '~' + (nn++);
      n.商品ID = k2; extra += ';規格:' + (oldSp || '無') + '→' + (newSp || '無');
    }
    n.品名 = name; n.型態 = type; n.數量 = q; n.單價 = up; n.小計 = q * up;
    if (newInfo) Object.keys(newInfo).forEach(function (k) { n[k] = newInfo[k]; });
    if (arr !== String(l.到貨狀態)) { n.到貨狀態 = arr; n.可出貨 = arr === '已到貨' ? 'Y' : 'N'; if (arr === '已出貨') ordOk_(n, u.acc); if (arr === '已到貨') { arrNames = [name]; ordOk_(n, u.acc); } n.到貨操作人 = u.acc; n.到貨時間 = now_(); }
    put_('訂單明細', l._r, n);
    if (arr === '已到貨' && String(l.到貨狀態) !== '已到貨') cbPendSettle_([{ pid: n.商品ID, spec: n.規格, qty: n.數量 }], u.acc);
    var sub = 0;
    rows_('訂單明細').forEach(function (x) { if (String(x.訂單ID) === oid) sub += Number(x.小計); });
    var on = cp_(o);
    on.商品金額 = sub; on.總額 = tot_(sub, o, 0);
    put_('訂單', o._r, on);
    log_(u.acc, '修改訂單品項', oid + ' ' + l.品名, '品名:' + l.品名 + '→' + name + ';數量:' + l.數量 + '→' + q + ';單價:' + l.單價 + '→' + up + ';到貨:' + l.到貨狀態 + '→' + arr + extra);
  });
  var res = adminOrders(tk);
  if (arrNames && d.notify) { var m = {}; m[oid] = arrNames; res.notify = notifyArrival_(m); }
  return res;
}

function deleteOrder_(u, oid) {
  var o = ord_(oid);
  var lines = rows_('訂單明細').filter(function (x) { return String(x.訂單ID) === oid; });
  if (lines.some(function (l) { return !!l.出貨單ID; })) throw new Error('訂單 ' + oid + ' 已有商品建立出貨單,請先刪除對應出貨單');
  var snap = { order: cp_(o), lines: lines.map(cp_) };
  var ps = {}; rows_('商品').forEach(function (p) { ps[String(p.商品ID)] = p; });
  var held = [];
  lines.forEach(function (l) {
    var p = ps[bp_(l.商品ID)];
    if (!p) return;
    // 預購商品已經到貨(貨在手上):不加回預購名額,記成「待到貨」的庫存進貨,等老闆確認要不要上現貨
    if (String(l.到貨狀態) === '已到貨' && rdyIs_(p) && !rdyLine_(p, l)) { held.push(holdStock_(p, l, u.acc, '刪除訂單 ' + oid + ' 多出來')); return; }
    lineBack_(p, l, String(l.規格 || ''), Number(l.數量));
  });
  if (held.length) (DELHELD_ = DELHELD_ || []).push.apply(DELHELD_, held);
  refund_(o.購物金明細);
  rows_('購物金').forEach(function (g) { if (String(g.訂單ID) === oid && Number(g.剩餘) > 0) { var gn = cp_(g); gn.剩餘 = 0; put_('購物金', g._r, gn); } });
  var del = { '訂單明細': lines.map(function (x) { return x._r; }), '訂單': [o._r] };
  Object.keys(del).forEach(function (n) {
    del[n].sort(function (a, b) { return b - a; }).forEach(function (r) { sh_(n).deleteRow(r); });
  });
  var sm = o.姓名 + ',' + o.狀態 + ',總額 ' + o.總額 + ';' + lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、');
  log_(u.acc, '刪除訂單', oid, sm);
  major_(u.acc, '刪除訂單', oid, sm, snap);
}
var DELHELD_ = null; // 這次刪除訂單時,已到貨的預購品項轉成待確認的庫存進貨(回報用)
/** 已到貨、沒有訂單要的貨:新增一筆「待到貨」的庫存進貨(不上現貨),等老闆確認後改成已到貨才上架。回傳說明文字 */
function holdStock_(p, l, who, why) {
  var inn = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === String(p.商品ID); })[0] || {}, id = seq_('庫存進貨', 'K'), q = Number(l.數量), sp = String(l.規格 || '');
  put_('庫存進貨', 0, { '訂單ID': id, '商品ID': String(p.商品ID), '品名': String(p.名稱), '規格': sp, '數量': q, '到貨狀態': '待到貨', '廠商': String(l.廠商 || inn.廠商 || ''),
    '成本': l.成本 !== undefined && l.成本 !== '' ? l.成本 : (inn.成本 === undefined ? '' : inn.成本), '成本含稅': l.成本含稅 || inn.成本含稅 || 'N', '貨源': String(l.貨源 || inn.貨源 || ''),
    '廠商付款ID': String(l.廠商付款ID || ''), '到貨操作人': '', '到貨時間': '', '日期': today_(), '建立人': who, '出貨單ID': '' });
  log_(who, '新增庫存進貨', id + ' ' + p.名稱, q + ' 件' + (sp ? ',規格 ' + sp : '') + ',' + why + '(已到貨的貨,待確認是否上現貨)');
  return id + ' ' + p.名稱 + (sp ? '(' + sp + ')' : '') + ' ×' + q;
}
function heldMsg_() {
  var h = DELHELD_ || []; DELHELD_ = null;
  return h.length ? '\n\n已到貨的商品先放進庫存表(待確認,還沒上現貨):\n・' + h.join('\n・') + '\n要上架請到「訂單明細」把這筆【庫存】改成「已到貨」;不要的到「庫存表」刪除。' : '';
}
function adminDeleteOrder(tk, oid) {
  var u = me_(tk); DELHELD_ = null;
  lk_(function () { deleteOrder_(u, String(oid)); });
  var r = adminOrders(tk), hm = heldMsg_(); if (hm) r.msg = '已刪除訂單 ' + oid + hm;
  return r;
}
function adminBatchDeleteOrders(tk, oids) {
  var u = me_(tk), done = 0, skip = []; DELHELD_ = null;
  lk_(function () {
    var seen = {};
    (oids || []).slice(0, 200).forEach(function (x) {
      x = String(x); if (seen[x]) return; seen[x] = 1;
      try { deleteOrder_(u, x); done++; } catch (e) { skip.push(x + ':' + e.message); }
    });
  });
  var r = adminOrders(tk); r.msg = '已刪除 ' + done + ' 張訂單' + (skip.length ? ',略過 ' + skip.length + ' 張:\n' + skip.join('\n') : '') + heldMsg_();
  return r;
}

/** 後台代客建立出貨單 */
function adminCreateShip(tk, items, d) {
  var u = me_(tk); d = d || {};
  if (!PAY[d.pay]) throw new Error('請選擇付款方式');
  if (!t_(d.ship, 200)) throw new Error('請填寫收件資訊');
  lk_(function () {
    var lines = pickLines_(null, items), c = shipCalc_(lines, { pay: d.pay, method: d.method }), o0 = ord_(String(lines[0].訂單ID));
    lines.forEach(function (l) { var ox = ord_(String(l.訂單ID)); if (String(ox['LINE ID'] || '') !== String(o0['LINE ID'] || '') || nz_(ox.電話) !== nz_(o0.電話)) throw new Error('一張出貨單只能合併同一位客人的訂單'); });
    var sid = seq_('出貨單', 'S'), oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': Object.keys(oids).join(','), '狀態': PAY[d.pay], '物流': t_(d.co, 30) || defCo_(d.pay, d.method), '物流單號': t_(d.no, 40), '品項': lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'), '建立時間': now_(), '出貨時間': '',
      'LINE ID': String(o0['LINE ID'] || ''), '姓名': String(o0.姓名), '電話': String(d.phone || o0.電話), '付款方式': d.pay, '收件資訊': t_(d.ship, 200), '備註': t_(d.note, 200), '商品金額': c.sub, '優惠折抵': c.disc, '購物金折抵': c.cred, '運費': c.fee, '總額': c.total,
      '付款連結': '', '匯款後五碼': '', '會員等級': String(o0.會員等級 || ''), '折抵明細': JSON.stringify(c.alloc) });
    lines.forEach(function (l) { var n = cp_(l); n.出貨單ID = sid; put_('訂單明細', l._r, n); });
    log_(u.acc, '建立出貨單', sid, lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'));
    Object.keys(oids).forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
    shipCreatedNotice_(String(o0['LINE ID'] || ''), sid, d.pay === '賣貨便' && !logiOn_(d));
  });
  return adminOrders(tk);
}

function syncOrderStatus_(oid, acc) {
  var o = ord_(oid);
  var lines = rows_('訂單明細').filter(function (l) { return String(l.訂單ID) === oid; });
  var sids = {}; lines.forEach(function (l) { if (l.出貨單ID) sids[String(l.出貨單ID)] = 1; });
  var ships = rows_('出貨單').filter(function (s) { return sids[String(s.出貨單ID)]; });
  var shipped = lines.filter(function (l) { return !!l.出貨單ID || String(l.到貨狀態) === '已出貨'; }).length;
  var to = '已下訂';
  if (shipped > 0 && shipped < lines.length) to = '部分出貨';
  else if (shipped === lines.length && lines.length > 0) {
    var fin = ships.every(function (s) { var f = FLOW[s.付款方式]; return !!f && String(s.狀態) !== '已退回' && f.indexOf(String(s.狀態)) >= si_(s.付款方式); });
    to = fin ? '已完成' : '已全部出貨';
  }
  if (to !== o.狀態) {
    var n = cp_(o); n.狀態 = to; put_('訂單', o._r, n);
    log_(acc, '訂單狀態自動更新', oid, o.狀態 + '→' + to);
  }
}

function adminUpdateShip(tk, sid, d) {
  var u = me_(tk), notice = null;
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
    if (!s) throw new Error('找不到出貨單');
    var payNew = String(s.付款方式), payChanged = false;
    if (d.pay && String(d.pay) !== payNew) {
      if (!PAY[d.pay] || d.pay === '刷卡') throw new Error('付款方式不正確');
      var f0 = FLOW[payNew] || [];
      if (f0.indexOf(String(s.狀態)) !== 0) throw new Error('出貨單已經開始處理(' + s.狀態 + '),不能改付款方式');
      var mNew0 = d.method ? String(d.method) : String(s.配送方式);
      if (d.pay === '付現金' && mNew0 !== '自取') throw new Error('付現金只能用在自取');
      if (d.pay === '賣貨便' && mNew0 !== '店到店') throw new Error('賣貨便只能用在店到店');
      payNew = String(d.pay); payChanged = true; d.st = PAY[payNew];
    }
    var f = FLOW[payNew] || [];
    if (f.indexOf(d.st) < 0) throw new Error('此付款方式沒有「' + d.st + '」這個狀態');
    var fee = Number(d.fee);
    if (d.fee === '' || !(fee >= 0)) throw new Error('運費不正確');
    var ship = t_(d.ship, 200), mNew = String(s.配送方式 || '');
    if (d.method) { // 結構化修改:配送方式+收件人+門市/地址
      var rc = adminRecv_(d); ship = rc.ship; mNew = rc.method;
      if (mNew !== String(s.配送方式 || '') && f.indexOf(d.st) >= si_(payNew) && String(s.配送方式 || '')) throw new Error('已出貨的出貨單不能改配送方式');
      if (payNew === '付現金' && mNew !== '自取') throw new Error('付現金只能用在自取,請先改付款方式');
      if (payNew === '賣貨便' && mNew !== '店到店') throw new Error('賣貨便只能用在店到店,請先改付款方式');
      if (payNew === '賣貨便' && rc.cvs !== '7-11' && !logiOn_()) throw new Error('賣貨便只能寄 7-11');
      if (mNew !== String(s.配送方式 || '') && fee === Number(s.運費)) fee = feeFor_(mNew, payNew, Number(s.商品金額) - Number(s.優惠折抵 || 0)); // 改了配送方式但沒動運費 → 依設定重算
    }
    if (mNew === '自取') fee = 0; // 到店自取一律免運費
    if (!ship) throw new Error('請填寫收件資訊');
    if (String(s.綠界物流ID || '')) { // 已產生綠界物流單:收件資訊、物流單號以綠界為準
      if (ship !== String(s.收件資訊 || '') || mNew !== String(s.配送方式 || '')) throw new Error('這張出貨單已產生綠界物流單號,不能再改收件資訊。要改請先到綠界後台取消該物流單,再按出貨單裡的「清除物流單」後重新產生');
      d.co = String(s.物流 || ''); d.no = String(s.物流單號 || '');
    }
    var link = t_(d.link, 500); if (link && !/^https:\/\//.test(link)) throw new Error('付款連結需以 https:// 開頭');
    var n = cp_(s);
    n.付款方式 = payNew; n.狀態 = d.st; if (payChanged && payNew === '匯款') n.收款帳號 = String(settings_().匯款資訊 || ''); n.物流 = t_(d.co, 30) || defCo_(payNew, mNew); /* 賣貨便只寄 7-11、宅配用新竹物流 */ n.物流單號 = t_(d.no, 40); n.付款連結 = link; if (d.last5 !== undefined) n.匯款後五碼 = t_(d.last5, 5); if (d.rdate !== undefined) { var rd = String(d.rdate || ''); if (rd && !/^\d{4}-\d{2}-\d{2}$/.test(rd)) throw new Error('匯款日期格式不正確'); n.匯款日期 = rd; }
    if (d.rparts !== undefined) { // 分多筆匯款:每筆 [金額, 後五碼, 日期];後五碼/匯款日期欄位用最後一筆
      var rp = (Array.isArray(d.rparts) ? d.rparts : []).slice(0, 10).map(function (x) { var a = Math.round(Number(x && x[0]) || 0), l = t_(x && x[1], 5), dt = String(x && x[2] || ''); if (dt && !/^\d{4}-\d{2}-\d{2}$/.test(dt)) throw new Error('匯款日期格式不正確'); return [a, l, dt]; }).filter(function (x) { return x[0] > 0 || x[1] || x[2]; });
      n.匯款明細 = rp.length ? JSON.stringify(rp) : '';
      if (rp.length) { var lp = rp.slice().sort(function (a, b) { return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0; }).pop(); n.匯款後五碼 = lp[1] || n.匯款後五碼; n.匯款日期 = lp[2] || n.匯款日期; }
    } n.收件資訊 = ship; n.備註 = t_(d.note, 200); n.電話 = t_(d.phone, 20) || s.電話;
    n.配送方式 = mNew; n.收件資訊 = ship;
    n.運費 = fee; n.總額 = Math.max(0, Number(s.商品金額) - Number(s.優惠折抵 || 0) - Number(s.購物金折抵 || 0)) + fee;
    if (d.img !== undefined) { var im = t_(d.img, 500); if (im && !/^https:\/\//.test(im)) throw new Error('出貨單圖片網址不正確'); n.出貨單圖片 = im; }
    var shippedNow = f.indexOf(d.st) >= si_(payNew);
    if (!shippedNow) n.出貨時間 = ''; else if (!s.出貨時間) n.出貨時間 = now_();
    put_('出貨單', s._r, n);
    log_(u.acc, '修改出貨單', sid, diff_(s, n));
    String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
    awardCredits_(sid, u.acc);
    notice = shipNotice_(s, n, f);
    if (payChanged) {
      log_(u.acc, '改付款方式', sid, String(s.付款方式) + '→' + payNew);
      if (payNew === '匯款') {
        var lid0 = String(s['LINE ID'] || ''), txt = String(s.姓名) + ' 您好,出貨單 ' + sid + ' 的付款方式已改為匯款\n應付金額:NT$ ' + n.總額 + '\n' + String(settings_().匯款資訊 || '') + '\n匯款後請到會員中心填寫帳號後五碼:' + appUrl_();
        notice = (notice ? notice + ';' : '') + (lid0 ? (pushLine_(lid0, txt) ? '已用 LINE 通知客人匯款資訊' : 'LINE 通知發送失敗(客人可能未加好友)') : '客人沒有 LINE,請自行告知匯款資訊');
      }
    }
  });
  var res = adminOrders(tk);
  if (notice) res.shipNotify = notice;
  return res;
}

/** 沒收到匯款:通知客人尚未確認到款項,請他用 LINE 聯繫(狀態不變) */
/** 重新推播出貨通知(會先儲存目前的出貨單圖片,通知連圖一起發送) */
function adminShipResend(tk, sid, img) {
  var u = me_(tk), msg = '';
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === String(sid); })[0];
    if (!s) throw new Error('找不到出貨單');
    var f = FLOW[s.付款方式] || [];
    if (f.indexOf(String(s.狀態)) < si_(s.付款方式)) throw new Error('出貨單還沒出貨,不能發送出貨通知');
    var n = cp_(s);
    if (img !== undefined) { var im = t_(img, 500); if (im && !/^https:\/\//.test(im)) throw new Error('出貨單圖片網址不正確'); if (im !== String(s.出貨單圖片 || '')) { n.出貨單圖片 = im; put_('出貨單', s._r, n); } }
    msg = notifyShipped_(n);
    log_(u.acc, '重發出貨通知', String(sid), msg);
  });
  var res = adminOrders(tk); res.msg = msg; return res;
}
/** 訂購單列印後,標記出貨單為已列印 */
function adminShipPrinted(tk, ids) {
  var u = me_(tk), set = {};
  (ids || []).forEach(function (x) { set[String(x)] = 1; });
  lk_(function () {
    rows_('出貨單').forEach(function (s) {
      if (!set[String(s.出貨單ID)]) return;
      var n = cp_(s); n.列印時間 = now_(); put_('出貨單', s._r, n);
    });
  });
  return { ok: true };
}

function adminRemitMissing(tk, sid) {
  var u = me_(tk), msg = '';
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === String(sid); })[0];
    if (!s) throw new Error('找不到出貨單');
    if (s.付款方式 !== '匯款' || ['待匯款', '已匯款待查帳'].indexOf(String(s.狀態)) < 0) throw new Error('只有「待匯款」或「已匯款待查帳」的匯款出貨單可以通知');
    msg = notifyShipped_(s, '未收到匯款通知內容', '尚未確認到匯款');
    log_(u.acc, '通知未收到匯款', String(sid), msg);
  });
  return { ok: true, msg: msg };
}

/** 狀態轉換時的自動通知:變成「已出貨…」發出貨通知;變成最後一個狀態(已送達/已收貨付款)發送達通知 */
function shipNotice_(oldS, n, f) {
  var oi = f.indexOf(String(oldS.狀態)), ni = f.indexOf(String(n.狀態)), si = si_(n.付款方式), out = [];
  var ret = String(n.狀態) === '已退回';
  var pick = String(oldS.狀態) === '可自取' || String(n.配送方式 || '') === '自取';   // 自取的出貨單(含直接改成已自取付款)不發「已出貨」通知
  if (String(n.狀態) === '可自取' && oi !== ni) out.push(notifyShipped_(n, '可自取通知內容', '商品可自取'));
  // 變成已出貨:出貨卡片後面接一則「購物分享回饋」(同一次推播,不多算 LINE 則數);自取完成則單獨發分享訊息
  if (ni >= si && oi < si && !ret && !pick) out.push(notifyShipped_(n, undefined, undefined, false, shareText_()));
  if (ni >= si && oi < si && !ret && pick) shareNotice_(n);
  if (ret && oi !== ni) out.push(notifyShipped_(n, '退回通知內容', '出貨單已退回'));
  if (!ret && ni === f.length - 1 && oi !== ni && si < f.length - 1) out.push(notifyShipped_(n, '送達通知內容', '商品已送達', true));
  return out.filter(function (x) { return x; }).join(';') || null;
}
/** 批次改出貨單狀態(只改狀態;該付款方式沒有此狀態的會略過) */
function adminBatchShipStatus(tk, ids, st) {
  var u = me_(tk), done = 0, skip = [], notes = [];
  lk_(function () {
    var want = {}; (ids || []).slice(0, 300).forEach(function (x) { want[String(x)] = 1; });
    rows_('出貨單').filter(function (x) { return want[String(x.出貨單ID)]; }).forEach(function (s) {
      var f = FLOW[s.付款方式] || [], sid = String(s.出貨單ID);
      if (f.indexOf(st) < 0) { skip.push(sid + '(' + s.付款方式 + '沒有「' + st + '」)'); return; }
      if (String(s.狀態) === st) { skip.push(sid + '(已經是「' + st + '」)'); return; }
      var n = cp_(s); n.狀態 = st;
      if (f.indexOf(st) >= si_(s.付款方式)) { if (!s.出貨時間) n.出貨時間 = now_(); } else n.出貨時間 = '';
      put_('出貨單', s._r, n);
      log_(u.acc, '修改出貨單', sid, diff_(s, n) + '(批次)');
      String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
      awardCredits_(sid, u.acc);
      var nt = shipNotice_(s, n, f); if (nt) notes.push(sid + ':' + nt);
      done++;
    });
  });
  var res = adminOrders(tk);
  res.msg = '已更新 ' + done + ' 張出貨單' + (skip.length ? ',略過 ' + skip.length + ' 張:\n' + skip.join('\n') : '') + (notes.length ? '\n通知:\n' + notes.join('\n') : '');
  return res;
}
function deleteShip_(u, sid) {
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
  if (!s) throw new Error('找不到出貨單 ' + sid);
  var f = FLOW[s.付款方式] || [];
  // 賣貨便「已退回」(客人未取貨、貨已退回,沒有收到款)可以直接刪除,品項回到未出貨讓客人重新申請出貨
  if (!(String(s.狀態) === '已退回' && s.付款方式 === '賣貨便') && f.indexOf(s.狀態) >= si_(s.付款方式)) throw new Error('出貨單 ' + sid + ' 已出貨,無法刪除;如果是客人未取貨退回,請先把狀態改成「已退回」再刪除');
  if (String(s.發票號碼 || '')) throw new Error('出貨單 ' + sid + ' 已開立發票(' + s.發票號碼 + '),不能刪除');
  var snap = { ship: cp_(s), lines: rows_('訂單明細').filter(function (l) { return String(l.出貨單ID) === sid; }).map(cp_) };
  rows_('訂單明細').forEach(function (l) {
    if (String(l.出貨單ID) === sid) { var n = cp_(l); n.出貨單ID = ''; put_('訂單明細', l._r, n); }
  });
  rows_('購物金').forEach(function (g) { if (String(g.訂單ID) === sid && Number(g.剩餘) > 0) { var gn = cp_(g); gn.剩餘 = 0; put_('購物金', g._r, gn); } });
  refund_(s.購物金明細);
  sh_('出貨單').deleteRow(s._r);
  var sm = s.品項 + ',' + s.付款方式 + ',' + s.狀態;
  log_(u.acc, '刪除出貨單', sid, sm);
  major_(u.acc, '刪除出貨單', sid, sm, snap);
  String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
}
function adminDeleteShip(tk, sid) {
  var u = me_(tk);
  lk_(function () { deleteShip_(u, String(sid)); });
  return adminOrders(tk);
}
/* ---------- 電子發票(綠界):實際連線在 server/core.js,這裡只負責整理資料與寫回 ---------- */
var INV_DONE = ['已出貨', '已自取付款'];
/** 整理要開發票的出貨單:只開「已出貨/已自取付款」且還沒開過的;金額=出貨單應付(含運費,已扣優惠與購物金) */
function invPrep_(tk, ids, test) {
  var u = me_(tk);
  ids = (ids || []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!ids.length) throw new Error('請先勾選出貨單');
  if (ids.length > 30) throw new Error('一次最多開 30 張,請分批開立');
  var all = rows_('出貨單'), lines = rows_('訂單明細'), mem = {}, list = [], skip = [];
  rows_('會員').forEach(function (m) { mem[String(m['LINE ID'])] = m; });
  ids.forEach(function (id) {
    var s = all.filter(function (x) { return String(x.出貨單ID) === id; })[0];
    if (!s) { skip.push({ sid: id, why: '找不到出貨單' }); return; }
    if (String(s.發票號碼 || '')) { skip.push({ sid: id, why: '已開過發票 ' + s.發票號碼 }); return; }
    if (INV_DONE.indexOf(String(s.狀態)) < 0) { skip.push({ sid: id, why: '狀態是「' + s.狀態 + '」,要「已出貨」才能開' }); return; }
    var total = Math.round(Number(s.總額) || 0), fee = Math.round(Number(s.運費) || 0);
    if (total <= 0) { skip.push({ sid: id, why: '應付金額是 0,不用開發票' }); return; }
    var phone = nz_(s.電話), m = mem[String(s['LINE ID'] || '')] || {}, email = String(m.Email || '').trim();
    if (!/^09\d{8}$/.test(phone)) phone = /^09\d{8}$/.test(nz_(m.電話)) ? nz_(m.電話) : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = '';
    if (!phone && !email) { skip.push({ sid: id, why: '沒有手機號碼(09 開頭)或 Email,無法寄發票通知' }); return; }
    if (fee > total) fee = 0;
    var net = total - fee, ls = lines.filter(function (l) { return String(l.出貨單ID) === id; });
    var P = ls.reduce(function (t, l) { return t + Math.max(0, Number(l.小計) || 0); }, 0), items = [];
    if (net > 0) {
      if (!ls.length || P <= 0) items.push({ name: '商品一批', qty: 1, amt: net });
      else {
        var acc = 0, big = 0;
        ls.forEach(function (l, i) {
          var a = Math.round(Math.max(0, Number(l.小計) || 0) * net / P); acc += a;
          var nm = String(l.品名 || '商品') + (String(l.規格 || '') ? ' ' + l.規格 : '');
          items.push({ name: nm, qty: Math.max(1, Math.round(Number(l.數量) || 1)), amt: a });
          if (a > items[big].amt) big = i;
        });
        items[big].amt += net - acc;
        items = items.filter(function (x) { return x.amt > 0; });
      }
    }
    if (fee > 0) items.push({ name: '運費', qty: 1, amt: fee, word: '式' });
    var Items = items.map(function (x, i) {
      var nm = String(x.name).replace(/[|\r\n\t]/g, ' ').slice(0, 80), q = x.qty, pr = x.amt / q;
      if (Math.round(pr) !== pr) { nm = (nm + ' ×' + q).slice(0, 90); q = 1; pr = x.amt; }
      return { ItemSeq: i + 1, ItemName: nm, ItemCount: q, ItemWord: x.word || '件', ItemPrice: pr, ItemTaxType: '1', ItemAmount: x.amt, ItemRemark: '' };
    });
    list.push({ sid: id, data: {
      RelateNumber: test ? (id + 'T' + Date.now().toString(36)).slice(0, 30) : id,
      CustomerID: '', CustomerIdentifier: '', CustomerName: String(s.姓名 || '').slice(0, 30), CustomerAddr: '', CustomerPhone: phone, CustomerEmail: phone ? '' : email,
      ClearanceMark: '', Print: '0', Donation: '0', LoveCode: '', CarrierType: '1', CarrierNum: '', TaxType: '1', SalesAmount: total,
      InvoiceRemark: '出貨單 ' + id, InvType: '07', vat: '1', Items: Items } });
  });
  return { acc: u.acc, list: list, skip: skip };
}
/** 把綠界回傳結果寫回出貨單,回傳最新訂單資料與摘要訊息 */
function invSave_(tk, prep, results, test) {
  var ok = [], bad = [];
  lk_(function () {
    var all = rows_('出貨單');
    results.forEach(function (r) {
      if (!r.ok) { bad.push(r.sid + ':' + r.msg); log_(prep.acc, '發票開立失敗', r.sid, String(r.msg || '')); return; }
      var s = all.filter(function (x) { return String(x.出貨單ID) === r.sid; })[0]; if (!s) return;
      var n = cp_(s); n.發票號碼 = (test ? '測試' : '') + r.no; n.發票日期 = String(r.date || now_()).slice(0, 19); put_('出貨單', s._r, n);
      ok.push(r.sid + ' ' + r.no);
      var lid = String(s['LINE ID'] || '');
      if (!test && lid) {
        var st = settings_(), tpl = String(st.發票開立通知內容 === undefined ? defSet_('發票開立通知內容') : st.發票開立通知內容 || '').trim();
        if (tpl) { var itx = tpl.split('{出貨單號}').join(r.sid).split('{發票號碼}').join(r.no).split('{發票日期}').join(String(r.date || '').slice(0, 10)).split('{金額}').join(String(s.總額)).split('{姓名}').join(String(s.姓名 || '')).split('{連結}').join(appUrl_()); pushLine_(lid, itx, null, invFlex_(s, r, itx)); }
      }
      log_(prep.acc, '開立發票', r.sid, (test ? '(測試環境)' : '') + r.no + ' 隨機碼 ' + (r.rand || '') + ' 金額 ' + s.總額 + (r.recovered ? '(查回先前已開立)' : ''));
    });
  });
  var msg = (test ? '【目前是綠界測試環境,發票不是真的】\n' : '') + '開立成功 ' + ok.length + ' 張' + (ok.length ? ':\n' + ok.join('\n') : '') +
    (bad.length ? '\n\n開立失敗 ' + bad.length + ' 張:\n' + bad.join('\n') : '') +
    (prep.skip.length ? '\n\n略過 ' + prep.skip.length + ' 張:\n' + prep.skip.map(function (x) { return x.sid + ':' + x.why; }).join('\n') : '');
  var r = adminOrders(tk); r.msg = msg; return r;
}
/** 出貨單裡「訂單層級」分攤過來的優惠與購物金(建立時就決定,後台改價不動這部分) */
function shipAlloc_(s) {
  var a = {}; try { a = JSON.parse(s.折抵明細 || '{}') || {}; } catch (e) {}
  return Object.keys(a).reduce(function (t, k) { var v = a[k] || [0, 0]; return [t[0] + Number(v[0] || 0), t[1] + Number(v[1] || 0)]; }, [0, 0]);
}
/** 後台調整出貨單金額:購物金折抵(會從客人購物金扣/退)、手動折扣改價(負數=加價);只限尚未付款、未開發票 */
function adminAdjustShip(tk, sid, d) {
  var u = me_(tk), msg = ''; d = d || {}; sid = String(sid || '');
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
    if (!s) throw new Error('找不到出貨單');
    var f = FLOW[s.付款方式] || [];
    if (f.indexOf(String(s.狀態)) !== 0) throw new Error('出貨單已付款或已開始處理(' + s.狀態 + '),不能再改金額');
    if (String(s.發票號碼 || '')) throw new Error('已開立發票,不能改金額');
    var al = shipAlloc_(s), X = Math.round(Number(d.cred)), M = Math.round(Number(d.man));
    if (!(X >= 0) || String(d.cred).trim() === '') throw new Error('購物金折抵請填 0 以上的數字');
    if (isNaN(M) || String(d.man).trim() === '') throw new Error('手動折扣請填數字(不折扣填 0,加價填負數)');
    if (X < al[1]) throw new Error('這張出貨單下單時已分攤 ' + al[1] + ' 元購物金,折抵不能少於這個數字');
    var lid = String(s['LINE ID'] || ''), extra = X - al[1];
    if (extra > 0 && !lid) throw new Error('這位客人沒有用 LINE 登入,沒有購物金可以折抵');
    var sub = Number(s.商品金額) || 0, fee = Number(s.運費) || 0, disc = al[0] + M;
    if (sub - disc - X < 0) throw new Error('折扣加購物金超過商品金額(商品 ' + sub + ')');
    var old = { c: Number(s.購物金折抵) || 0, dsc: Number(s.優惠折抵) || 0, t: Number(s.總額) || 0 };
    refund_(s.購物金明細);
    var det = extra > 0 ? spend_(lid, extra) : {};
    var n = cp_(s); n.購物金折抵 = X; n.購物金明細 = JSON.stringify(det); n.優惠折抵 = disc; n.總額 = Math.max(0, sub - disc - X) + fee;
    put_('出貨單', s._r, n);
    log_(u.acc, '調整出貨單金額', sid, '購物金 ' + old.c + '→' + X + ',優惠/改價 ' + old.dsc + '→' + disc + ',應付 ' + old.t + '→' + n.總額);
    String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
    msg = '出貨單 ' + sid + ' 應付金額 ' + old.t + ' → ' + n.總額;
    if (d.notify && lid && n.總額 !== old.t) {
      var txt = String(s.姓名 || '') + ' 您好,出貨單 ' + sid + ' 的金額已調整\n' + (X ? '購物金折抵:NT$ ' + X + '\n' : '') + (disc > al[0] ? '優惠折扣:NT$ ' + (disc - al[0]) + '\n' : '') + '應付金額:NT$ ' + n.總額 +
        (String(s.付款方式) === '匯款' ? '\n\n' + String(settings_().匯款資訊 || '') + '\n匯款後請到會員專區填寫帳號後五碼:' + appUrl_() : '\n\n可到會員專區查看:' + appUrl_());
      msg += pushLine_(lid, txt) ? '\n已用 LINE 通知客人' : '\nLINE 通知發送失敗';
    }
  });
  var r = adminOrders(tk); r.msg = msg; return r;
}
/** 合併同一位客人的多張出貨單(出貨前、同付款方式、同狀態):品項與金額加總,運費依合併後金額重算,保留最早的那張 */
function adminMergeShips(tk, ids) {
  var u = me_(tk), msg = '';
  lk_(function () {
    ids = (ids || []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (ids.length < 2) throw new Error('請勾選至少兩張出貨單');
    var all = rows_('出貨單'), S = ids.map(function (id) { var s = all.filter(function (x) { return String(x.出貨單ID) === id; })[0]; if (!s) throw new Error('找不到出貨單 ' + id); return s; });
    S.sort(function (a, b) { var x = String(a.建立時間), y = String(b.建立時間); return x < y ? -1 : x > y ? 1 : (String(a.出貨單ID) < String(b.出貨單ID) ? -1 : 1); });
    var t = S[0], who = function (s) { return String(s['LINE ID'] || '') || ('tel:' + nz_(s.電話)); };
    S.forEach(function (s) {
      var id = String(s.出貨單ID), f = FLOW[s.付款方式] || [];
      if (who(s) !== who(t) || who(s) === 'tel:') throw new Error('只能合併同一位客人的出貨單(' + id + ' 是「' + s.姓名 + '」,' + t.出貨單ID + ' 是「' + t.姓名 + '」)');
      if (String(s.付款方式) !== String(t.付款方式)) throw new Error('付款方式不同不能合併(' + t.出貨單ID + ' ' + t.付款方式 + '、' + id + ' ' + s.付款方式 + ')');
      if (String(s.狀態) !== String(t.狀態)) throw new Error('狀態不同不能合併,請先改成相同狀態(' + t.出貨單ID + ' ' + t.狀態 + '、' + id + ' ' + s.狀態 + ')');
      if (f.indexOf(String(s.狀態)) >= si_(s.付款方式) || s.狀態 === '已退回' || s.狀態 === '可自取') throw new Error('出貨單 ' + id + ' 已出貨/可自取/已退回,不能合併');
      if (s.物流單號) throw new Error('出貨單 ' + id + ' 已填物流單號,不能合併');
    });
    var tid = String(t.出貨單ID), others = S.slice(1), oset = {}, oids = [], sub = 0, disc = 0, cred = 0, fee0 = 0, alloc = {}, cdet = {}, notes = [], l5 = [], items = [];
    var J = function (x) { try { return JSON.parse(x || '{}') || {}; } catch (e) { return {}; } };
    S.forEach(function (s) {
      String(s.訂單ID).split(',').forEach(function (o) { o = o.trim(); if (o && !oset[o]) { oset[o] = 1; oids.push(o); } });
      sub += Number(s.商品金額) || 0; disc += Number(s.優惠折抵) || 0; cred += Number(s.購物金折抵) || 0; fee0 += Number(s.運費) || 0;
      var a = J(s.折抵明細); Object.keys(a).forEach(function (k) { var v = a[k] || [0, 0]; alloc[k] = [(alloc[k] ? alloc[k][0] : 0) + Number(v[0] || 0), (alloc[k] ? alloc[k][1] : 0) + Number(v[1] || 0)]; });
      var c = J(s.購物金明細); Object.keys(c).forEach(function (k) { cdet[k] = (cdet[k] || 0) + Number(c[k] || 0); });
      if (String(s.備註 || '').trim()) notes.push(String(s.備註).trim());
      if (String(s.匯款後五碼 || '').trim()) l5.push(String(s.匯款後五碼).trim());
      if (String(s.品項 || '')) items.push(String(s.品項));
    });
    var st = settings_(), free = Number(st.免運門檻) || 0, m = String(t.配送方式 || ''), pay = String(t.付款方式);
    var base = m === '自取' ? 0 : pay === '賣貨便' ? (st.賣貨便運費 === undefined || String(st.賣貨便運費) === '' ? 38 : Number(st.賣貨便運費) || 0) : m === '店到店' ? Number(st.店到店運費) || 0 : m === '宅配' ? Number(st.宅配運費) || 0 : Number(t.運費) || 0;
    var fee = (free > 0 && sub - disc >= free) ? 0 : base, total = Math.max(0, sub - disc - cred) + fee;
    var n = cp_(t);
    n.訂單ID = oids.join(','); n.品項 = items.join('、'); n.商品金額 = sub; n.優惠折抵 = disc; n.購物金折抵 = cred; n.運費 = fee; n.總額 = total;
    n.折抵明細 = JSON.stringify(alloc); n.購物金明細 = JSON.stringify(cdet); n.備註 = notes.join(' / ').slice(0, 500);
    n.匯款後五碼 = l5.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(',');
    if (!n.匯款日期) others.forEach(function (s) { if (!n.匯款日期 && s.匯款日期) n.匯款日期 = s.匯款日期; });
    put_('出貨單', t._r, n);
    var oidSet = {}; others.forEach(function (s) { oidSet[String(s.出貨單ID)] = 1; });
    rows_('訂單明細').forEach(function (l) { if (oidSet[String(l.出貨單ID)]) { var x = cp_(l); x.出貨單ID = tid; put_('訂單明細', l._r, x); } });
    rows_('購物金').forEach(function (g) { if (oidSet[String(g.訂單ID)]) { var x = cp_(g); x.訂單ID = tid; put_('購物金', g._r, x); } });
    others.map(function (s) { return s._r; }).sort(function (a, b) { return b - a; }).forEach(function (r) { sh_('出貨單').deleteRow(r); });
    var mids = others.map(function (s) { return String(s.出貨單ID); });
    var sm = '併入 ' + mids.join('、') + ';商品 ' + sub + '、折抵 ' + (disc + cred) + '、運費 ' + fee0 + '→' + fee + '、應付 ' + total;
    log_(u.acc, '合併出貨單', tid, sm);
    major_(u.acc, '合併出貨單', tid, sm, { ships: S.map(cp_) });
    oids.forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
    msg = '已合併成出貨單 ' + tid + '(併入 ' + mids.join('、') + ')\n應付 ' + total + ',運費 ' + fee + (fee0 !== fee ? '(原本各張運費合計 ' + fee0 + (fee0 > fee && String(t.狀態) !== FLOW[pay][0] ? ',客人已付的運費多了 ' + (fee0 - fee) + ',請另外處理' : '') + ')' : '');
  });
  var r = adminOrders(tk); r.msg = msg; return r;
}
/* ---------- 支出 / 月結(月結僅老闆帳號可看,名單存在伺服器設定 BOSS_ACCOUNTS) ---------- */
function isBoss_(acc) { return String(prop_('BOSS_ACCOUNTS') || '').split(/[,\s]+/).filter(String).indexOf(String(acc)) >= 0; }
function boss_(tk) { var u = me_(tk); if (!isBoss_(u.acc)) throw new Error('只有老闆帳號可以查看月結'); return u; }
var EXP_CATS_ = ['進貨運費', '包材耗材', '廣告行銷', '平台手續費', '水電網路', '交通', '餐費', '雜支', '其他'];
function expObj_(r) { return { id: String(r.支出ID), date: String(r.日期), cat: String(r.類別), item: String(r.項目), amt: Number(r.金額) || 0, pay: String(r.付款方式 || ''), note: String(r.備註 || ''), by: String(r.建立人 || ''), at: String(r.建立時間 || '') }; }
function adminExpenses(tk, f) {
  var u = me_(tk); f = f || {};
  var L = rows_('支出').filter(function (r) { var d = String(r.日期); return (!f.from || d >= f.from) && (!f.to || d <= f.to); }).map(expObj_);
  L.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); });
  return { list: L, cats: EXP_CATS_, boss: isBoss_(u.acc) };
}
function adminSaveExpense(tk, d) {
  var u = me_(tk); d = d || {};
  lk_(function () {
    var date = String(d.date || ''), amt = Number(d.amt), item = t_(d.item, 100);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('請選擇日期');
    if (!item) throw new Error('請填寫項目');
    if (!(amt > 0)) throw new Error('請填寫金額');
    var row = { '日期': date, '類別': t_(d.cat, 30), '項目': item, '金額': amt, '付款方式': t_(d.pay, 30), '備註': t_(d.note, 300) };
    if (d.id) {
      var ex = rows_('支出').filter(function (r) { return String(r.支出ID) === String(d.id); })[0]; if (!ex) throw new Error('找不到這筆支出');
      var n = cp_(ex); Object.keys(row).forEach(function (k) { n[k] = row[k]; }); put_('支出', ex._r, n); log_(u.acc, '修改支出', String(d.id), diff_(ex, n));
    } else {
      var id = seq_('支出', 'E'); row.支出ID = id; row.建立人 = u.acc; row.建立時間 = now_(); put_('支出', 0, row);
      log_(u.acc, '新增支出', id, date + ' ' + row.類別 + ' ' + item + ' ' + amt);
    }
  });
  return adminExpenses(tk, { from: d.from, to: d.to });
}
function adminDeleteExpense(tk, id, f) {
  var u = me_(tk);
  lk_(function () {
    var ex = rows_('支出').filter(function (r) { return String(r.支出ID) === String(id); })[0]; if (!ex) throw new Error('找不到這筆支出');
    sh_('支出').deleteRow(ex._r); log_(u.acc, '刪除支出', String(id), ex.日期 + ' ' + ex.項目 + ' ' + ex.金額);
  });
  return adminExpenses(tk, f || {});
}
function staffTotal_(r) { return (Number(r.薪資) || 0) + (Number(r.勞保) || 0) + (Number(r.健保) || 0) + (Number(r.勞退) || 0) + (Number(r.其他) || 0); }
function adminMonthly(tk, ym) {
  boss_(tk);
  ym = /^\d{4}-\d{2}$/.test(String(ym || '')) ? String(ym) : Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  var from = ym + '-01', to = ym + '-31';
  var rep = adminReport(tk, { oFrom: from, oTo: to }).sum;
  var ex = rows_('支出').filter(function (r) { var d = String(r.日期); return d >= from && d <= to; }).map(expObj_);
  var byCat = {}; ex.forEach(function (e) { var k = e.cat || '未分類'; byCat[k] = (byCat[k] || 0) + e.amt; });
  var fixed = rows_('固定支出').map(function (r) { return { id: String(r.固定ID), name: String(r.名稱), amt: Number(r.金額) || 0, note: String(r.備註 || ''), on: String(r.啟用) !== 'N' }; });
  var staff = rows_('人事').map(function (r) { return { id: String(r.人員ID), name: String(r.姓名), salary: Number(r.薪資) || 0, labor: Number(r.勞保) || 0, health: Number(r.健保) || 0, pension: Number(r.勞退) || 0, other: Number(r.其他) || 0, total: staffTotal_(r), note: String(r.備註 || ''), on: String(r.啟用) !== 'N' }; });
  var sumEx = ex.reduce(function (a, e) { return a + e.amt; }, 0), sumFix = fixed.reduce(function (a, x) { return a + (x.on ? x.amt : 0); }, 0), sumStaff = staff.reduce(function (a, x) { return a + (x.on ? x.total : 0); }, 0);
  return { ym: ym, revenue: rep.revenue, cost: rep.cost, gross: rep.revenue - rep.cost, noCost: rep.noCost, orders: rep.orders,
    expense: sumEx, byCat: byCat, fixed: fixed, sumFixed: sumFix, staff: staff, sumStaff: sumStaff, net: rep.revenue - rep.cost - sumEx - sumFix - sumStaff };
}
function adminSaveFixed(tk, d, ym) {
  var u = boss_(tk); d = d || {};
  lk_(function () {
    var name = t_(d.name, 60), amt = Number(d.amt);
    if (!name) throw new Error('請填寫名稱'); if (!(amt >= 0)) throw new Error('金額不正確');
    var row = { '名稱': name, '金額': amt, '備註': t_(d.note, 200), '啟用': d.on === false ? 'N' : 'Y' };
    var ex = d.id ? rows_('固定支出').filter(function (r) { return String(r.固定ID) === String(d.id); })[0] : null;
    if (ex) { var n = cp_(ex); Object.keys(row).forEach(function (k) { n[k] = row[k]; }); put_('固定支出', ex._r, n); log_(u.acc, '修改固定支出', String(d.id), diff_(ex, n)); }
    else { row.固定ID = seq_('固定支出', 'F'); put_('固定支出', 0, row); log_(u.acc, '新增固定支出', row.固定ID, name + ' ' + amt); }
  });
  return adminMonthly(tk, ym);
}
function adminSaveStaff(tk, d, ym) {
  var u = boss_(tk); d = d || {};
  lk_(function () {
    var name = t_(d.name, 30); if (!name) throw new Error('請填寫姓名');
    var row = { '姓名': name, '備註': t_(d.note, 200), '啟用': d.on === false ? 'N' : 'Y' };
    [['salary', '薪資'], ['labor', '勞保'], ['health', '健保'], ['pension', '勞退'], ['other', '其他']].forEach(function (k) { var v = Number(d[k[0]] || 0); if (!(v >= 0)) throw new Error(k[1] + '金額不正確'); row[k[1]] = v; });
    var ex = d.id ? rows_('人事').filter(function (r) { return String(r.人員ID) === String(d.id); })[0] : null;
    if (ex) { var n = cp_(ex); Object.keys(row).forEach(function (k) { n[k] = row[k]; }); put_('人事', ex._r, n); log_(u.acc, '修改人事支出', String(d.id), name); }
    else { row.人員ID = seq_('人事', 'H'); put_('人事', 0, row); log_(u.acc, '新增人事支出', row.人員ID, name); }
  });
  return adminMonthly(tk, ym);
}
function adminDeleteMonthlyItem(tk, kind, id, ym) {
  var u = boss_(tk), sh = kind === 'staff' ? '人事' : '固定支出', key = kind === 'staff' ? '人員ID' : '固定ID';
  lk_(function () {
    var ex = rows_(sh).filter(function (r) { return String(r[key]) === String(id); })[0]; if (!ex) throw new Error('找不到資料');
    sh_(sh).deleteRow(ex._r); log_(u.acc, '刪除' + (kind === 'staff' ? '人事支出' : '固定支出'), String(id), String(ex.姓名 || ex.名稱));
  });
  return adminMonthly(tk, ym);
}
function adminBatchDeleteShips(tk, ids) {
  var u = me_(tk), done = 0, skip = [];
  lk_(function () {
    var seen = {};
    (ids || []).slice(0, 200).forEach(function (x) {
      x = String(x); if (seen[x]) return; seen[x] = 1;
      try { deleteShip_(u, x); done++; } catch (e) { skip.push(e.message); }
    });
  });
  var r = adminOrders(tk); r.msg = '已刪除 ' + done + ' 張出貨單' + (skip.length ? ',略過 ' + skip.length + ' 張:\n' + skip.join('\n') : '');
  return r;
}
/** 出貨單的狀態時間軸:建立時的狀態,以及每次「更新為…」的日期時間與操作人 */
function adminShipHistory(tk, sid) {
  me_(tk); sid = String(sid);
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
  if (!s) throw new Error('找不到出貨單');
  var ev = [], first = true;
  rows_('操作紀錄').filter(function (r) { return String(r.對象) === sid && (!s.建立時間 || String(r.時間) >= String(s.建立時間).slice(0, 19)); }).forEach(function (r) {
    var at = String(r.時間).slice(0, 16), who = String(r.帳號), act = String(r.動作), note = String(r.內容);
    if (act === '建立出貨單') { ev.push({ at: at, who: who, st: PAY[s.付款方式] || '', text: '', kind: 'st' }); }
    else if (act === '回報匯款') { var m0 = note.match(/後五碼\s*(\S+?),/); ev.push({ at: at, who: who, st: '已匯款待查帳', text: '客人回報匯款' + (m0 ? ',後五碼 ' + m0[1] : ''), kind: 'up' }); }
    else if (act === '刷卡成功' || act === '無卡分期付款成功') {
      // 綠界付款通知:顯示綠界訂單編號、授權碼、付款時間
      var tn = note.match(/綠界(?:訂單編號|交易)\s*(\d+)/), ac = note.match(/授權碼\s*(\S+)/), pd = note.match(/付款時間\s*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/);
      ev.push({ at: at, who: who, st: '已刷卡待出貨', text: (act === '無卡分期付款成功' ? '無卡分期付款成功' : '刷卡成功') + (tn ? ',綠界訂單編號 ' + tn[1] : '') + (ac ? ',授權碼 ' + ac[1] : '') + ',付款時間 ' + (pd ? pd[1] : String(r.時間).slice(0, 19)), kind: 'up' });
    }
    else if (act === '刷卡失敗') ev.push({ at: at, who: who, st: '', text: '刷卡失敗:' + note, kind: 'note' });
    else if (act === '修改出貨單') {
      var m = note.match(/狀態:([^→;]*)→([^;(]*)/), rest = note.replace(/狀態:[^;]*;?/, '').replace(/\(批次\)/, '').replace(/^;|;$/g, '').trim();
      if (m) ev.push({ at: at, who: who, st: m[2].trim(), text: '', kind: 'up' });
      if (rest) ev.push({ at: at, who: who, st: '', text: '修改資料:' + rest, kind: 'note' });
    }
  });
  var lastSt = -1; ev.forEach(function (e, i) { if (e.kind === 'st') lastSt = i; });
  ev = ev.filter(function (e, i) { return e.kind !== 'st' || i === lastSt; });
  if (!ev.some(function (e) { return e.kind === 'st'; })) ev.unshift({ at: String(s.建立時間 || '').slice(0, 16), who: '', st: PAY[s.付款方式] || '', text: '', kind: 'st' });
  return { id: sid, st: String(s.狀態), events: ev };
}

/** 批次作業。op: arrive 標示到貨 / info 改廠商成本貨源 / lock 鎖定 / unlock 解鎖 */
function adminBatch(tk, ids, op, d) {
  var u = me_(tk), res = { done: [], skip: [] }, arrived = {};
  d = d || {};
  lk_(function () {
    ids = (ids || []).slice(0, 200).map(String);
    if (!ids.length) throw new Error('請先勾選商品');
    if (['arrive', 'info', 'lock', 'unlock'].indexOf(op) < 0) throw new Error('未知的操作');
    var cost = null;
    if (op === 'info') {
      if (d.cost !== '' && d.cost != null) { cost = Number(d.cost); if (!(cost >= 0)) throw new Error('成本不正確'); }
      if (!t_(d.vendor, 60) && !t_(d.source, 60) && cost === null && ['Y', 'N'].indexOf(d.tax) < 0) throw new Error('請至少填寫一項要修改的內容');
    }
    var ps = {}, inn = {}, lines = op === 'arrive' ? rows_('訂單明細') : [];
    rows_('商品').forEach(function (p) { ps[String(p.商品ID)] = p; });
    rows_('商品_內部').forEach(function (r) { inn[String(r.商品ID)] = r; });
    var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    ids.forEach(function (id) {
      var p = ps[id];
      if (!p) { res.skip.push(id + ' 不存在'); return; }
      var i = inn[id] || { '商品ID': id, '廠商': '', '成本': '', '成本含稅': 'N', '貨源': '', '鎖定': 'N' };
      if (op === 'arrive') {
        p.銷售型態 = '現貨'; p.到貨日期 = today; put_('商品', p._r, p);
        lines.forEach(function (l) {
          if (bp_(l.商品ID) === id && ['已到貨', '已出貨'].indexOf(String(l.到貨狀態)) < 0) {
            var n = cp_(l); n.到貨狀態 = '已到貨'; n.可出貨 = 'Y'; n.到貨操作人 = u.acc; n.到貨時間 = now_(); ordOk_(n, u.acc); put_('訂單明細', l._r, n); l.到貨狀態 = '已到貨';
            log_(u.acc, '到貨', String(l.訂單ID) + ' ' + l.品名, '到貨:' + '待到貨→已到貨(商品批次到貨)'); cbPendSettle_([{ pid: l.商品ID, spec: l.規格, qty: l.數量 }], u.acc);
            (arrived[String(l.訂單ID)] = arrived[String(l.訂單ID)] || []).push(l.品名);
          }
        });
      } else if (op === 'info') {
        if (t_(d.vendor, 60)) i.廠商 = t_(d.vendor, 60);
        if (t_(d.source, 60)) i.貨源 = t_(d.source, 60);
        if (cost !== null) i.成本 = cost;
        if (d.tax === 'Y' || d.tax === 'N') i.成本含稅 = d.tax;
        put_('商品_內部', i._r || 0, i);
      } else {
        i.鎖定 = op === 'lock' ? 'Y' : 'N';
        put_('商品_內部', i._r || 0, i);
      }
      res.done.push(id);
    });
    var label = { arrive: '批次標示到貨', info: '批次修改廠商成本貨源', lock: '批次鎖定', unlock: '批次解鎖' }[op];
    var extra = op === 'info' ? ';內容:' + ['廠商=' + t_(d.vendor, 60), '貨源=' + t_(d.source, 60), '成本=' + (cost === null ? '' : cost), '含稅=' + (d.tax || '')].join(',') : '';
    log_(u.acc, label, res.done.join(','), '共 ' + res.done.length + ' 件' + (res.skip.length ? ';略過:' + res.skip.join('、') : '') + extra);
  });
  if (op === 'arrive' && d.notify) res.notify = notifyArrival_(arrived);
  res.products = adminProducts_();
  return res;
}

/* ---------- 客人申請出貨 ---------- */
/** 客人在訂單明細「結帳並出貨」:第一次結帳時決定付款方式與收件資料,並勾選要出貨的已到貨商品 */
function memberCheckout(tk, oid, pids, d) {
  var ctx = mem_(tk);
  d = d || {};
  lk_(function () {
    var o = rows_('訂單').filter(function (x) { return String(x.訂單ID) === oid && mine_(ctx, x); })[0];
    if (!o) throw new Error('找不到訂單');
    var want = {}; (pids || []).forEach(function (x) { want[String(x)] = 1; });
    var lines = rows_('訂單明細').filter(function (l) { return String(l.訂單ID) === oid && want[String(l.商品ID)] && l.到貨狀態 === '已到貨' && !l.出貨單ID; });
    if (!lines.length) throw new Error('請勾選已到貨的商品');
    if (!o.付款方式) {
      var pay = d.pay, ship = t_(d.ship, 200), phone = t_(d.phone, 20) || String(o.電話 || '');
      if (!PAY[pay]) throw new Error('請選擇付款方式');
      if (!ship) throw new Error('請填寫收件地址或取貨門市');
      if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
      var n = cp_(o); n.付款方式 = pay; n.狀態 = PAY[pay]; n.收件資訊 = ship; n.電話 = phone; n.備註 = t_(d.note, 200);
      put_('訂單', o._r, n);
      log_('客人 ' + o.姓名, '結帳', oid, pay);
    }
    lines.forEach(function (l) { var c = cp_(l); c.申請出貨 = 'Y'; put_('訂單明細', l._r, c); });
    log_('客人 ' + o.姓名, '申請出貨', oid, lines.length + ' 項');
  });
  return memberOrders(tk);
}
/** 把勾選的已到貨品項算出商品金額、折抵、運費、應付(不寫入) */
function shipCalc_(lines, opt) {
  opt = opt || {};
  var by = {}, st = settings_();
  lines.forEach(function (l) { (by[String(l.訂單ID)] = by[String(l.訂單ID)] || []).push(l); });
  var sub = 0, disc = 0, cred = 0, alloc = {};
  Object.keys(by).forEach(function (oid) {
    var o = ord_(oid), part = by[oid].reduce(function (t, l) { return t + Number(l.小計); }, 0);
    var all = rows_('訂單明細').filter(function (l) { return String(l.訂單ID) === oid; });
    var completes = all.every(function (l) { return !l.出貨單ID ? by[oid].some(function (x) { return x._r === l._r; }) : true; });
    var d0 = Number(o.優惠折抵 || 0), c0 = Number(o.購物金折抵 || 0), d, c;
    if (completes) {
      var pd = 0, pc = 0;
      rows_('出貨單').forEach(function (s) { try { var a = JSON.parse(s.折抵明細 || '{}')[oid]; if (a) { pd += a[0]; pc += a[1]; } } catch (e) {} });
      d = Math.max(0, d0 - pd); c = Math.max(0, c0 - pc);
    } else {
      var share = Number(o.商品金額) > 0 ? part / Number(o.商品金額) : 0;
      d = Math.round(d0 * share); c = Math.round(c0 * share);
    }
    alloc[oid] = [d, c]; sub += part; disc += d; cred += c;
  });
  var free = Number(st.免運門檻) || 0, base = opt.method === '自取' ? 0 : opt.pay === '賣貨便' ? (st.賣貨便運費 === undefined || String(st.賣貨便運費) === '' ? 38 : Number(st.賣貨便運費) || 0) : opt.method === '店到店' ? Number(st.店到店運費) || 0 : Number(st.宅配運費) || 0;
  var fee = (free > 0 && sub - disc >= free) ? 0 : base;
  // 出貨時由客人選擇要用多少購物金(只折商品金額,不折運費)
  var lid = opt.ctx && opt.ctx.lid ? opt.ctx.lid : '', goods = Math.max(0, sub - disc - cred), bal = lid ? balance_(lid) : 0;
  var cr = creditRule_(st, goods), minSpend = cr.min;
  var allowed = lid && cr.ok ? Math.max(0, Math.min(bal, cr.cap, goods)) : 0;
  var want = Math.max(0, Math.floor(Number(opt.credit) || 0)), pick = Math.min(want, allowed);
  return { sub: sub, disc: disc, cred: cred, pick: pick, over: want > allowed, allowed: allowed, balance: bal, minSpend: minSpend, fee: fee, total: Math.max(0, goods - pick) + fee, alloc: alloc };
}
/** 購物金可折抵上限:有設「購物金折抵級距」(例:500=50,1000=150)就照級距,否則用「購物金使用門檻」+「購物金折抵上限」 */
function creditTiers_(st) {
  var v = st.購物金折抵級距 === undefined ? defSet_('購物金折抵級距') : st.購物金折抵級距;
  return String(v || '').split(/[,，\s]+/).map(function (x) { var m = x.match(/^(\d+)=(\d+)$/); return m ? [Number(m[1]), Number(m[2])] : null; }).filter(Boolean).sort(function (a, b) { return a[0] - b[0]; });
}
function creditRule_(st, amount) {
  var t = creditTiers_(st);
  if (t.length) { var c = 0; t.forEach(function (x) { if (amount >= x[0]) c = x[1]; }); return { ok: c > 0, cap: c, min: t[0][0] }; }
  var minSpend = Number(st.購物金使用門檻) || 0, capS = String(st.購物金折抵上限 === undefined ? '' : st.購物金折抵上限).trim();
  return { ok: amount >= minSpend, cap: capS === '' ? Infinity : Number(capS), min: minSpend };
}
function pickLines_(ctx, items) {
  var want = {}; (items || []).forEach(function (i) { want[String(i.oid) + '|' + String(i.pid)] = 1; });
  var mineO = {}; rows_('訂單').forEach(function (o) { if (!ctx || mine_(ctx, o)) mineO[String(o.訂單ID)] = o; });
  var lines = rows_('訂單明細').filter(function (l) { return want[String(l.訂單ID) + '|' + String(l.商品ID)] && mineO[String(l.訂單ID)]; });
  if (!lines.length) throw new Error('請勾選要出貨的商品');
  lines.forEach(function (l) {
    if (l.到貨狀態 !== '已到貨') throw new Error('「' + l.品名 + '」尚未到貨');
    if (l.出貨單ID) throw new Error('「' + l.品名 + '」已在出貨單 ' + l.出貨單ID);
  });
  return lines;
}
function memberShipQuote(tk, items, d) {
  var ctx = mem_(tk); d = d || {};
  try {
    var c = shipCalc_(pickLines_(ctx, items), { method: d.method, pay: d.pay, ctx: ctx, credit: d.credit });
    return { ok: true, sub: c.sub, disc: c.disc, cred: c.cred + c.pick, fee: c.fee, total: c.total, pick: c.pick, allowed: c.allowed, balance: c.balance, minSpend: c.minSpend, login: !!ctx.lid };
  }
  catch (e) { return { ok: false, msg: e.message }; }
}
/* ---------- 信用卡(綠界全方位金流):實際組表單與驗證在 server/core.js ---------- */
/** 客人按「前往刷卡付款」:確認是自己的、刷卡、待刷卡的出貨單,回傳金額與品名 */
function payPrep_(tk, sid) {
  var ctx = mem_(tk); sid = String(sid || '');
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
  if (!s || !mine_(ctx, s)) throw new Error('找不到出貨單');
  if (String(s.付款方式) !== '刷卡') throw new Error('這張出貨單的付款方式不是信用卡');
  if (String(s.狀態) !== '待刷卡') throw new Error('這張出貨單已付款或已處理(' + s.狀態 + ')');
  var total = Math.round(Number(s.總額) || 0); if (total <= 0) throw new Error('應付金額為 0,不需要刷卡');
  var names = rows_('訂單明細').filter(function (l) { return String(l.出貨單ID) === sid; }).map(function (l) { return String(l.品名).replace(/[#&<>'~]/g, ' ') + ' x' + l.數量; });
  if (Number(s.運費) > 0) names.push('運費 x1');
  return { sid: sid, total: total, items: (names.join('#') || '商品一批').slice(0, 380), url: appUrl_(), kind: String(s.付款類型 || '') };
}
/** 綠界付款結果通知(已驗證檢查碼):付款成功 → 待刷卡 改 已刷卡待出貨 */
function payDone_(p, test) {
  var sid = String(p.CustomField1 || ''), out = '';
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
    if (!s) { out = 'no ship'; return; }
    if (String(p.RtnCode) === '2' && /BNPL/i.test(String(p.PaymentType || ''))) { log_('綠界', '無卡分期申請中', sid, '金額 ' + p.TradeAmt + ' 綠界交易 ' + (p.TradeNo || '')); out = 'bnpl-apply'; return; }
    if (String(p.RtnCode) !== '1') { log_('綠界', '刷卡失敗', sid, String(p.RtnMsg || '') + ' ' + (p.TradeNo || '')); out = 'fail'; return; }
    if (!test && String(p.SimulatePaid) === '1') { log_('綠界', '模擬付款(略過)', sid, String(p.TradeNo || '')); out = 'sim'; return; }
    if (Number(p.TradeAmt) !== Math.round(Number(s.總額))) { log_('綠界', '刷卡金額不符', sid, '應付 ' + s.總額 + ',實收 ' + p.TradeAmt + ' 交易 ' + p.TradeNo); major_('綠界', '刷卡金額不符', sid, '應付 ' + s.總額 + ' 實收 ' + p.TradeAmt, p); out = 'amount'; return; }
    if (String(s.狀態) !== '待刷卡') { out = 'dup'; return; }
    var n = cp_(s); n.狀態 = '已刷卡待出貨'; n.匯款日期 = String(p.PaymentDate || '').slice(0, 10).replace(/\//g, '-'); put_('出貨單', s._r, n);
    log_('綠界', /BNPL/i.test(String(p.PaymentType || '')) ? '無卡分期付款成功' : '刷卡成功', sid, (test ? '(測試環境)' : '') + String(p.PaymentType || '') + ' 金額 ' + p.TradeAmt + ' 綠界訂單編號 ' + p.TradeNo + (p.auth_code ? ' 授權碼 ' + p.auth_code : '') + ' 付款時間 ' + String(p.process_date || p.PaymentDate || '') + (p.card4no ? ' 卡號末四碼 ' + p.card4no : '') + ' 特店交易編號 ' + String(p.MerchantTradeNo || ''));
    String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, '綠界'); });
    awardCredits_(sid, '綠界');
    out = 'ok';
  });
  return out;
}
/* ---------- 綠界物流(超商店到店 C2C):實際連線在 server/core.js ---------- */
function kindOk_(d) {
  var k = ['Credit', 'Installment', 'BNPL'].indexOf(d.kind) >= 0 ? d.kind : 'Credit';
  if (k === 'Installment' && prop_('ECPAY_INST_LIVE') !== '1' && !d.paytest) throw new Error('信用卡分期即將開放,請先選擇其他付款方式');
  if (k === 'BNPL' && prop_('ECPAY_BNPL_LIVE') !== '1' && !d.paytest) throw new Error('無卡分期即將開放,請先選擇其他付款方式');
  return k;
}
function payLabel_(p) { return String(p) === '賣貨便' && logiOn_() ? '超商取貨付款' : String(p || ''); }
/* 賣貨便要用 LINE 傳下單連結:只有 LINE 登入、而且是官方帳號好友的會員才能選(綠界物流上線後不限) */
var MH_FRIEND_MSG = '賣貨便需要用 LINE 登入並加入我們的官方帳號好友(我們會用 LINE 傳賣貨便下單連結給你)。加好友後請重新整理頁面再選,或改選其他付款方式';
function mhFriendOk_(ctx, d) { if (logiOn_(d)) return true; var m = ctx && ctx.lid ? memberRow_(ctx.lid) : null; return !!(m && m.已加好友 === 'Y'); }
/* 規格圖片:客人點某個顏色(或規格)時,商品大圖跳到指定的那張。存成 {"顏色或規格": "圖片網址"} */
function specImg_(p) { try { var o = JSON.parse(String(p.規格圖片 || '') || '{}'), im = imgs_(p.圖片), r = {}; Object.keys(o).forEach(function (k) { if (im.indexOf(String(o[k])) >= 0) r[k] = String(o[k]); }); return r; } catch (e) { return {}; } }
function specImgSave_(m, imgStr) {
  var im = String(imgStr || '').split('|'), r = {}, n = 0;
  if (m && typeof m === 'object') Object.keys(m).forEach(function (k) { var kk = String(k).trim().slice(0, 60), u = String(m[k] || ''); if (kk && u && im.indexOf(u) >= 0 && n < 200) { r[kk] = u; n++; } });
  return n ? JSON.stringify(r) : '';
}
function logiOn_(d) { return prop_('ECPAY_LOGI_LIVE') === '1' || !!(d && d.paytest); }
function cvsOf_(s) {
  var m = String(s.收件資訊 || '').match(/^【店到店】(7-11|全家)\s*(.*?)｜收件人\s*(.*)$/); if (!m) return null;
  var id = (m[2].match(/店號\s*([A-Za-z0-9]+)/) || [])[1] || '';
  return { cvs: m[1], store: m[2].replace(/\(店號[^)]*\)/g, '').trim(), id: id, rn: m[3].trim(), sub: m[1] === '全家' ? 'FAMIC2C' : 'UNIMARTC2C' };
}
/** 後台按「建立綠界物流單」:檢查資料、整理要送綠界的內容 */
function logiPrep_(tk, sid) {
  var u = me_(tk); sid = String(sid || '');
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
  if (!s) throw new Error('找不到出貨單');
  if (String(s.配送方式) !== '店到店') throw new Error('只有店到店的出貨單可以建立超商物流單');
  if (String(s.綠界物流ID || '')) throw new Error('這張出貨單已經建立過綠界物流單');
  if (String(s.付款方式) === '賣貨便' && !logiOn_()) throw new Error('賣貨便的出貨單請到賣貨便後台建立寄件單(門市由客人在賣貨便填寫)');
  var c = cvsOf_(s); if (!c) throw new Error('收件資訊格式不正確,請先在「配送 / 收件資訊」重新填寫');
  if (!c.id) throw new Error('門市沒有店號。請在取貨門市後面加上「(店號 xxxxxx)」,或請客人重新用地圖選門市');
  var st = settings_(), sn = String(st.寄件人姓名 || '').trim(), sp = nz_(st.寄件人手機);
  if (/^9\d{8}$/.test(sp)) sp = '0' + sp; // 設定值是純數字時會被當成數字,開頭的 0 會不見
  if (!sn || !/^09\d{8}$/.test(sp)) throw new Error('請先到「設定」填寫寄件人姓名(本名)與寄件人手機');
  var rnc = c.rn.replace(/\s/g, '');
  if (/[\u4e00-\u9fff]/.test(rnc) ? !/^[\u4e00-\u9fff]{2,5}$/.test(rnc) : !/^[A-Za-z]{4,10}$/.test(c.rn.replace(/\s/g, ''))) throw new Error('收件人「' + c.rn + '」不符合超商規定(中文 2~5 個字,或英文 4~10 個字母),請先在「配送 / 收件資訊」修改收件人');
  if (/先生|小姐|太太|女士|老闆|寶貝|測試|收件人|本人|同上/.test(rnc)) throw new Error('收件人「' + c.rn + '」不是本名,超商取件需核對證件,請先在「配送 / 收件資訊」改成本名');
  c.rn = rnc;
  var ph = nz_(s.電話); if (!/^09\d{8}$/.test(ph)) throw new Error('客人電話不是 09 開頭的手機,超商無法簡訊通知取貨,請先修改電話');
  var cod = String(s.付款方式) === '賣貨便';
  if (!cod && !paidOk_(s)) throw new Error('客人還沒付款(目前「' + s.狀態 + '」),不能寄出');
  var amt = cod ? Math.round(Number(s.總額) || 0) : Math.round(Number(s.商品金額) || 0);
  amt = Math.max(1, amt); if (amt > 20000) throw new Error('超商取貨金額上限 20,000 元,這張出貨單超過了');
  return { sid: sid, sub: c.sub, cvs: c.cvs, store: c.id, rn: c.rn, ph: ph, sn: sn, sp: sp, cod: cod, amt: amt };
}
/** 批次產生物流單號:先逐張檢查,不能建立的列出原因 */
function logiBatchPrep_(tk, ids) {
  me_(tk); var ok = [], bad = [];
  (ids || []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).forEach(function (sid) {
    try { ok.push(logiPrep_(tk, sid)); } catch (e) { bad.push(sid + ':' + (e && e.message || e)); }
  });
  return { ok: ok, bad: bad };
}
/** 批次建立結果寫回(成功的寫入寄件代碼,失敗的列出原因) */
function logiBatchSave_(tk, pairs, bad, test) {
  var u = me_(tk), good = [];
  lk_(function () {
    pairs.forEach(function (x) {
      var prep = x.prep, r = x.r;
      if (!r.ok) { bad.push(prep.sid + ':綠界回覆「' + r.msg + '」'); return; }
      var s = rows_('出貨單').filter(function (y) { return String(y.出貨單ID) === prep.sid; })[0]; if (!s) return;
      var code = String(r.payNo || '') + String(r.valNo || '');
      var n = cp_(s); n.物流 = prep.cvs; n.物流單號 = code; n.綠界物流ID = (test ? '測試:' : '') + [r.id, r.payNo || '', r.valNo || '', prep.sub].join('|'); put_('出貨單', s._r, n);
      log_(u.acc, '建立綠界物流單', prep.sid, (test ? '(測試環境)' : '') + prep.cvs + ' 店號 ' + prep.store + (prep.cod ? ' 取貨付款 ' + prep.amt : ' 取貨不付款') + ' 寄件代碼 ' + code + ' 物流編號 ' + r.id);
      good.push(prep.sid + ' ' + prep.cvs + ' ' + code);
    });
  });
  var res = adminOrders(tk);
  res.msg = (test ? '【目前是綠界物流測試環境,不是真的寄件單】\n' : '') + (good.length ? '已產生 ' + good.length + ' 張物流單號:\n' + good.join('\n') + '\n\n點出貨單裡的「列印寄件單」,或到超商用寄件代碼寄件。' : '沒有產生任何物流單號。') + (bad.length ? '\n\n略過 ' + bad.length + ' 張:\n' + bad.join('\n') : '');
  return res;
}
/** 清除綠界物流單紀錄(已在綠界後台取消,或要改門市重新產生) */
function adminLogiClear(tk, sid) {
  var u = me_(tk); sid = String(sid || '');
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
    if (!s) throw new Error('找不到出貨單');
    if (!String(s.綠界物流ID || '')) throw new Error('這張出貨單沒有綠界物流單');
    var f = FLOW[s.付款方式] || [];
    if (f.indexOf(String(s.狀態)) >= si_(s.付款方式)) throw new Error('出貨單已出貨,不能清除物流單');
    var n = cp_(s); n.綠界物流ID = ''; n.物流 = ''; n.物流單號 = ''; put_('出貨單', s._r, n);
    log_(u.acc, '清除綠界物流單', sid, '原物流 ' + s.物流 + ' ' + s.物流單號 + ' 綠界 ' + s.綠界物流ID);
  });
  var res = adminOrders(tk); res.msg = '已清除出貨單 ' + sid + ' 的物流單號,可修改收件資訊後重新產生。\n(請確認已在綠界後台取消原本的物流單)'; return res;
}
/** 建立成功:寫回物流、寄件代碼 */
function logiSave_(tk, prep, r, test) {
  var u = me_(tk), msg = '';
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === prep.sid; })[0]; if (!s) return;
    var code = String(r.payNo || '') + String(r.valNo || '');
    var n = cp_(s); n.物流 = prep.cvs; n.物流單號 = code; n.綠界物流ID = (test ? '測試:' : '') + [r.id, r.payNo || '', r.valNo || '', prep.sub].join('|'); put_('出貨單', s._r, n);
    log_(u.acc, '建立綠界物流單', prep.sid, (test ? '(測試環境)' : '') + prep.cvs + ' 店號 ' + prep.store + (prep.cod ? ' 取貨付款 ' + prep.amt : ' 取貨不付款') + ' 寄件代碼 ' + code + ' 物流編號 ' + r.id);
    msg = (test ? '【目前是綠界物流測試環境,不是真的寄件單】\n' : '') + '已建立綠界物流單\n' + prep.cvs + (prep.cod ? ' 取貨付款 NT$ ' + prep.amt : ' 取貨不付款') + '\n寄件代碼:' + code + '\n\n接下來按「列印寄件單」,或到超商用寄件代碼寄件。';
  });
  var res = adminOrders(tk); res.msg = msg; return res;
}
function logiPrintPrep_(tk, sid) {
  me_(tk);
  var s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === String(sid); })[0];
  if (!s || !String(s.綠界物流ID || '')) throw new Error('這張出貨單還沒有建立綠界物流單');
  var p = String(s.綠界物流ID).replace(/^測試:/, '').split('|');
  return { id: p[0], payNo: p[1], valNo: p[2], sub: p[3] };
}
/** 綠界物流狀態通知(已驗證):記錄、到店通知客人、取貨付款未取件退回 */
function logiStatus_(p, test) {
  var id = String(p.AllPayLogisticsID || ''), code = String(p.RtnCode || ''), out = '';
  lk_(function () {
    var s = rows_('出貨單').filter(function (x) { return id && String(x.綠界物流ID || '').replace(/^測試:/, '').split('|')[0] === id; })[0];
    if (!s) { out = 'no ship'; return; }
    var sid = String(s.出貨單ID), cod = String(s.付款方式) === '賣貨便';
    log_('綠界物流', '物流狀態', sid, code + ' ' + String(p.RtnMsg || '') + (test ? '(測試環境)' : ''));
    // 賣家已到門市寄件(或之後的運送、到店、取件貨態)→ 出貨單自動改成「已出貨」,並照常發出貨通知、同步訂單、發回饋購物金
    var shipped = '';
    if (LOGI_SENT.indexOf(code) >= 0) shipped = logiMarkShipped_(s, code + ' ' + String(p.RtnMsg || ''));
    if (shipped) { out = 'shipped'; s = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0] || s; }
    if (['2063', '2073', '3018'].indexOf(code) >= 0) {
      var lid = String(s['LINE ID'] || ''), st = settings_(), tpl = String(st.到店通知內容 === undefined ? defSet_('到店通知內容') : st.到店通知內容 || '').trim(), c = cvsOf_(s) || {};
      if (lid && tpl) pushLine_(lid, tpl.split('{門市}').join((c.cvs || '') + ' ' + (c.store || '')).split('{出貨單號}').join(sid).split('{付款提醒}').join(cod ? '取件時請付款 NT$ ' + s.總額 + '\n' : '').split('{姓名}').join(String(s.姓名 || '')));
      out = 'arrive';
    } else if (cod && ['2074', '2076', '3020', '3025', '3019'].indexOf(code) >= 0 && String(s.狀態) !== '已退回') {
      var n = cp_(s); n.狀態 = '已退回'; put_('出貨單', s._r, n); log_('綠界物流', '未取件退回', sid, code + ' ' + String(p.RtnMsg || '')); out = 'return';
    } else if (!shipped) out = 'log';
  });
  return out;
}
/* 綠界貨態:代表包裹已經寄出(含之後的運送、到店、取件)
   7-11:2068 交貨便收件(賣家已到門市寄件)、2030 物流中心驗收成功、2063/2073 已到取件門市、2067 已取件
   全家:3024 貨件已至門市寄件、3001 轉運中、3006 配送中、3018 已到取件門市、3022 已取件 */
var LOGI_SENT = ['2068', '2030', '2063', '2073', '2067', '3024', '3001', '3006', '3018', '3022'];
function logiMarkShipped_(s, why) {
  var f = FLOW[s.付款方式] || [], sid = String(s.出貨單ID), si = si_(s.付款方式), st = '已出貨';
  if (f.indexOf(st) < 0 || f.indexOf(String(s.狀態)) >= si || String(s.狀態) === '已退回') return '';
  var n = cp_(s); n.狀態 = st; if (!s.出貨時間) n.出貨時間 = now_();
  put_('出貨單', s._r, n);
  log_('綠界物流', '修改出貨單', sid, diff_(s, n) + '(綠界貨態:' + why + ')');
  String(s.訂單ID).split(',').forEach(function (oid) { syncOrderStatus_(oid, '綠界物流'); });
  awardCredits_(sid, '綠界物流');
  var nt = shipNotice_(s, n, f); if (nt) log_('綠界物流', '出貨通知', sid, nt);
  return st;
}
/** 收件人必須填本名(超商取貨要核對證件):中文 2~6 字,或英文姓名 */
function realName_(v) {
  var rn = t_(v, 30).replace(/\s+/g, ' ').trim(), err = '收件人請填寫本名(與證件相同,取貨時需核對),例如:王小明';
  if (!rn) throw new Error('請填寫收件人姓名(本名)');
  if (/[\u4e00-\u9fff]/.test(rn)) { rn = rn.replace(/\s/g, ''); if (!/^[\u4e00-\u9fff·・．]{2,6}$/.test(rn)) throw new Error(err); }
  else if (!/^[A-Za-z][A-Za-z.'\- ]{1,29}$/.test(rn)) throw new Error(err);
  if (/先生|小姐|太太|女士|老闆|寶貝|測試|收件人|本人|同上/.test(rn)) throw new Error(err);
  return rn;
}
/** 客人勾選已到貨品項 →「確定出貨」→ 建立出貨單,之後走付款與出貨流程 */
function memberCreateShip(tk, items, d) {
  var nk = d && d.nonce ? 'sn_' + String(d.nonce).slice(0, 40) : '', nc = CacheService.getScriptCache();
  if (nk && nc.get(nk)) { var r0 = memberOrders(tk); r0.sid = nc.get(nk); return r0; } // 重複按「確定出貨」不會建兩張
  var r1 = memberCreateShip0_(tk, items, d);
  if (nk) nc.put(nk, String(r1.sid), 1800);
  return r1;
}
function memberCreateShip0_(tk, items, d) {
  var ctx = mem_(tk); d = d || {};
  var pay = d.pay, ship = t_(d.ship, 200), phone = t_(d.phone, 20), method = d.method ? String(d.method) : '';
  if (!PAY[pay]) throw new Error('請選擇付款方式');
  if (pay === '刷卡' && prop_('ECPAY_PAY_LIVE') !== '1' && !d.paytest) throw new Error('線上付款即將開放,目前請選擇匯款或賣貨便');
  if (pay === '賣貨便' && !mhFriendOk_(ctx, d)) throw new Error(MH_FRIEND_MSG);
  if (pay === '賣貨便' && method === '自取') throw new Error('賣貨便無法自取,請選擇匯款或付現金');
  if (pay === '賣貨便' && method && method !== '店到店') throw new Error('超商取貨付款只能搭配超商店到店');
  if (pay === '賣貨便' && !method && d.cvs) method = '店到店';
  if (pay === '付現金' && method !== '自取') throw new Error('付現金只能選擇自取');
  if (method) {
    if (['店到店', '宅配', '自取'].indexOf(method) < 0) throw new Error('請選擇配送方式');
    var rn = realName_(d.rname);
    if (method === '店到店' && pay === '賣貨便' && !logiOn_(d)) {
      // 賣貨便:客人不用選門市,門市在賣貨便下單時自己填
      ship = '【店到店】7-11 ' + MH_STORE + '｜收件人 ' + rn;
    } else if (method === '店到店') {
      var cvs = t_(d.cvs, 20), store = t_(d.store, 60);
      if (['7-11', '全家'].indexOf(cvs) < 0) throw new Error('超商僅提供 7-11 或全家'); if (!store) throw new Error('請填寫取貨門市(店名或店號)');
      var cid = t_(d.cvsid, 20);
      if (cid || logiOn_(d)) { // 門市從超商地圖選(要有店號)
        if (!/^[A-Za-z0-9]{3,10}$/.test(cid)) throw new Error('請按「選擇門市」從超商地圖選取門市');
        if (pay === '賣貨便' && !logiOn_(d) && cvs !== '7-11') throw new Error('賣貨便只能寄到 7-11 門市,請改選 7-11 門市');
        store = store.replace(/\(店號[^)]*\)/g, '').trim() + '(店號 ' + cid + ')';
      } else {
      if (pay === '賣貨便' && cvs !== '7-11') throw new Error('賣貨便只能寄到 7-11 門市,請改選 7-11 並填寫 7-11 的門市');
      if (pay === '賣貨便' && /全家|family|萊爾富|hi-?life|ok\s*mart|ok超商|蝦皮|宅配|地址|\d+\s*號|[市縣].{0,4}[區鄉鎮]/i.test(store)) throw new Error('賣貨便只能填 7-11 門市(店名或店號),請不要填其他超商或地址');
      }
      ship = '【店到店】' + cvs + ' ' + store + '｜收件人 ' + rn;
    } else if (method === '自取') {
      ship = '【自取】取貨人 ' + rn;
    } else {
      var addr = t_(d.addr, 150);
      if (!addr) throw new Error('請填寫收件地址');
      ship = '【宅配】' + addr + '｜收件人 ' + rn;
    }
  }
  if (!ship) throw new Error('請填寫收件地址或取貨門市');
  if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
  var sid;
  lk_(function () {
    var lines = pickLines_(ctx, items), c = shipCalc_(lines, { method: method, pay: pay, ctx: ctx, credit: d.credit }), o0 = ord_(String(lines[0].訂單ID));
    if (c.over) throw new Error('購物金超過可使用額度(最多 ' + c.allowed + ')');
    var cdetail = c.pick > 0 ? spend_(ctx.lid, c.pick) : {};
    sid = seq_('出貨單', 'S');
    var oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': Object.keys(oids).join(','), '狀態': PAY[pay], '物流': defCo_(pay, method), '物流單號': '', '品項': lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'), '建立時間': now_(), '出貨時間': '',
      'LINE ID': ctx.lid || '', '姓名': String(o0.姓名), '電話': phone, '付款方式': pay, '收件資訊': ship, '備註': t_(d.note, 200), '商品金額': c.sub, '優惠折抵': c.disc, '購物金折抵': c.cred + c.pick, '運費': c.fee, '總額': c.total,
      '付款連結': '', '匯款後五碼': '', '會員等級': String(o0.會員等級 || ''), '折抵明細': JSON.stringify(c.alloc), '配送方式': method, '購物金明細': JSON.stringify(cdetail), '收款帳號': pay === '匯款' ? String(settings_().匯款資訊 || '') : '', '付款類型': pay === '刷卡' ? kindOk_(d) : '' });
    lines.forEach(function (l) { var n = cp_(l); n.出貨單ID = sid; put_('訂單明細', l._r, n); });
    log_('客人 ' + o0.姓名, '建立出貨單', sid, pay + (method ? ',' + method : '') + (c.pick ? ',購物金 -' + c.pick : '') + ',應付 ' + c.total + ':' + lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'));
    Object.keys(oids).forEach(function (oid) { syncOrderStatus_(oid, '客人'); });
    shipCreatedNotice_(ctx.lid, sid, pay === '賣貨便' && !logiOn_(d));
  });
  var r = memberOrders(tk); r.sid = sid; return r;
}
/** 出貨單成立後用 LINE 通知客人(設定「出貨單成立通知內容」;賣貨便另外加上賣貨便說明,合併成一則省額度) */
function shipCreatedNotice_(lid, sid, myship) {
  if (!lid) return;
  var st = settings_(), tx = function (k) { return String(st[k] === undefined ? defSet_(k) : st[k] || '').trim().split('{出貨單號}').join(sid); };
  var parts = [tx('出貨單成立通知內容')]; if (myship) parts.push(tx('賣貨便成立通知內容'));
  var text = parts.filter(Boolean).join('\n\n'); if (text) pushLine_(lid, text);
}

/* ---------- 代客出貨(後台替客人把已到貨品項建立出貨單) ---------- */
function shipCtx_(d) {
  var lid = String((d && d.lid) || '').trim(), ph = nz_(d && d.phone);
  if (!lid && !ph) throw new Error('請先選擇客人');
  return lid ? { lid: lid } : { phone: ph };
}
function shipRecv_(d) {
  var method = String(d.method || ''), rn = t_(d.rname, 30), ship = '';
  if (['店到店', '宅配', '自取'].indexOf(method) < 0) throw new Error('請選擇配送方式');
  rn = realName_(rn);
  if (method === '自取') { return { method: method, ship: '【自取】取貨人 ' + rn }; }
  if (method === '店到店') {
    var cvs = t_(d.cvs, 20), store = t_(d.store, 60);
    if (['7-11', '全家'].indexOf(cvs) < 0) throw new Error('超商僅提供 7-11 或全家'); if (!store) throw new Error('請填寫取貨門市(店名或店號)');
    ship = '【店到店】' + cvs + ' ' + store + '｜收件人 ' + rn;
  } else {
    var addr = t_(d.addr, 150); if (!addr) throw new Error('請填寫收件地址');
    ship = '【宅配】' + addr + '｜收件人 ' + rn;
  }
  return { method: method, ship: ship };
}
/** 後台改收件資訊(收件人不強制本名檢查,只要有填) */
function adminRecv_(d) {
  var method = String(d.method || ''), rn = t_(d.rname, 30);
  if (['店到店', '宅配', '自取'].indexOf(method) < 0) throw new Error('請選擇配送方式');
  if (!rn) throw new Error('請填寫收件人');
  if (method === '自取') return { method: method, ship: '【自取】取貨人 ' + rn };
  if (method === '店到店') {
    var cvs = t_(d.cvs, 20), store = t_(d.store, 60);
    if (['7-11', '全家'].indexOf(cvs) < 0) throw new Error('超商請選 7-11 或全家'); if (!store) throw new Error('請填寫取貨門市');
    return { method: method, cvs: cvs, ship: '【店到店】' + cvs + ' ' + store + '｜收件人 ' + rn };
  }
  var addr = t_(d.addr, 150); if (!addr) throw new Error('請填寫收件地址');
  return { method: method, ship: '【宅配】' + addr + '｜收件人 ' + rn };
}
/** 依設定算運費(滿額免運) */
function feeFor_(m, pay, net) {
  var st = settings_(), free = Number(st.免運門檻) || 0;
  var base = m === '自取' ? 0 : pay === '賣貨便' ? (st.賣貨便運費 === undefined || String(st.賣貨便運費) === '' ? 38 : Number(st.賣貨便運費) || 0) : m === '店到店' ? Number(st.店到店運費) || 0 : m === '宅配' ? Number(st.宅配運費) || 0 : 0;
  return (free > 0 && net >= free) ? 0 : base;
}
function adminShipQuote(tk, items, d) {
  me_(tk); d = d || {};
  try {
    var ctx = shipCtx_(d), c = shipCalc_(pickLines_(ctx, items), { method: d.method, pay: d.pay, ctx: ctx, credit: d.credit });
    return { ok: true, sub: c.sub, disc: c.disc, cred: c.cred + c.pick, fee: c.fee, total: c.total, pick: c.pick, allowed: c.allowed, balance: c.balance, minSpend: c.minSpend, login: !!ctx.lid };
  } catch (e) { return { ok: false, msg: e.message }; }
}
function adminCreateShipFor(tk, items, d) {
  var u = me_(tk); d = d || {};
  var ctx = shipCtx_(d), pay = d.pay, phone = t_(d.phone2 || d.phone, 20);
  if (!PAY[pay] || pay === '刷卡') throw new Error('請選擇付款方式(匯款、賣貨便或付現金)');
  var rc = shipRecv_(d), method = rc.method, ship = rc.ship;
  if (pay === '付現金' && method !== '自取') throw new Error('付現金只能選擇自取');
  if (pay === '賣貨便' && method === '自取') throw new Error('賣貨便無法自取,請選擇匯款或付現金');
  if (pay === '賣貨便' && method !== '店到店') throw new Error('超商取貨付款只能搭配超商店到店');
  if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
  var sid, total = 0, name = '', msg = '', oidsOut = '', itemsTxt = '', lidOut = '';
  lk_(function () {
    var lines = pickLines_(ctx, items), c = shipCalc_(lines, { method: method, pay: pay, ctx: ctx, credit: d.credit }), o0 = ord_(String(lines[0].訂單ID));
    if (c.over) throw new Error('購物金超過可使用額度(最多 ' + c.allowed + ')');
    var cdetail = c.pick > 0 ? spend_(ctx.lid, c.pick) : {};
    sid = seq_('出貨單', 'S');
    var oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    itemsTxt = lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'); total = c.total; name = String(o0.姓名); lidOut = ctx.lid || ''; oidsOut = Object.keys(oids).join(',');
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': oidsOut, '狀態': PAY[pay], '物流': defCo_(pay, method), '物流單號': '', '品項': itemsTxt, '建立時間': now_(), '出貨時間': '',
      'LINE ID': ctx.lid || '', '姓名': name, '電話': phone, '付款方式': pay, '收件資訊': ship, '備註': t_(d.note, 200), '商品金額': c.sub, '優惠折抵': c.disc, '購物金折抵': c.cred + c.pick, '運費': c.fee, '總額': c.total,
      '付款連結': '', '匯款後五碼': '', '會員等級': String(o0.會員等級 || ''), '折抵明細': JSON.stringify(c.alloc), '配送方式': method, '購物金明細': JSON.stringify(cdetail), '收款帳號': pay === '匯款' ? String(settings_().匯款資訊 || '') : '' });
    lines.forEach(function (l) { var n = cp_(l); n.出貨單ID = sid; put_('訂單明細', l._r, n); });
    log_(u.acc, '代客出貨', sid, name + ':' + pay + (method ? ',' + method : '') + (c.pick ? ',購物金 -' + c.pick : '') + ',應付 ' + c.total + ':' + itemsTxt);
    Object.keys(oids).forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
  });
  if (d.notify && lidOut) {
    var st = settings_(), bank = String(st.匯款資訊 || '');
    var text = name + ' 您好,已為您建立出貨單 ' + sid + '\n商品:' + itemsTxt + '\n應付金額:NT$ ' + total + '\n' +
      (pay === '匯款' ? '付款方式:匯款\n' + bank + '\n匯款後請到會員中心填寫帳號後五碼:' + appUrl_() : pay === '付現金' ? '付款方式:付現金,自取時當面付款,可以取貨時會再通知您' : '付款方式:賣貨便,店到店寄出後會再通知您');
    msg = pushLine_(lidOut, text) ? '已用 LINE 通知客人' : 'LINE 通知發送失敗(客人可能未加好友)';
  } else if (d.notify) msg = '此客人沒有 LINE 登入,沒有發送通知';
  var r = adminOrders(tk); r.sid = sid; r.total = total; r.notice = msg; r.name = name; return r;
}

/* ---------- 第二階段:LINE 登入、會員、購物金、活動 ---------- */
var LINE_ID_DEFAULT = '2012348090';
var DEFAULT_SETTINGS = [
  ['店名', 'coscos韓國選物店'], ['免運門檻', 1500], ['店到店運費', 60], ['賣貨便運費', 38], ['宅配運費', 80], ['匯款資訊', '請填寫銀行代碼、帳號、戶名'], ['公告', ''],
  ['購物金注意事項', '⚠️ 購物金使用注意事項\n▪️ 下次消費滿 $500，可折 $50\n▪️ 下次消費滿 $1,000，可折 $150\n▪️ 每筆消費限使用一種折抵方式\n▪️ 精品、特價商品及指定商品不適用'],
  ['購物金折抵級距', '500=50,1000=150'], ['購物金使用門檻', 1000], ['購物金折抵上限', 100], ['購物金預設有效天數', 90],
  ['到貨通知內容', '{姓名} 您好,您訂購的 {品名} 已到貨!請到會員中心勾選要出貨的商品:{連結}'],
  ['下單成功通知內容', '訂單{訂單編號}確認！\n\n商品:{品項}\n訂單金額:NT$ {金額}\n\n預購商品到貨後會再訊息通知您❤️\n到貨商品可以在會員的訂單明細勾選出貨～\n\n有任何問題隨時聯繫我們🫶'],
  ['出貨通知內容', '📢出貨通知\n\n出貨單號:{出貨單號}\n物流:{物流}\n物流單號:{物流單號}\n追蹤連結:{追蹤連結}\n出貨單如圖{附圖}\n\n有任何問題都歡迎聯繫我們唷～'],
  ['出貨單成立通知內容', '出貨單已收到,約4-5工作日安排寄出\n出貨會再另外通知,謝謝❤️'],
  ['賣貨便成立通知內容', '出貨單已成立(出貨單號:{出貨單號})\n因為付款方式您是選賣貨便(貨到付款)\n所以我們稍後會提供賣貨便連結給您下單'],
  ['分享回饋通知內容', '謝謝您對 COS 的支持🖤\n也歡迎把這次的購物體驗分享給更多人！\n\n🎁 分享回饋・領購物金\n▪️ 分享購物心得＋照片至 COS LINE 社群\n→ 贈 $50 購物金\n▪️ 追蹤我們，並於 IG 限時動態或 Threads 發文，並標記 @coscos_select_kr\n→ 贈 $50 購物金\n🖤 以上兩項皆完成，再加碼 $50 購物金！\n✨ 最高共可獲得 $150 購物金\n\n⚠️ 購物金使用注意事項\n▪️ 下次消費滿 $500，可折 $50\n▪️ 下次消費滿 $1,000，可折 $150\n▪️ 每筆消費限使用一種折抵方式\n▪️ 精品、特價商品及指定商品不適用\n▪️ 購物金不得兌換現金或找零\n▪️ 購物金採年度計算，每年 1/1 重新計算\n▪️本活動相關規範及未盡事宜，依 COS 韓國選品店公告為準；本公司保留活動內容調整、修改及最終解釋之權利'],
  ['發票開立通知內容', '🧾電子發票已開立\n\n出貨單號:{出貨單號}\n發票號碼:{發票號碼}\n開立日期:{發票日期}\n金額:NT$ {金額}\n\n發票已存在綠界載具(您的手機號碼)\n可以到會員專區的出貨單查看❤️\n{連結}'],
  ['到店通知內容', '📦 您的包裹已送達 {門市} 囉!\n出貨單號:{出貨單號}\n{付款提醒}請於 7 天內攜帶證件到門市取件,逾期會退回唷～'],
  ['寄件人姓名', ''], ['寄件人手機', ''],
  ['可自取通知內容', '📢您的商品已經可以來自取囉!\n\n出貨單號:{出貨單號}\n\n請於營業時間前來取貨,有任何問題都歡迎聯繫我們唷～'],
  ['退回通知內容', '📢出貨單 {出貨單號} 因為太久沒有取貨,已被退回囉。\n\n請問您還需要這筆商品嗎?需要的話請直接回覆我們,我們再幫您重新安排出貨❤️\n(若不需要也請告訴我們一聲,謝謝您～)'],
  ['送達通知內容', '出貨單號 {出貨單號} 商品已送達,感謝您的購買!\n有任何問題隨時聯繫我們'],
  ['未收到匯款通知內容', '{姓名} 您好,出貨單 {出貨單號} 我們目前還沒有確認到您的匯款款項。\n如果您已經匯款,請直接用 LINE 與我們聯繫,並提供匯款帳號後五碼與匯款時間,我們會盡快幫您查帳,謝謝!'],
  ['物流追蹤連結', '新竹物流=https://www.hct.com.tw/Search/SearchGoods_n.aspx\n7-11=https://eservice.7-11.com.tw/e-tracking/search.aspx\n全家=https://fami.tw/package'],
  ['加好友連結', 'https://line.me/R/ti/p/@coscoskr'],
  ['公司名稱', '轉機兔實業'], ['公司地址', ''], ['統一編號', ''], ['IG連結', ''], ['LINE社群連結', '']
];
function ensureSettings_() {
  var have = {}; rows_('設定').forEach(function (r) { have[r.項目] = 1; });
  DEFAULT_SETTINGS.forEach(function (r) { if (!have[r[0]]) put_('設定', 0, { '項目': r[0], '值': r[1] }); });
}
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function lineOn_() { return !!prop_('LINE_LOGIN_SECRET'); }
function lineId_() { return prop_('LINE_LOGIN_ID') || LINE_ID_DEFAULT; }
function appUrl_() { return prop_('APP_URL') || ScriptApp.getService().getUrl(); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)); }
function tot_(sub, o, fee) { return Math.max(0, sub - Number(o.優惠折抵 || 0) - Number(o.購物金折抵 || 0) + fee); }

/* --- LINE 登入 --- */
function lineStart() {
  if (!lineOn_()) throw new Error('LINE 登入尚未設定');
  var s = Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('st_' + s, '1', 600);
  return 'https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=' + lineId_() + '&redirect_uri=' + encodeURIComponent(appUrl_()) +
    '&state=' + s + '&scope=' + encodeURIComponent('profile openid') + '&bot_prompt=normal';
}
function lineCallback_(p) {
  var c = CacheService.getScriptCache(), k = 'st_' + p.state;
  if (!c.get(k)) return {};
  c.remove(k);
  try {
    var tr = JSON.parse(UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', { method: 'post', muteHttpExceptions: true,
      payload: { grant_type: 'authorization_code', code: p.code, redirect_uri: appUrl_(), client_id: lineId_(), client_secret: prop_('LINE_LOGIN_SECRET') } }).getContentText());
    if (!tr.id_token) return { err: 'LINE 登入失敗,請再試一次' };
    var v = JSON.parse(UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', { method: 'post', muteHttpExceptions: true,
      payload: { id_token: tr.id_token, client_id: lineId_() } }).getContentText());
    if (!v.sub) return { err: 'LINE 登入失敗,請再試一次' };
    var friend = false;
    try { friend = !!JSON.parse(UrlFetchApp.fetch('https://api.line.me/friendship/v1/status', { headers: { Authorization: 'Bearer ' + tr.access_token }, muteHttpExceptions: true }).getContentText()).friendFlag; } catch (e) {}
    upsertMember_(v.sub, v.name || '', v.picture || '', friend);
    return { token: newSession_(v.sub) };
  } catch (err) { return { err: 'LINE 登入失敗,請稍後再試' }; }
}
/** LIFF(在 LINE 裡開啟網站)登入:前端傳來 LIFF 的 ID Token,後端向 LINE 驗證後建立登入階段 */
function lineLiff(idToken, accessToken) {
  if (!lineOn_()) throw new Error('LINE 登入尚未設定');
  if (!idToken) throw new Error('LINE 登入失敗,請再試一次');
  var v = {};
  try { v = JSON.parse(UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', { method: 'post', muteHttpExceptions: true, payload: { id_token: String(idToken), client_id: lineId_() } }).getContentText()); } catch (e) {}
  if (!v.sub) throw new Error('LINE 登入已過期,請重新登入' + (v.error_description ? '(' + v.error_description + ')' : ''));
  var friend = false;
  try { if (accessToken) friend = !!JSON.parse(UrlFetchApp.fetch('https://api.line.me/friendship/v1/status', { headers: { Authorization: 'Bearer ' + accessToken }, muteHttpExceptions: true }).getContentText()).friendFlag; } catch (e) {}
  upsertMember_(v.sub, v.name || '', v.picture || '', friend);
  return { token: newSession_(v.sub) };
}
function newSession_(lid) {
  var tk = 'L' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var n = now_(), exp = Utilities.formatDate(new Date(Date.now() + 30 * 86400000), TZ, 'yyyy-MM-dd HH:mm:ss');
  rows_('登入階段').filter(function (r) { return String(r.到期) <= n; }).map(function (r) { return r._r; }).sort(function (a, b) { return b - a; })
    .forEach(function (r) { sh_('登入階段').deleteRow(r); });
  put_('登入階段', 0, { '雜湊': sha_(tk), 'LINE ID': lid, '到期': exp });
  return tk;
}
function upsertMember_(lid, name, pic, friend) {
  var m = rows_('會員').filter(function (r) { return String(r['LINE ID']) === lid; })[0];
  if (m) { var n = cp_(m); n.暱稱 = name; n.頭像 = pic; n.最近登入 = now_();
    if (friend) n.封鎖時間 = ''; else if (m.已加好友 === 'Y' && !String(m.封鎖時間 || '')) n.封鎖時間 = now_(); // 原本是好友、登入時變成不是 = 封鎖(漏收通知時補記)
    n.已加好友 = friend ? 'Y' : 'N'; put_('會員', m._r, n); return n; }
  var o = { 'LINE ID': lid, '暱稱': name, '頭像': pic, '等級': '一般會員', '加入時間': now_(), '最近登入': now_(), '已加好友': friend ? 'Y' : 'N', '備註': '' };
  put_('會員', 0, o); return o;
}
function memberRow_(lid) { return rows_('會員').filter(function (r) { return String(r['LINE ID']) === lid; })[0]; }
function levels_() { return rows_('等級'); }
function levelOf_(lid) { var m = memberRow_(lid); return m && String(m.等級) ? String(m.等級) : '一般會員'; }
function pushLine_(lid, text, imgs, flex, more) {
  var tk = prop_('LINE_MSG_TOKEN'); if (!tk) { LINE_ERR_ = '尚未設定 LINE_MSG_TOKEN'; return false; }
  try {
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tk }, muteHttpExceptions: true,
      payload: JSON.stringify({ to: lid, messages: [flex || { type: 'text', text: text }].concat((imgs || []).filter(function (u) { return /^https:\/\//.test(u); }).slice(0, more && more.length ? 3 : 4).map(function (u) { return { type: 'image', originalContentUrl: u, previewImageUrl: u }; })).concat((more || []).filter(String).slice(0, 1).map(function (t) { return { type: 'text', text: String(t).slice(0, 4900) }; })) }) });
    if (flex && r.getResponseCode() === 400) return pushLine_(lid, text, imgs, null, more); // 卡片格式被拒時改送文字
    LINE_ERR_ = r.getResponseCode() === 200 ? '' : 'HTTP ' + r.getResponseCode() + ' ' + String(r.getContentText() || '').slice(0, 160);
    return r.getResponseCode() === 200;
  } catch (e) { LINE_ERR_ = String(e && e.message || e).slice(0, 160); return false; }
}
/* LINE 卡片共用:品牌色(與網站相同的玫瑰棕色系) */
var BR_ = { acc: '#A95B4D', ink: '#4B3B37', mute: '#8C7771', line: '#F0DFD9', soft: '#FAEEEA', paper: '#FFFBFA' };
function flexT_(t, o) { var x = { type: 'text', text: String(t) || ' ' }; for (var k in o) x[k] = o[k]; return x; }
function flexBtn_(lab, act, pri) { return { type: 'button', style: pri ? 'primary' : 'secondary', color: pri ? BR_.acc : BR_.line, height: 'sm', action: act, flex: 1 }; }
function flexHead_(title, right) { return { type: 'box', layout: 'horizontal', backgroundColor: BR_.acc, paddingAll: '14px', contents: [flexT_(title, { color: '#FFFFFF', weight: 'bold' }), flexT_(right, { color: '#F6DCD5', size: 'sm', align: 'end', gravity: 'center' })] }; }
function flexHero_(label, big) { return { type: 'box', layout: 'vertical', backgroundColor: BR_.soft, paddingAll: '18px', contents: [flexT_(label, { color: BR_.mute, size: 'sm' }), flexT_(big, { color: BR_.ink, size: 'xxl', weight: 'bold', adjustMode: 'shrink-to-fit', margin: 'sm' })] }; }
function flexRow_(l, r, o) { o = o || {}; return { type: 'box', layout: 'horizontal', margin: o.margin || 'sm', contents: [flexT_(l, { size: 'sm', color: o.lc || BR_.mute }), flexT_(r, { size: o.size || 'sm', weight: o.bold ? 'bold' : 'regular', color: o.rc || BR_.ink, align: 'end' })] }; }
function money_(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }
/** 訂單成立卡片(LINE Flex):版面同「訂購單」 */
function orderFlex_(oid, name, c, alt) {
  try {
    var T = flexT_, L = c.lines || [], qty = L.reduce(function (a, l) { return a + Number(l[1] || 0); }, 0), at = now_();
    var body = [T(String(name || '') + ' 您好,已收到您的訂單 ❤️', { wrap: true, size: 'sm', color: PO_.ink, margin: 'md' })];
    body.push(poGrid_([['訂單編號', oid], ['訂購時間', at.slice(0, 16)]]));
    body.push(poTable_(L.slice(0, 20).map(function (l) { return { name: String(l[0].名稱), spec: String(l[3] || ''), qty: l[1], sub: Number(l[1]) * Number(l[2]) }; })));
    if (L.length > 20) body.push(T('…其他 ' + (L.length - 20) + ' 項', { size: 'xxs', color: PO_.mute, margin: 'sm' }));
    var sum = [['共 ' + L.length + ' 項 / ' + qty + ' 件', ''], ['商品合計', money_(c.sub)]];
    if (Number(c.discount) > 0) sum.push(['優惠' + (c.dname ? '(' + c.dname + ')' : ''), '-' + money_(c.discount)]);
    if (Number(c.credit) > 0) sum.push(['購物金', '-' + money_(c.credit)]);
    if (Number(c.fee) > 0) sum.push(['運費', money_(c.fee)]);
    body.push(poSum_(sum, c.total, '訂單金額'));
    body.push(T('預購商品到貨後會再通知您;到貨的商品可到會員專區勾選出貨。', { wrap: true, size: 'xxs', color: '#444444', margin: 'md' }));
    body.push(T('感謝您的訂購 · coscos 韓國選物店', { size: 'xxs', color: '#999999', align: 'center', margin: 'lg' }));
    var b = { type: 'bubble', size: 'giga', header: poHead_('訂單確認', 'ORDER CONFIRMED', oid), body: { type: 'box', layout: 'vertical', paddingTop: '4px', contents: body } };
    var base = appUrl_();
    if (/^https:\/\//.test(base)) b.footer = { type: 'box', layout: 'vertical', contents: [poBtn_({ type: 'uri', label: '查看訂單明細', uri: siteUrl_('o=' + encodeURIComponent(oid)) }, true)] };
    return { type: 'flex', altText: String(alt || ('訂單 ' + oid + ' 已成立')).slice(0, 390), contents: b };
  } catch (e) { return null; }
}
/** 到貨通知卡片(LINE Flex) */
function arrFlex_(o, names, alt) {
  try {
    var T = flexT_, oid = String(o.訂單ID);
    var body = [T(String(o.姓名 || '') + ' 您好,您訂購的商品到貨囉 🎉', { wrap: true, size: 'sm', color: PO_.ink, margin: 'md' })];
    var rows = [{ type: 'box', layout: 'horizontal', backgroundColor: PO_.ink, paddingAll: '6px', contents: [T('#', { size: 'xxs', color: '#FFFFFF', weight: 'bold', flex: 1 }), T('已到貨商品', { size: 'xxs', color: '#FFFFFF', weight: 'bold', flex: 12 })] }];
    names.slice(0, 20).forEach(function (nm, n) { rows.push({ type: 'box', layout: 'horizontal', paddingAll: '6px', backgroundColor: n % 2 ? PO_.zebra : '#FFFFFF', contents: [T(String(n + 1), { size: 'xxs', color: PO_.mute, flex: 1 }), T(nm, { size: 'xs', color: PO_.ink, wrap: true, flex: 12 })] }); });
    body.push({ type: 'box', layout: 'vertical', margin: 'md', contents: rows });
    if (names.length > 20) body.push(T('…其他 ' + (names.length - 20) + ' 項', { size: 'xxs', color: PO_.mute, margin: 'sm' }));
    body.push(T('請到會員專區的「訂單明細」勾選要出貨的商品,按「確定出貨」就會幫您安排出貨 ❤️', { wrap: true, size: 'xs', color: '#444444', margin: 'md' }));
    body.push(T('感謝您的訂購 · coscos 韓國選物店', { size: 'xxs', color: '#999999', align: 'center', margin: 'lg' }));
    var b = { type: 'bubble', size: 'giga', header: poHead_('到貨通知', 'ARRIVAL NOTICE', oid), body: { type: 'box', layout: 'vertical', paddingTop: '4px', contents: body } };
    var u = siteUrl_('o=' + encodeURIComponent(oid));
    if (u) b.footer = { type: 'box', layout: 'vertical', contents: [poBtn_({ type: 'uri', label: '確認到貨商品', uri: u }, true)] };
    return { type: 'flex', altText: String(alt || '商品到貨通知').slice(0, 390), contents: b };
  } catch (e) { return null; }
}
/** 出貨通知卡片(LINE Flex):版面同後台列印的「訂購單」,再加上物流單號與按鈕 */
var PO_ = { ink: '#222222', mute: '#888888', line: '#DDDDDD', zebra: '#F7F7F7', pink: '#E8AEA0', pinkSoft: '#FAEEEA' };
function poBtn_(act, pri) { return { type: 'button', style: pri ? 'primary' : 'secondary', color: pri ? PO_.pink : PO_.pinkSoft, height: 'sm', action: act, flex: 1 }; }
function siteUrl_(q) { var base = appUrl_(); return /^https:\/\//.test(base) ? base + (base.indexOf('?') >= 0 ? '&' : '?') + q : ''; }
function poHead_(title, en, id) {
  var T = flexT_, base = appUrl_(), logo = /^https:\/\//.test(base) ? base.replace(/[^\/]*$/, '') + 'logo.png' : '';
  var left = [];
  if (logo) left.push({ type: 'image', url: logo, size: '40px', aspectMode: 'fit', aspectRatio: '19:20', flex: 0 });
  left.push({ type: 'box', layout: 'vertical', justifyContent: 'center', paddingStart: logo ? '8px' : '0px', contents: [T('coscos 韓國選物店', { size: 'sm', weight: 'bold', color: PO_.ink }), T('KOREA SELECT SHOP', { size: 'xxs', color: PO_.mute })] });
  return { type: 'box', layout: 'vertical', paddingAll: '16px', paddingBottom: '0px', backgroundColor: '#FFFFFF', contents: [
    { type: 'box', layout: 'horizontal', contents: [{ type: 'box', layout: 'horizontal', flex: 3, contents: left },
      { type: 'box', layout: 'vertical', flex: 2, contents: [T(title, { size: 'lg', weight: 'bold', align: 'end', color: PO_.ink }), T(en, { size: 'xxs', align: 'end', color: PO_.mute }), T(id, { size: 'xxs', align: 'end', color: PO_.ink, weight: 'bold' })] }] },
    { type: 'box', layout: 'vertical', height: '3px', backgroundColor: PO_.ink, margin: 'md', contents: [] }] };
}
function poCell_(k, v) { return { type: 'box', layout: 'vertical', flex: 1, paddingAll: '6px', contents: [flexT_(k, { size: 'xxs', color: PO_.mute }), flexT_(v || '—', { size: 'xs', color: PO_.ink, weight: 'bold', wrap: true })] }; }
function poGrid_(pairs) {
  var rows = [], k;
  for (k = 0; k < pairs.length; k += 2) rows.push({ type: 'box', layout: 'horizontal', contents: [poCell_(pairs[k][0], pairs[k][1]), pairs[k + 1] ? poCell_(pairs[k + 1][0], pairs[k + 1][1]) : { type: 'filler' }] });
  return { type: 'box', layout: 'vertical', borderWidth: '1px', borderColor: '#CCCCCC', margin: 'md', contents: rows };
}
function poTable_(items) {
  var T = flexT_, th = function (t, o) { var x = { size: 'xxs', color: '#FFFFFF', weight: 'bold' }; for (var k in o) x[k] = o[k]; return T(t, x); };
  var rows = [{ type: 'box', layout: 'horizontal', backgroundColor: PO_.ink, paddingAll: '6px', contents: [th('#', { flex: 1 }), th('品名 / 規格', { flex: 9 }), th('數量', { flex: 3, align: 'end' }), th('小計', { flex: 4, align: 'end' })] }];
  items.forEach(function (i, n) {
    rows.push({ type: 'box', layout: 'horizontal', paddingAll: '6px', backgroundColor: n % 2 ? PO_.zebra : '#FFFFFF', contents: [
      T(String(n + 1), { size: 'xxs', color: PO_.mute, flex: 1 }),
      { type: 'box', layout: 'vertical', flex: 9, contents: [T(i.name, { size: 'xs', color: PO_.ink, wrap: true })].concat(i.spec ? [T(i.spec, { size: 'xxs', color: PO_.mute, wrap: true })] : []) },
      T(String(i.qty), { size: 'xs', weight: 'bold', align: 'end', color: PO_.ink, flex: 3 }), T(money_(i.sub), { size: 'xs', align: 'end', color: PO_.ink, flex: 4 })] });
  });
  return { type: 'box', layout: 'vertical', margin: 'md', contents: rows };
}
function poSum_(rows, total, totLabel) {
  var c = rows.map(function (r) { return flexRow_(r[0], r[1], { lc: PO_.mute, rc: r[2] || PO_.ink, margin: 'xs' }); });
  c.push({ type: 'separator', margin: 'sm', color: PO_.ink });
  c.push(flexRow_(totLabel || '應付', money_(total), { lc: PO_.ink, rc: PO_.ink, bold: true, size: 'lg', margin: 'sm' }));
  return { type: 'box', layout: 'vertical', margin: 'md', contents: c };
}
/** 已出貨後推播「購物分享回饋」(設定「分享回饋通知內容」留空就不發;只發 LINE) */
function shareText_() { var v = settings_().分享回饋通知內容; return String(v === undefined ? defSet_('分享回饋通知內容') : v || '').trim(); }
function shareNotice_(s) {
  var t = shareText_(), lid = String(s['LINE ID'] || '');
  if (!t || !lid) return false;
  return pushLine_(lid, t);
}
function shipFlex_(s, alt, shipImg) {
  try {
    var T = flexT_, sid = String(s.出貨單ID), co = String(s.物流 || ''), no = String(s.物流單號 || ''), turl = trackUrl_(co, no) || shortTrack_(s);
    var ls = rows_('訂單明細').filter(function (l) { return String(l.出貨單ID) === sid; });
    var qty = ls.reduce(function (a, l) { return a + Number(l.數量 || 0); }, 0);
    var at = String(s.出貨時間 || '') || now_(), md = at.slice(5, 7) + '/' + at.slice(8, 10);
    var body = [];
    body.push({ type: 'box', layout: 'vertical', backgroundColor: PO_.zebra, paddingAll: '12px', margin: 'md', cornerRadius: '6px', contents: [
      flexRow_('🚚 ' + md + ' 已出貨', co, { lc: PO_.ink, rc: PO_.mute, margin: 'none' }),
      T(no ? no.replace(/(.{4})(?=.)/g, '$1 ') : '(尚未提供物流單號)', { size: no ? 'xxl' : 'sm', weight: 'bold', color: PO_.ink, adjustMode: 'shrink-to-fit', margin: 'sm' })] });
    body.push(poGrid_([['收件人', String(s.姓名 || '')], ['電話', String(s.電話 || '')], ['付款方式', payLabel_(s.付款方式)], ['運送方式', String(s.配送方式 || '')],
      ['訂單編號', String(s.訂單ID || '').split(',').join('、')], ['建立時間', String(s.建立時間 || '').slice(0, 16)], ['配送 / 收件資訊', String(s.收件資訊 || '') + (String(s.付款方式) === '賣貨便' && !logiOn_() ? '\n(賣貨便以實際下單超商為主)' : '')]]));
    body.push(poTable_(ls.slice(0, 20).map(function (l) { return { name: String(l.品名), spec: String(l.規格 || ''), qty: l.數量, sub: Number(l.小計 || 0) }; })));
    if (ls.length > 20) body.push(T('…其他 ' + (ls.length - 20) + ' 項', { size: 'xxs', color: PO_.mute, margin: 'sm' }));
    var sum = [['共 ' + ls.length + ' 項 / ' + qty + ' 件', ''], ['商品合計', money_(s.商品金額)]];
    if (Number(s.優惠折抵) > 0) sum.push(['優惠', '-' + money_(s.優惠折抵)]);
    if (Number(s.購物金折抵) > 0) sum.push(['購物金', '-' + money_(s.購物金折抵)]);
    sum.push(['運費', money_(s.運費)]);
    body.push(poSum_(sum, s.總額));
    if (s.備註) body.push(T('備註:' + String(s.備註), { size: 'xxs', color: '#444444', wrap: true, margin: 'md' }));
    if (shipImg) body.push(T('超商出貨單如下圖 👇', { size: 'xs', color: PO_.ink, weight: 'bold', margin: 'md' }));
    body.push(T('感謝您的訂購 · coscos 韓國選物店', { size: 'xxs', color: '#999999', align: 'center', margin: 'lg' }));
    var btn = poBtn_;
    var row = [];
    if (no) row.push(btn({ type: 'clipboard', label: '① 複製單號', clipboardText: no }));
    if (turl) row.push(btn({ type: 'uri', label: (no ? '② ' : '') + '物流查件', uri: turl }, true));
    var foot = []; if (row.length) foot.push({ type: 'box', layout: 'horizontal', spacing: 'sm', contents: row });
    var base = appUrl_(); if (/^https:\/\//.test(base)) foot.push(btn({ type: 'uri', label: '在網站查看訂購單', uri: base + (base.indexOf('?') >= 0 ? '&' : '?') + 's=' + encodeURIComponent(sid) }));
    var b = { type: 'bubble', size: 'giga', header: poHead_('訂購單', 'PURCHASE ORDER', sid), body: { type: 'box', layout: 'vertical', paddingTop: '4px', contents: body } };
    if (foot.length) b.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: foot };
    return { type: 'flex', altText: String(alt || '出貨通知').slice(0, 390), contents: b };
  } catch (e) { return null; }
}
/** 發票開立通知卡片(LINE Flex):粉色標題列樣式 */
function invFlex_(s, inv, alt) {
  try {
    var T = flexT_, sid = String(s.出貨單ID), no = String(inv.no || ''), d = String(inv.date || '').slice(0, 10);
    var ph = nz_(s.電話), car = /^09\d{8}$/.test(ph) ? '手機 ' + ph.slice(0, 4) + '***' + ph.slice(7) : '綠界載具';
    var b = { type: 'bubble', size: 'giga',
      header: { type: 'box', layout: 'horizontal', backgroundColor: BR_.acc, paddingAll: '14px', contents: [T('🧾 電子發票已開立', { color: '#FFFFFF', weight: 'bold', flex: 0 }), T(sid, { color: '#F6DCD5', size: 'xs', align: 'end', gravity: 'center' })] },
      hero: flexHero_('發票號碼', no.replace(/^([A-Z]{2})(\d+)$/, '$1-$2')),
      body: { type: 'box', layout: 'vertical', backgroundColor: BR_.paper, paddingAll: '16px', contents: [
        flexRow_('開立日期', d, { margin: 'none' }), flexRow_('隨機碼', String(inv.rand || '—')), { type: 'box', layout: 'horizontal', margin: 'sm', contents: [T('發票載具', { size: 'sm', color: BR_.mute, flex: 0 }), T('綠界載具 ' + car, { size: 'sm', color: BR_.ink, align: 'end', wrap: true })] },
        { type: 'separator', margin: 'md', color: BR_.line },
        flexRow_('發票金額', money_(s.總額), { bold: true, size: 'lg', margin: 'md' }),
        T('發票已存在綠界載具,可歸戶到財政部手機條碼,用「統一發票兌獎」App 自動對獎', { size: 'xxs', color: BR_.mute, wrap: true, margin: 'md' })] } };
    var base = appUrl_(); if (/^https:\/\//.test(base)) b.footer = { type: 'box', layout: 'vertical', backgroundColor: BR_.paper, contents: [flexBtn_('', { type: 'uri', label: '到會員專區查看', uri: base + (base.indexOf('?') >= 0 ? '&' : '?') + 's=' + encodeURIComponent(sid) }, true)] };
    return { type: 'flex', altText: String(alt || '電子發票已開立').slice(0, 390), contents: b };
  } catch (e) { return null; }
}
var LINE_ERR_ = '';
/** 出貨單改成「已出貨」時,用 LINE 通知客人(內容在設定頁);回傳結果文字 */
function notifyShipped_(s, key, subj, quiet, extra) {
  key = key || '出貨通知內容'; subj = subj || '出貨通知';
  var st = settings_(), tpl = String(st[key] === undefined ? defSet_(key) : st[key] || '');
  var lid = String(s['LINE ID'] || ''), em = '';
  if (!tpl) return quiet ? '' : '未設定' + key + ',沒有發送通知';
  if (!lid) {
    var o1 = rows_('訂單').filter(function (x) { return String(s.訂單ID).split(',').indexOf(String(x.訂單ID)) >= 0 && x.電子郵件; })[0];
    em = o1 ? String(o1.電子郵件) : '';
    if (!em) return quiet ? '' : '此客人沒有 LINE 也沒有 Email,沒有發送通知';
  }
  var co = String(s.物流 || ''), no = String(s.物流單號 || ''), url = shortTrack_(s);
  var shipImg = key === '出貨通知內容' && /^https:\/\//.test(String(s.出貨單圖片 || '')) ? String(s.出貨單圖片) : '';
  var vals = { '附圖': shipImg ? '👇' : '', '出貨單號': String(s.出貨單ID), '物流': co, '物流單號': no, '追蹤連結': url, '姓名': String(s.姓名 || ''), '連結': appUrl_() };
  var lines = tpl.split('\n').filter(function (ln) {
    return !Object.keys(vals).some(function (k) { return ln.indexOf('{' + k + '}') >= 0 && !vals[k]; });
  }).map(function (ln) { return Object.keys(vals).reduce(function (t, k) { return t.split('{' + k + '}').join(vals[k]); }, ln); });
  var msg = lines.join('\n');
  if (em) return mailTo_(em, '【' + (st.店名 || 'coscos') + '】' + subj + ' ' + vals['出貨單號'], msg + (shipImg ? '\n出貨單圖片:' + shipImg : '')) ? '已用 Email 通知客人' : 'Email 發送失敗';
  var fx = key === '出貨通知內容' ? shipFlex_(s, msg, shipImg) : null;
  return pushLine_(lid, msg, shipImg ? [shipImg] : null, fx, extra ? [extra] : null) ? '已用 LINE 通知客人' + (shipImg ? '(含出貨單圖片)' : '') : 'LINE 通知發送失敗(客人可能未加好友)';
}
/** 沒有 LINE 的客人(遊客)改用 Email 通知;回傳是否成功 */
function mailTo_(to, subject, body) {
  try { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(to))) return false; MailApp.sendEmail({ to: String(to), subject: subject, body: body, name: String(settings_().店名 || 'coscos') }); return true; }
  catch (e) { return false; }
}
/** 第一次部署後,請在編輯器執行一次 authAll,授權雲端硬碟(商品圖片)與寄信(遊客通知) */
function authAll() { DriveApp.getRootFolder(); return 'Drive/Mail OK, 今日剩餘寄信額度 ' + MailApp.getRemainingDailyQuota(); }
/** 補發到貨通知:對指定訂單,把「已到貨、還沒建立出貨單」的品項重新發一次到貨通知(LINE;沒 LINE 有 email 就寄信) */
function adminResendArrival(tk, oids) {
  var u = me_(tk), want = {}, arr = {};
  [].concat(oids || []).slice(0, 300).forEach(function (x) { want[String(x)] = 1; });
  rows_('訂單明細').forEach(function (l) { var oid = String(l.訂單ID); if (want[oid] && String(l.到貨狀態) === '已到貨' && !String(l.出貨單ID || '')) (arr[oid] = arr[oid] || []).push(String(l.品名)); });
  var n = Object.keys(arr).length;
  if (!n) throw new Error('勾選的訂單沒有「已到貨、還沒出貨」的品項,不需要補發');
  var r = notifyArrival_(arr);
  lk_(function () { Object.keys(arr).forEach(function (oid) { log_(u.acc, '補發到貨通知', oid, arr[oid].join('、')); }); });
  r.orders = n; r.skipped = Object.keys(want).length - n;
  r.msg = '已補發到貨通知:成功 ' + r.sent + ' 張' + (r.failed ? ',失敗 ' + r.failed + ' 張(LINE 額度或封鎖)' : '') + (r.noLine ? ',沒有 LINE/email ' + r.noLine + ' 張' : '') + (r.skipped ? '\n略過 ' + r.skipped + ' 張(沒有已到貨未出貨的品項)' : '');
  return r;
}
function notifyArrival_(arr) {
  var tpl = String(settings_().到貨通知內容 || ''), r = { sent: 0, noLine: 0, failed: 0 };
  Object.keys(arr).forEach(function (oid) {
    var o = rows_('訂單').filter(function (x) { return String(x.訂單ID) === oid; })[0]; if (!o) return;
    var lid = String(o['LINE ID'] || ''), em = String(o.電子郵件 || '');
    var names = arr[oid].filter(function (x, i, a) { return a.indexOf(x) === i; }).join('、');
    var text = tpl.split('{姓名}').join(o.姓名).split('{品名}').join(names).split('{訂單}').join(oid).split('{連結}').join(appUrl_());
    if (lid) { if (pushLine_(lid, text, null, arrFlex_(o, arr[oid].filter(function (x, i, a) { return a.indexOf(x) === i; }), text))) r.sent++; else r.failed++; }
    else if (em) { if (mailTo_(em, '【' + (settings_().店名 || 'coscos') + '】商品到貨通知', text)) r.sent++; else r.failed++; }
    else r.noLine++;
  });
  return r;
}

/* --- 到貨通知助理:管理員把廠商的到貨通知(文字/圖片)轉傳到官方 LINE,系統解析後先回預覽,回「確認」才入帳 --- */
var ARR_KEY_ = 'arrpend';
function setSet_(k, v) {
  var ex = rows_('設定').filter(function (r) { return r.項目 === k; })[0];
  put_('設定', ex ? ex._r : 0, { '項目': k, '值': v });
}
/** 回覆的人是誰(寫進操作紀錄、通知另一位):到貨管理員或後台綁定時填的確認人員名稱 */
function arrWho_(uid) { var st = settings_(); return String(st.到貨管理員LINE || '') === String(uid) ? '到貨管理員' : String(st['確認人員 ' + uid] || '確認人員'); }
function arrIsAdmin_(uid) { var a = String(settings_().到貨管理員LINE || ''); return (!!a && a === String(uid)) || (!!uid && cbTargets_().indexOf(String(uid)) >= 0); }
/** 酷柏到貨的通知對象:到貨管理員＋設定「酷柏通知對象」(只收 LINE ID,多個用逗號分開)。
    不用姓名/暱稱去找:那兩個欄位客人自己就能填,任何人改名成「乙宣」就會變成到貨管理員、收到成本與客人資料。 */
function cbTargets_() {
  var st = settings_(), out = [], add = function (u) { u = String(u || '').trim(); if (/^U[0-9A-Za-z]{4,40}$/.test(u) && out.indexOf(u) < 0) out.push(u); };
  add(st.到貨管理員LINE);
  String(st.酷柏通知對象 || '').split(/[,，、\s]+/).forEach(add);
  return out;
}
function cbTell_(text) { var n = 0; cbTargets_().forEach(function (u) { if (pushLine_(u, String(text).slice(0, 4900))) n++; }); return n; }
function arrPend_() { try { return JSON.parse(CacheService.getScriptCache().get(ARR_KEY_) || '[]'); } catch (e) { return []; } }
function arrSave_(a) { var c = CacheService.getScriptCache(); if (a.length) c.put(ARR_KEY_, JSON.stringify(a), 21600); else c.remove(ARR_KEY_); }
/** 後台產生一次性綁定碼(到官方 LINE 傳「綁定管理員 碼」完成綁定) */
function adminArrivalCode(tk) {
  var u = me_(tk), code = '';
  lk_(function () {
    var cs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 6; i++) code += cs.charAt(Math.floor(Math.random() * cs.length));
    setSet_('到貨綁定碼', code);
    log_(u.acc, '產生到貨綁定碼', '', '');
  });
  return { code: code, bound: !!String(settings_().到貨管理員LINE || '') };
}
/** 後台新增酷柏到貨確認人員:產生一次性綁定碼(到官方 LINE 傳「綁定確認人員 碼」),綁好後加進「酷柏通知對象」 */
function adminConfirmCode(tk, name) {
  var u = me_(tk), code = '', nm = t_(String(name || '').trim(), 20);
  if (!nm) throw new Error('請填確認人員的名字');
  lk_(function () {
    var cs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 6; i++) code += cs.charAt(Math.floor(Math.random() * cs.length));
    setSet_('確認人員綁定碼', code + '|' + nm);
    log_(u.acc, '產生確認人員綁定碼', nm, '');
  });
  return { code: code };
}
/** 後台移除一位確認人員(id = LINE ID 末 6 碼) */
function adminConfirmUnbind(tk, id) {
  var u = me_(tk), out = [];
  lk_(function () {
    var st = settings_(), ls = String(st.酷柏通知對象 || '').split(/[,，、\s]+/).filter(Boolean);
    var hit = ls.filter(function (x) { return x.slice(-6) === String(id); });
    hit.forEach(function (x) { log_(u.acc, '移除確認人員', String(st['確認人員 ' + x] || ''), x.slice(-6)); setSet_('確認人員 ' + x, ''); });
    setSet_('酷柏通知對象', ls.filter(function (x) { return hit.indexOf(x) < 0; }).join(','));
  });
  return { confirmers: arrConfirmers_() };
}
function arrConfirmers_() {
  var st = settings_();
  return String(st.酷柏通知對象 || '').split(/[,，、\s]+/).filter(function (x) { return /^U[0-9A-Za-z]{4,40}$/.test(x); }).map(function (x) { return { id: x.slice(-6), name: String(st['確認人員 ' + x] || '(沒有名字)') }; });
}
function adminArrivalUnbind(tk) {
  var u = me_(tk);
  lk_(function () { setSet_('到貨管理員LINE', ''); setSet_('到貨綁定碼', ''); arrSave_([]); log_(u.acc, '解除到貨管理員綁定', '', ''); });
  return { bound: false };
}
/** 處理官方 LINE 收到的文字:回傳 {reply} 直接回覆、{ai:true} 交給解析、null 忽略 */
function arrText_(uid, text) {
  text = String(text || '').trim();
  var m = text.match(/^綁定管理員\s*([0-9A-Za-z]{4,12})$/);
  if (m) {
    var code = String(settings_().到貨綁定碼 || '');
    if (!code || m[1].toUpperCase() !== code.toUpperCase()) return { reply: '綁定碼不正確或已失效,請回後台重新產生。' };
    setSet_('到貨管理員LINE', String(uid)); setSet_('到貨綁定碼', '');
    log_('到貨助理', '綁定管理員', String(uid), '');
    return { reply: '✅ 已綁定為到貨管理員。\n之後把廠商的到貨通知(文字或截圖)轉傳到這裡,我會對應訂單先回預覽,你回「確認」才會真正入帳並通知客人。' };
  }
  var mc = text.match(/^綁定確認人員\s*([0-9A-Za-z]{4,12})$/);
  if (mc) {
    var cv = String(settings_().確認人員綁定碼 || ''), ci = cv.indexOf('|');
    if (ci < 1 || mc[1].toUpperCase() !== cv.slice(0, ci).toUpperCase()) return { reply: '綁定碼不正確或已失效,請回後台重新產生。' };
    var ls = String(settings_().酷柏通知對象 || '').split(/[,，、\s]+/).filter(Boolean);
    if (ls.indexOf(String(uid)) < 0) ls.push(String(uid));
    setSet_('酷柏通知對象', ls.slice(-5).join(',')); setSet_('確認人員 ' + uid, cv.slice(ci + 1)); setSet_('確認人員綁定碼', '');
    log_('到貨助理', '綁定確認人員', cv.slice(ci + 1), String(uid).slice(-6));
    return { reply: '✅ 已綁定為酷柏到貨確認人員(' + cv.slice(ci + 1) + ')。\n之後店面(酷柏)到貨遇到規格對不上的品項、或多出來沒有訂單在等的貨,會傳到這裡請你確認;你或到貨管理員任一位回覆代號(或「上架 全部」;已人工處理好的回「已處理 全部」)就會處理。' };
  }
  if (!arrIsAdmin_(uid)) return null;
  if (/^酷柏$/.test(text)) return cbPend_().length ? { ai: true, cb: true } : { reply: '目前沒有待對應的酷柏到貨。' };
  if (/^酷柏清除$/.test(text)) {
    var cn = cbPend_().length; cbPendSave_([]); arrSave_(arrPend_().filter(function (pl) { return !(pl.cb && pl.cb.length); }));
    if (cn) log_('到貨助理', '清除酷柏待對應', '', cn + ' 項(沒有入帳)');
    return { reply: cn ? '已清除 ' + cn + ' 項待對應的酷柏到貨(這些沒有入帳,請確認已在後台手動處理)。' : '目前沒有待對應的酷柏到貨。' };
  }
  var who = arrWho_(uid), fw = function (pr) { cbTargets_().forEach(function (u) { if (u !== String(uid)) pushLine_(u, ('已由' + who + '回覆「' + text + '」處理:\n' + pr).slice(0, 4900)); }); return { reply: pr }; }; // 另一位不用重複處理
  if (/^([A-Za-z]\s*(刪除|删除|刪|删)[\s,，、]*)+$/.test(text) && cbPend_().length) return fw(cbPendDrop_(text, who));
  if (/^[A-Za-z]$/.test(text) && cbPend_().length) return { reply: cbPendOne_(text.toUpperCase()) }; // 只回代號(例「A」):告訴她這項可以回什麼,不要丟給 AI 解析
  if ((/^([A-Za-z]\s*\d{1,2}[\s,，、]*)+$/.test(text) || /^[A-Za-z]\s*[+＋]/.test(text)) && cbPend_().length) return fw(cbPick_(text, who));
  // 2026-11-26 Jack:酷柏到貨多出來的貨(待到貨的庫存進貨)要管理員確認後才自動上架:回「上架 全部」或「上架 K0012 K0015」
  var mU = text.replace(/\s+/g, ' ').match(/^(?:全部上架|上架\s*全部|上架((?:[\s,，、]*K\d+)+))$/i);
  if (mU) return fw(cbHoldUp_(mU[1] ? mU[1].toUpperCase().match(/K\d+/g) : null, uid));
  // 2026-11-26 Jack:多出來的貨已經人工處理(後台手動上架、給了客人、退回等)→ 回「已處理 全部」或「已處理 K0012」結案:這筆庫存進貨移除(不上架、不動庫存),不再提醒
  var mD = text.replace(/\s+/g, ' ').match(/^(?:全部(?:已處理|結案)|(?:已處理|結案)\s*全部|(?:已處理|結案)((?:[\s,，、]*K\d+)+))$/i);
  if (mD) return fw(cbHoldDone_(mD[1] ? mD[1].toUpperCase().match(/K\d+/g) : null, uid));
  if (/^(待上架|多出來|現貨待確認)$/.test(text)) return { reply: cbHoldText_() };
  if (/^(確認|確定|ok|OK|Ok)$/.test(text)) return { reply: arrApply_() };
  if (cbOn_() && /酷柏|coolbau/i.test(text) && /到貨|到货|入庫|已到/.test(text)) return { reply: '🔄 這看起來是酷柏的到貨通知。酷柏到貨現在會自動同步入帳並通知客人,不需要再轉傳,這次沒有做任何變更。\n(其他廠商的到貨通知照常轉傳即可)' };
  if (/^取消$/.test(text)) { var n = arrPend_().length; arrSave_([]); return { reply: n ? '已取消,沒有任何變更。' : '目前沒有待確認的到貨。' }; }
  return { ai: true };
}
/** 只回一個代號(例「A」)時:列出這一項的選項 */
function cbPendOne_(L) {
  var x = cbPend_().filter(function (y) { return y.code === L; })[0];
  if (!x) return '目前待對應裡沒有「' + L + '」。回「酷柏」可以看全部待對應的品項。';
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var c = (x.cand || []).filter(function (c) { return prods[c[0]]; });
  return L + '｜' + x.title + (x.spec && !x.single ? '(' + x.spec + ')' : '') + ' ×' + x.qty + '\n請在代號後面加數字回覆:\n' +
    c.map(function (c, k) { return '・' + L + (k + 1) + ' → 入帳到 ' + c[0] + ' ' + String(prods[c[0]].名稱) + (c[1] ? '(' + c[1] + ')' : ''); }).join('\n') + (c.length ? '\n' : '') +
    (x.np && prods[x.np.pid] ? '・' + L + '+ → 在 ' + x.np.pid + ' 新增規格「' + x.np.name + '」並入帳\n' : '') +
    '・' + L + '0 → 都不是(先不入帳)\n・' + L + '刪 → 已在後台手動處理/不用入帳,從待對應移除';
}
/** 酷柏到貨多出來、等確認上架的庫存進貨(待到貨,建立人 酷柏到貨) */
function cbHeld_() { return rows_('庫存進貨').filter(function (k) { return String(k.到貨狀態) === '待到貨' && String(k.建立人) === '酷柏到貨'; }); }
function cbHoldText_() {
  var h = cbHeld_();
  if (!h.length) return '目前沒有等確認上架的酷柏多出來的貨。';
  return '❓ 酷柏到貨多出來、等確認上架的貨(' + h.length + ' 筆):\n' + h.map(function (k) { return '・' + k.訂單ID + ' ' + k.品名 + (k.規格 ? '(' + k.規格 + ')' : '') + ' ×' + k.數量; }).join('\n') + '\n' + CB_HOLD_HOW_;
}
var CB_HOLD_HOW_ = '回「上架 全部」全部上架;只上架其中幾筆回「上架 K0012 K0015」。\n已經人工處理好的回「已處理 全部」或「已處理 K0012」結案(不上架、不再提醒)。';
/** 管理員回「已處理」:多出來的貨已人工處理 → 移除這筆待到貨的庫存進貨(不上架、不動庫存),記操作紀錄與重大事件(保留刪除前資料)。ids 為 null 代表全部 */
function cbHoldDone_(ids, uid) {
  var who = '到貨助理(' + arrWho_(uid) + ')';
  var out = [], miss = [], bad = [];
  lk_(function () {
    var h = cbHeld_(), want = ids ? ids.map(String) : null;
    if (want) want.forEach(function (id) { if (!h.some(function (k) { return String(k.訂單ID) === id; })) miss.push(id); });
    h.filter(function (k) { return !want || want.indexOf(String(k.訂單ID)) >= 0; }).forEach(function (k) {
      var tx = k.訂單ID + ' ' + k.品名 + (k.規格 ? '(' + k.規格 + ')' : '') + ' ×' + k.數量;
      try { deleteStockIn_({ acc: who }, String(k.訂單ID)); log_(who, '人工處理結案', tx, '酷柏到貨多出來的貨,管理員在 LINE 回已處理(不上架、不動庫存)'); out.push('・' + tx); }
      catch (e) { bad.push('・' + tx + ':' + e.message); }
    });
  });
  if (!out.length && !bad.length) return (miss.length ? '找不到這些編號(可能已處理或不是酷柏多出來的貨):' + miss.join('、') + '\n' : '') + cbHoldText_();
  var left = cbHeld_().length;
  return (out.length ? '✅ 已結案 ' + out.length + ' 筆(人工處理,沒有上架、沒有動庫存,不再提醒):\n' + out.join('\n') : '') +
    (bad.length ? (out.length ? '\n' : '') + '⚠️ 這些沒辦法結案,請到後台處理:\n' + bad.join('\n') : '') +
    (miss.length ? '\n找不到:' + miss.join('、') : '') + (left ? '\n還有 ' + left + ' 筆等確認,回「待上架」查看。' : '');
}
/** 管理員確認上架:待到貨 → 已到貨,先照下單順序分給在等的訂單,剩下的加進現貨並通知「有現貨可以販售」。ids 為 null 代表全部 */
function cbHoldUp_(ids, uid) {
  var who = '到貨助理(' + arrWho_(uid) + ')';
  var out = [], miss = [], kept = [];
  lk_(function () {
    var h = cbHeld_(), want = ids ? ids.map(String) : null;
    if (want) want.forEach(function (id) { if (!h.some(function (k) { return String(k.訂單ID) === id; })) miss.push(id); });
    var go = h.filter(function (k) { return !want || want.indexOf(String(k.訂單ID)) >= 0; });
    RDYN_ = [];
    go.forEach(function (k) {
      var n = cp_(k); n.到貨狀態 = '已到貨'; n.到貨操作人 = who; n.到貨時間 = now_(); put_('庫存進貨', k._r, n);
      log_(who, '確認上架', k.訂單ID + ' ' + k.品名, '酷柏到貨多出來的 ' + k.數量 + ' 件,管理員在 LINE 確認上架');
      var t = kFifo_(String(k.訂單ID), who);
      if (/^❓/.test(t)) { kept.push(t); return; } // 可能有訂單在等(寫法不同):維持待到貨,不算上架
      out.push('・' + k.訂單ID + ' ' + k.品名 + (k.規格 ? '(' + k.規格 + ')' : '') + ' ×' + k.數量 + (t ? '\n  ' + t.split('\n')[0] : ''));
    });
  });
  var tell = RDYN_.length; cbRdyTell_(null);
  var kt = kept.length ? '\n\n' + kept.join('\n\n') : '';
  if (!out.length) return (miss.length ? '找不到這些編號(可能已處理或不是酷柏多出來的貨):' + miss.join('、') + '\n' : '') + (kept.length ? kt.slice(2) : cbHoldText_());
  return '✅ 已確認上架 ' + out.length + ' 筆:\n' + out.join('\n') + (tell ? '\n已通知「有現貨可以販售」。' : '') + (miss.length ? '\n找不到:' + miss.join('、') : '') + kt;
}
/** 給解析用的商品清單:商品ID|名稱|規格|待到貨件數(有待到貨的排前面) */
function arrCands_() {
  var out = {};
  rows_('訂單明細').forEach(function (l) {
    if (String(l.到貨狀態) === '已到貨' || String(l.到貨狀態) === '已出貨' || l.出貨單ID) return;
    var k = bp_(l.商品ID) + '|' + String(l.規格 || ''); out[k] = (out[k] || 0) + Number(l.數量);
  });
  var rows = rows_('商品').map(function (p) {
    var sl = specs_(p), id = String(p.商品ID), n = 0;
    if (sl.length) sl.forEach(function (sp) { n += out[id + '|' + sp] || 0; }); else n = out[id + '|'] || 0;
    var o = {}; sl.forEach(function (sp) { o[sp] = out[id + '|' + sp] || 0; });
    return { n: n, t: id + '|' + String(p.名稱) + '|' + (sl.length ? sl.map(function (sp) { return sp + (o[sp] ? '(待' + o[sp] + ')' : ''); }).join('/') : '無規格' + (n ? '(待' + n + ')' : '')) };
  });
  rows.sort(function (a, b) { return (b.n > 0) - (a.n > 0); });
  return rows.slice(0, 400).map(function (r) { return r.t; }).join('\n');
}
/** 依下單時間先後分配到貨,多的轉現貨庫存,存成待確認的計畫並回傳預覽文字 */
function arrPlan_(items, opt) {
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var pend = arrPend_(), taken = {}, ords = {}, mem = {};
  pend.forEach(function (pl) { pl.assign.forEach(function (a) { taken[a.oid + '|' + a.pid] = (taken[a.oid + '|' + a.pid] || 0) + Number(a.qty); }); }); // 待確認預覽已經分掉的件數
  rows_('訂單').forEach(function (o) { ords[String(o.訂單ID)] = o; });
  rows_('會員').forEach(function (m) { mem[String(m['LINE ID'])] = m; });
  var agg = {}, order = [], unk = [], cbSkip = [];
  // 酷柏到貨已自動同步:手動轉傳的到貨通知裡,廠商是酷柏的品項一律略過,避免同一批貨入帳兩次
  var cbOn = !opt && cbOn_(), vend = {};
  if (cbOn) rows_('商品_內部').forEach(function (r) { vend[String(r.商品ID)] = String(r.廠商 || ''); });
  (items || []).forEach(function (it) {
    var pid = String(it.pid || ''), p = prods[pid], q = Math.floor(Number(it.qty)), tx = String(it.text || it.name || '?').slice(0, 40);
    if (!p || !(q >= 1)) { unk.push(tx); return; }
    if (cbOn && vend[pid] === '酷柏') { cbSkip.push(String(p.名稱) + (it.spec ? '(' + String(it.spec).trim() + ')' : '') + ' ×' + q); return; }
    var sl = specs_(p), sp = String(it.spec || '').trim();
    if (sl.length && sl.indexOf(sp) < 0) { unk.push(tx + '(規格對不上)'); return; }
    if (!sl.length) sp = '';
    var k = pid + '|' + sp;
    if (!agg[k]) { agg[k] = { pid: pid, spec: sp, qty: 0, price: '', name: String(p.名稱) }; order.push(k); }
    agg[k].qty += q;
    if (it.lots) agg[k].lots = (agg[k].lots || []).concat(it.lots.map(function (x) { return [Number(x[0]), Number(x[1]), String(x[2] || '')]; })); // 酷柏:這批貨每件的成本與批發單編號(依酷柏下單先後)
    if (it.price !== null && it.price !== undefined && it.price !== '' && Number(it.price) > 0) agg[k].price = Number(it.price);
  });
  var plan = { assign: [], surplus: [], unk: unk, skip: [], cb: (opt && opt.cb) || [], cost: {} }, msg = [];
  var lines = rows_('訂單明細');
  order.forEach(function (k) {
    var a = agg[k], left = a.qty, got = [];
    if (a.lots && a.price !== '') plan.cost[a.pid] = a.price; // 酷柏:商品成本跟著最新進價
    var cand = lines.filter(function (l) {
      return arrEq_(l, a, prods) && ['已到貨', '已出貨'].indexOf(String(l.到貨狀態)) < 0 && !l.出貨單ID && (taken[l.訂單ID + '|' + l.商品ID] || 0) < Number(l.數量) && ords[String(l.訂單ID)];
    }).sort(function (x, y) {
      var tx = String(ords[String(x.訂單ID)].下單時間 || ''), ty = String(ords[String(y.訂單ID)].下單時間 || '');
      return tx < ty ? -1 : tx > ty ? 1 : (String(x.訂單ID) < String(y.訂單ID) ? -1 : 1);
    });
    // 不確定的(規格寫法不同、舊商品頁)排在裡面:自動入帳時整項先不分,列出可能在等的訂單請老闆確認,避免跳過先下單的客人
    var unsure = cand.filter(function (l) { return arrEq_(l, a, prods) !== 'exact'; });
    if (unsure.length && opt && opt.auto) {
      var ul = cand.slice(0, 8).map(function (l) { var o = ords[String(l.訂單ID)]; return l.訂單ID + ' ' + buyerName_(o, mem) + '(' + String(o.下單時間 || '').slice(5, 10) + (arrEq_(l, a, prods) !== 'exact' ? ',' + (l.品名 || '') + (l.規格 ? ' ' + l.規格 : '') : '') + ')×' + (Number(l.數量) - (taken[l.訂單ID + '|' + l.商品ID] || 0)); });
      var tsu = a.lots && a.lots.length ? cbTake_(a.lots, left) : null;
      plan.surplus.push({ pid: a.pid, spec: a.spec, qty: left, price: tsu && tsu.cost !== '' ? tsu.cost : a.price, cw: tsu ? tsu.parts : [], name: a.name, unsure: ul });
      msg.push('・' + a.name + (a.spec ? '(' + a.spec + ')' : '') + ' 到 ' + a.qty + ' 件\n  ❓ 可能有人在等(寫法不同,不確定),先不分:' + ul.join('、'));
      return;
    }
    // 照下單先後分:先下單的先拿;到貨數不夠這位客人的數量就拆單(先到幾件算幾件,剩下的留在原本的順位繼續等),不會跳給後面的客人
    cand.forEach(function (l) {
      if (left <= 0) return;
      var k = l.訂單ID + '|' + l.商品ID, q = Number(l.數量) - (taken[k] || 0), o = ords[String(l.訂單ID)], who = buyerName_(o, mem), take = Math.min(q, left);
      var tk = a.lots ? cbTake_(a.lots, take) : null; left -= take; taken[k] = (taken[k] || 0) + take;
      plan.assign.push({ oid: String(l.訂單ID), pid: String(l.商品ID), name: a.name, spec: a.spec, qty: take, who: who, cost: tk ? tk.cost : '', cw: tk ? tk.parts : [] });
      got.push('  ✔ ' + l.訂單ID + ' ' + who + ' ×' + take + (take < q ? '(訂 ' + q + ' 件,先到 ' + take + ' 件,剩 ' + (q - take) + ' 件繼續等)' : '') + (arrEq_(l, a, prods) !== 'exact' ? ' ⚠️寫法不同(' + (l.品名 || '') + (l.規格 ? ' ' + l.規格 : '') + '),請確認是同一個' : ''));
    });
    if (left > 0) { var ts = a.lots && a.lots.length ? cbTake_(a.lots, left) : null; plan.surplus.push({ pid: a.pid, spec: a.spec, qty: left, price: ts && ts.cost !== '' ? ts.cost : a.price, cw: ts ? ts.parts : [], name: a.name }); got.push(opt && opt.auto ? '  ❓ 沒有訂單在等 ×' + left + '(先不上現貨,待確認)' : '  ➕ 現貨庫存 ×' + left); }
    msg.push('・' + a.name + (a.spec ? '(' + a.spec + ')' : '') + ' 到 ' + a.qty + ' 件' + (a.price !== '' ? ',進價 ' + a.price : '') + '\n' + (got.join('\n') || '  (沒有待到貨的訂單)'));
  });
  var head = (opt && opt.head) || '📦 到貨預覽';
  var cbNote = cbSkip.length ? '\n🔄 以下是酷柏的商品,酷柏到貨現在會自動同步入帳,不需要轉傳,這次沒有處理:\n・' + cbSkip.join('\n・') : '';
  if (cbSkip.length && !order.length && !unk.length) return '🔄 這是酷柏的到貨,現在酷柏到貨會自動同步入帳並通知客人,不需要再轉傳,這次沒有做任何變更。\n・' + cbSkip.join('\n・');
  if (!plan.assign.length && !plan.surplus.length) return head + '\n看不出可入帳的品項。' + cbNote + (unk.length ? '\n對不上商品:' + unk.join('、') : '') + '\n請再傳清楚一點的通知,或到後台手動處理。';
  if (opt && opt.auto) opt.plan = plan; else { pend.push(plan); arrSave_(pend); }
  var t = head + (pend.length > 1 && !(opt && opt.auto) ? '(第 ' + pend.length + ' 則,待確認共 ' + pend.length + ' 則)' : '') + '\n' + msg.join('\n');
  if (plan.skip.length) t += '\n⚠️ ' + plan.skip.join('\n⚠️ ');
  if (unk.length) t += '\n⚠️ 對不上商品(不處理):' + unk.join('、');
  t += cbNote;
  return t + (opt && opt.auto ? '' : '\n\n回「確認」入帳並通知客人;回「取消」放棄。');
}
/** 到貨品項(商品 a.pid、規格 a.spec)可以分給這列訂單品項嗎:
   同商品同規格(寫法不同也算,例「杏仁沙色EU40」=「杏仁沙色 / EU40」);
   或是同貨號的舊商品(以前一個顏色一個商品,例 …（OZ3035）#SAND 規格 40)而顏色、尺寸都對得上 */
function arrSpN_(s) { return String(s || '').replace(/[\s\/／|｜#＃]+/g, '').toLowerCase(); }
function arrSz_(s) { var m = String(s || '').match(/(?:EU\s*)?(\d{2})(?!\d)/i); return m ? m[1] : ''; }
function arrEq_(l, a, prods) {
  var lp = bp_(l.商品ID), ls = String(l.規格 || ''), as = String(a.spec || '');
  if (lp === a.pid) return ls === as ? 'exact' : ((!!as && arrSpN_(ls) === arrSpN_(as)) || (!as && !!prods[lp] && !specs_(prods[lp]).length)) ? 'fuzzy' : false; // 規格寫法不同/舊訂單殘留規格(例 PD3):可能是同一個,但不確定
  var p = prods[lp], ap = prods[a.pid]; if (!p || !ap) return false;
  var sku = cbSku_(ap.名稱); if (!sku || cbSku_(p.名稱) !== sku) return false;
  var ak = as.lastIndexOf(' / '), lk = ls.lastIndexOf(' / ');
  var asz = arrSz_(ak >= 0 ? as.slice(ak + 3) : as), lsz = arrSz_(lk >= 0 ? ls.slice(lk + 3) : ls);
  if (!asz || asz !== lsz) return false;
  var ac = ak >= 0 ? as.slice(0, ak) : cbColorOf_(ap.名稱, ''), lc = lk >= 0 ? ls.slice(0, lk) : cbColorOf_(p.名稱, '');
  if (!String(ac).trim() && !String(lc).trim()) return 'fuzzy';
  return (!!String(ac).trim() && !!String(lc).trim() && cbSameClr_(ac, lc)) ? 'fuzzy' : false; // 同貨號的舊商品:可能是同一個,但不確定
}
/** 找到貨要入帳的那一列:原本那列還沒到就用它;已經到了(先前拆過單)就找同一張訂單、同商品同規格、還在等的那一列 */
function arrLine_(oid, pid) {
  var ls = rows_('訂單明細').filter(function (x) { return String(x.訂單ID) === oid; }), wait = function (x) { return ['已到貨', '已出貨'].indexOf(String(x.到貨狀態)) < 0 && !x.出貨單ID; };
  var l = ls.filter(function (x) { return String(x.商品ID) === pid; })[0];
  if (l && wait(l)) return l;
  if (!l) return null;
  return ls.filter(function (x) { return bp_(x.商品ID) === bp_(pid) && String(x.規格 || '') === String(l.規格 || '') && wait(x); })[0] || null;
}
/** 套用所有待確認的到貨計畫(plans 有給時只套用指定的計畫,不動待確認清單) */
function arrApply_(plans, why, who) {
  var pend = plans || arrPend_(); if (!pend.length) return '目前沒有待確認的到貨(可能已超過 6 小時失效),請重新轉傳。';
  var arrived = {}, nAs = 0, nSur = 0, nHold = 0, holdTx = [], miss = [], WHO = who || (why ? '酷柏到貨' : '到貨助理'), WHY = why || 'LINE 轉傳到貨通知';
  var meta = null;
  pend.forEach(function (pl) {
    pl.assign.forEach(function (a) {
      var l = arrLine_(a.oid, a.pid);
      if (!l) { miss.push(a.oid + ' ' + a.name); return; }
      if (Number(a.qty) < Number(l.數量)) { // 只到一部分:拆單,到的這幾件留在原列,剩下的另開一列繼續等
        var rid = lineSplit_(l, Number(a.qty)), lid = String(l.商品ID);
        log_(WHO, '拆單', a.oid + ' ' + a.name, '訂 ' + l.數量 + ' 件,先到 ' + a.qty + ' 件;剩 ' + (Number(l.數量) - Number(a.qty)) + ' 件另開一列(' + rid + ')繼續等');
        l = rows_('訂單明細').filter(function (x) { return String(x.訂單ID) === a.oid && String(x.商品ID) === lid; })[0];
      }
      var n = cp_(l); n.到貨狀態 = '已到貨'; n.可出貨 = 'Y'; n.到貨操作人 = WHO; n.到貨時間 = now_(); ordOk_(n, WHO);
      var cc = cbCost_(n, l, a.cost, meta || (meta = lineMeta_(true))); cbLink_(a.oid + '|' + a.pid, a.cw);
      put_('訂單明細', l._r, n);
      log_(WHO, '到貨', a.oid + ' ' + a.name, '到貨:' + l.到貨狀態 + '→已到貨(' + WHY + ')' + cc);
      (arrived[a.oid] = arrived[a.oid] || []).push(a.name); nAs++;
    });
    pl.surplus.forEach(function (s) {
      var p = rows_('商品').filter(function (x) { return String(x.商品ID) === s.pid; })[0];
      if (!p) { miss.push(s.name + ' 現貨'); return; }
      var inn = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === s.pid; })[0] || {};
      var id = seq_('庫存進貨', 'K');
      // 酷柏自動入帳多出來(沒有訂單在等)的貨:不自動上現貨,先記成「待到貨」的庫存進貨,等管理員在 LINE 回「上架」(或後台改成已到貨)才上架
      var hold = !!why;
      var row = { '訂單ID': id, '商品ID': s.pid, '品名': String(p.名稱), '規格': s.spec, '數量': s.qty, '到貨狀態': hold ? '待到貨' : '已到貨', '廠商': String(inn.廠商 || ''),
        '成本': s.price !== '' ? s.price : (inn.成本 === undefined ? '' : inn.成本), '成本含稅': inn.成本含稅 || 'N', '貨源': String(inn.貨源 || ''),
        '廠商付款ID': '', '到貨操作人': hold ? '' : WHO, '到貨時間': hold ? '' : now_(), '日期': today_(), '建立人': WHO, '出貨單ID': '' };
      put_('庫存進貨', 0, row); if (!hold) stockMove_(row, s.qty); cbLink_('K|' + id, s.cw);
      log_(WHO, '新增庫存進貨', id + ' ' + p.名稱, s.qty + ' 件' + (s.spec ? ',規格 ' + s.spec : '') + (hold ? ',沒有訂單在等,待確認是否上架(' + WHY + ',未加入現貨)' : ',已到貨(' + WHY + ',庫存 +' + s.qty + ')'));
      if (hold) { nHold += s.qty; holdTx.push(id + ' ' + p.名稱 + (s.spec ? '(' + s.spec + ')' : '') + ' ×' + s.qty + (s.unsure ? '\n   可能在等的訂單(寫法不同,請確認):' + s.unsure.join('、') : '')); } else nSur += s.qty;
    });
  });
  pend.forEach(function (pl) { cbInnCost_(pl.cost); });
  cbDone_(pend);
  if (!plans) arrSave_([]);
  var nt = Object.keys(arrived).length ? notifyArrival_(arrived) : { sent: 0, noLine: 0, failed: 0 };
  var t = '✅ 已入帳:客訂到貨 ' + nAs + ' 筆' + (nSur ? '、轉入現貨庫存 ' + nSur + ' 件' : '') + '。';
  if (nHold) t += '\n❓ 這 ' + nHold + ' 件沒有自動分給訂單、也沒有上現貨(沒有訂單在等,或在等的訂單寫法不同不確定):\n・' + holdTx.join('\n・') + '\n確認後回「上架 全部」就會自動上架成現貨;只上架其中幾筆請回「上架 K0012 K0015」(用上面的編號);已經人工處理好的回「已處理 全部」或「已處理 K0012」結案(不上架、不再提醒)。';
  if (Object.keys(arrived).length) t += '\n已通知客人 ' + nt.sent + ' 位' + (nt.noLine ? ',' + nt.noLine + ' 位沒有 LINE/Email 請自行聯絡' : '') + '。';
  if (miss.length) t += '\n⚠️ 這些已被別人處理或找不到,略過:' + miss.join('、');
  return t;
}

/* --- 酷柏到貨自動入帳 ---
   酷柏批發系統 KEY 到貨後,會把我們帳號這次到貨的品項直接送過來(簽章驗證在 server/core.js 的 handleCoolbau)。
   對照過的品項(設定表「酷柏對照 …」)直接入帳並通知客人;第一次遇到的品項先記在設定表「酷柏待對應」,
   配對後傳預覽給到貨管理員,回「確認」才入帳,同時記住對照,之後同品項就全自動。
   管理員 LINE 指令:「酷柏」重新配對待對應品項;「酷柏清除」清掉待對應(已在後台手動處理時用)。 */
var CB_MAP_ = '酷柏對照 ', CB_PEND_ = '酷柏待對應';
/** 酷柏送來的成本批次 [[件數, 成本, 酷柏批發單編號]…](依酷柏下單先後);沒有就用單一成本 */
function cbLots_(it) {
  var out = [];
  (Array.isArray(it && it.lots) ? it.lots : []).slice(0, 300).forEach(function (x) { var q = Math.floor(Number(x && x[0])), p = Number(x && x[1]); if (q >= 1 && p > 0) out.push([q, p, String((x && x[2]) || '')]); });
  if (!out.length && it && Number(it.price) > 0 && Math.floor(Number(it.qty)) >= 1) out.push([Math.floor(Number(it.qty)), Number(it.price), '']);
  return out;
}
/** 從成本批次依序取 q 件,回傳 {cost: 這 q 件的平均成本(沒有批次回 ''), parts: [[酷柏批發單編號, 件數, 成本]…]} */
function cbTake_(lots, q) {
  var sum = 0, got = 0, parts = [];
  while (got < q && lots && lots.length) {
    var t = Math.min(q - got, lots[0][0]); sum += t * lots[0][1]; got += t;
    if (lots[0][2]) parts.push([String(lots[0][2]), t, lots[0][1]]);
    lots[0][0] -= t; if (lots[0][0] <= 0) lots.shift();
  }
  return { cost: got ? Math.round(sum / got * 100) / 100 : '', parts: parts };
}
var CB_TTL_ = 15552000; // 180 天:記住每筆訂單品項用到酷柏哪幾筆批發單,酷柏之後更正成本時才找得到
/** 記下這筆訂單品項(或庫存進貨 'K|編號')用到的酷柏批發單 */
function cbLink_(lk, parts) {
  if (!parts || !parts.length) return;
  var c = CacheService.getScriptCache();
  c.put('cbl_' + lk, JSON.stringify(parts), CB_TTL_);
  parts.forEach(function (p) {
    var k = 'cbw_' + p[0], a; try { a = JSON.parse(c.get(k) || '[]'); } catch (e) { a = []; }
    if (a.indexOf(lk) < 0) { a.push(lk); c.put(k, JSON.stringify(a), CB_TTL_); }
  });
}
/** 這筆酷柏批發單之前已經入帳、而且入帳的品項現在還是到貨狀態(訂單品項已到貨/已出貨,或庫存進貨已到貨) */
function cbWidDone_(w) {
  var ks; try { ks = JSON.parse(CacheService.getScriptCache().get('cbw_' + w) || '[]'); } catch (e) { ks = []; }
  return ks.some(function (lk) {
    if (lk.indexOf('X|') === 0) return true; // 入帳後老闆刪掉的庫存進貨:當作已處理過
    if (lk.indexOf('K|') === 0) return rows_('庫存進貨').some(function (k) { return String(k.訂單ID) === lk.slice(2); }); // 待確認上架(待到貨)的也算已收過,不重複新增
    var i = lk.indexOf('|'), oid = lk.slice(0, i), pid = lk.slice(i + 1);
    return rows_('訂單明細').some(function (l) { return String(l.訂單ID) === oid && String(l.商品ID) === pid && ['已到貨', '已出貨'].indexOf(String(l.到貨狀態)) >= 0; });
  });
}
/** 庫存進貨刪除後:酷柏批發單的記號改成「已刪除」(X|編號)。之後同編號重新使用時,酷柏改成本不會改到別的貨;同一張批發單重送也不會再入帳 */
function cbUnlinkK_(id) {
  var c = CacheService.getScriptCache(), k = 'cbl_K|' + id, parts; try { parts = JSON.parse(c.get(k) || '[]'); } catch (e) { parts = []; }
  if (!parts.length) return;
  parts.forEach(function (p) {
    var wk = 'cbw_' + p[0], a; try { a = JSON.parse(c.get(wk) || '[]'); } catch (e) { a = []; }
    c.put(wk, JSON.stringify(a.map(function (x) { return x === 'K|' + id ? 'X|' + id : x; })), CB_TTL_);
  });
  c.remove(k);
}
function cbAvg_(parts) { var q = 0, sum = 0; (parts || []).forEach(function (p) { q += Number(p[1]); sum += Number(p[1]) * Number(p[2]); }); return q ? Math.round(sum / q * 100) / 100 : ''; }
/** 酷柏更正成本(到貨後才算出實際成本):更新已入帳的訂單品項、庫存進貨與商品成本;還沒入帳(待對應/待確認)的也一起改。已記錄廠商付款的不動 */
function cbCostIn_(d) {
  var c = CacheService.getScriptCache(), nw = {}, touched = {}, res = { ok: true, updated: 0, paid: 0, miss: 0 };
  ((d && d.items) || []).slice(0, 1000).forEach(function (it) { var w = String((it && it.wid) || ''), v = Number(it && it.cost); if (w && v > 0) nw[w] = v; });
  Object.keys(nw).forEach(function (w) {
    var ks; try { ks = JSON.parse(c.get('cbw_' + w) || '[]'); } catch (e) { ks = []; }
    if (!ks.length) { res.miss++; return; }
    ks.forEach(function (lk) {
      var parts = touched[lk]; if (!parts) { try { parts = JSON.parse(c.get('cbl_' + lk) || '[]'); } catch (e) { parts = []; } }
      var ch = false; parts.forEach(function (p) { if (String(p[0]) === w && Number(p[2]) !== nw[w]) { p[2] = nw[w]; ch = true; } });
      if (ch) touched[lk] = parts;
    });
  });
  var meta = lineMeta_(true), pc = {};
  Object.keys(touched).forEach(function (lk) {
    var avg = cbAvg_(touched[lk]); if (!(avg > 0)) return;
    c.put('cbl_' + lk, JSON.stringify(touched[lk]), CB_TTL_);
    if (lk.indexOf('K|') === 0) {
      var k = rows_('庫存進貨').filter(function (r) { return String(r.訂單ID) === lk.slice(2); })[0]; if (!k) return;
      if (k.廠商付款ID) { res.paid++; return; }
      if (String(k.成本) !== String(avg)) { var kn = cp_(k); kn.成本 = avg; put_('庫存進貨', k._r, kn); log_('酷柏到貨', '同步成本', lk.slice(2) + ' ' + k.品名, '成本:' + k.成本 + '→' + avg + '(酷柏更正成本)'); res.updated++; pc[String(k.商品ID)] = avg; }
      return;
    }
    var i = lk.indexOf('|'), oid = lk.slice(0, i), pid = lk.slice(i + 1);
    var l = rows_('訂單明細').filter(function (x) { return String(x.訂單ID) === oid && String(x.商品ID) === pid; })[0]; if (!l) return;
    if (l.廠商付款ID) { res.paid++; return; }
    var n = cp_(l), tx = cbCost_(n, l, avg, meta);
    if (tx) { put_('訂單明細', l._r, n); log_('酷柏到貨', '同步成本', oid + ' ' + l.品名, tx.slice(1).replace('酷柏實際進價', '酷柏更正成本')); res.updated++; pc[bp_(pid)] = avg; }
  });
  cbInnCost_(pc);
  // 還沒入帳的:待對應清單與待確認的預覽裡的成本也改掉,之後確認時就是新成本
  var pe = cbPend_(), pch = false;
  pe.forEach(function (x) { (x.lots || []).forEach(function (t) { if (t[2] && nw[String(t[2])] && Number(t[1]) !== nw[String(t[2])]) { t[1] = nw[String(t[2])]; pch = true; } }); });
  if (pch) cbPendSave_(pe);
  var pl = arrPend_(), lch = false;
  pl.forEach(function (p) {
    (p.assign || []).concat(p.surplus || []).forEach(function (a) {
      var ch = false; (a.cw || []).forEach(function (t) { if (nw[String(t[0])] && Number(t[2]) !== nw[String(t[0])]) { t[2] = nw[String(t[0])]; ch = true; } });
      if (ch) { var v = cbAvg_(a.cw); if (a.cost !== undefined) a.cost = v; else a.price = v; lch = true; }
    });
  });
  if (lch) arrSave_(pl);
  if (res.updated || res.paid) log_('酷柏到貨', '收到成本更正', '', '更新 ' + res.updated + ' 筆、已記錄付款略過 ' + res.paid + ' 筆');
  return res;
}
/** 成本同步:把酷柏的成本寫進這筆訂單品項(已記錄廠商付款的不動;廠商、貨源、含稅沿用原本的設定)。回傳要接在操作紀錄後面的文字 */
var CBST_ = { same: 0, chg: 0 }; // 這次酷柏到貨:成本原本就一致幾筆、被更新幾筆
function cbCost_(n, l, cost, meta) {
  if (cost === '' || cost === undefined || cost === null || !(Number(cost) > 0) || l.廠商付款ID) return '';
  var m = meta(l);
  if (String(m.cost) === String(Number(cost))) CBST_.same++; else CBST_.chg++;
  n.廠商 = m.vendor; n.成本 = Number(cost); n.成本含稅 = m.tax ? 'Y' : 'N'; n.貨源 = m.src;
  return String(m.cost) === String(Number(cost)) ? '' : ';成本:' + m.cost + '→' + Number(cost) + '(酷柏實際進價)';
}
/** 成本同步:商品的成本改成酷柏最新進價(鎖定的商品不動),之後新訂單就會帶這個成本 */
function cbInnCost_(cost) {
  Object.keys(cost || {}).forEach(function (pid) {
    var c = Number(cost[pid]); if (!(c > 0)) return;
    var i = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === pid; })[0];
    if (i && (i.鎖定 === 'Y' || String(i.成本) === String(c))) return;
    var n = i ? cp_(i) : { '商品ID': pid, '廠商': '酷柏', '成本': '', '成本含稅': 'N', '貨源': '', '鎖定': 'N' }, old = n.成本 === undefined ? '' : n.成本;
    n.成本 = c; put_('商品_內部', i ? i._r : 0, n);
    log_('酷柏到貨', '同步成本', pid, '商品成本:' + old + '→' + c + '(酷柏最新進價)');
  });
}
function cbNorm_(s) { return String(s || '').replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase().slice(0, 80); }
/** 一個酷柏品項可用的對照鍵(由精確到寬鬆):商品+規格編號、商品+規格文字、整個商品(只有單一規格的商品才用) */
function cbKeys_(it) {
  var p = String(it.proid || ''), k = [];
  if (it.specid && String(it.specid) !== '0') k.push(p + '|' + String(it.specid));
  k.push(p + '|t:' + cbNorm_(it.spec));
  if (it.single) k.push(p + '|*');
  return k;
}
function cbPk_(it) { return String(it.proid || '') + '|' + String(it.specid || '') + '|' + cbNorm_(it.spec); }
/** '商品ID|規格' → {pid, spec};商品已刪除或規格已改名就當作沒有對照 */
function cbTarget_(v, prods) {
  v = String(v || ''); var i = v.indexOf('|'); if (i < 1) return null;
  var pid = v.slice(0, i), sp = v.slice(i + 1), p = prods[pid]; if (!p) return null;
  var sl = specs_(p);
  if (sl.length ? sl.indexOf(sp) < 0 : sp !== '') return null;
  return { pid: pid, spec: sp };
}
function cbMapGet_(it, st, prods) {
  var ks = cbKeys_(it);
  for (var i = 0; i < ks.length; i++) { var t = cbTarget_(st[CB_MAP_ + ks[i]], prods); if (t) return t; }
  return null;
}
function cbMapPut_(m) { cbKeys_(m).forEach(function (k) { setSet_(CB_MAP_ + k, String(m.pid) + '|' + String(m.cspec || '')); }); }
function cbOn_() { return String(prop_('COOLBAU_ARR_SECRET') || '').length >= 16; }
function cbPend_() { try { var a = JSON.parse(String(settings_()[CB_PEND_] || '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function cbPendSave_(a) { setSet_(CB_PEND_, JSON.stringify((a || []).slice(0, 150))); }
function cbPendAdd_(items) {
  var a = cbPend_(), ix = {}; a.forEach(function (x, i) { ix[cbPk_(x)] = i; });
  items.forEach(function (it) {
    var k = cbPk_(it), q = Math.floor(Number(it.qty));
    if (ix[k] === undefined) { ix[k] = a.length; a.push({ proid: String(it.proid), specid: String(it.specid || ''), title: t_(it.title, 120), spec: t_(it.spec, 80), single: it.single ? 1 : 0, qty: 0, price: '', at: now_() }); }
    var x = a[ix[k]]; x.qty += q; if (Number(it.price) > 0) x.price = Number(it.price);
    x.lots = (x.lots || []).concat(cbLots_(it)).slice(0, 300);
  });
  cbPendSave_(a);
}
/** 店面在後台手動把訂單品項改成已到貨:待對應裡「對得到這個商品+規格」的同一件酷柏貨扣掉(避免之後再入帳一次)。
    對得到 = 已綁定、或候選只有這一個、或嚴格自動對照只對到這一個。lines: [{pid, spec, qty}] */
function cbPendSettle_(lines, who) {
  var pe = cbPend_(); if (!pe.length || !lines || !lines.length) return 0;
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var st = settings_(), ch = 0;
  lines.forEach(function (l) {
    var pid = bp_(String(l.pid || '')), sp = String(l.spec || ''), q = Math.floor(Number(l.qty)) || 1;
    pe.forEach(function (x) {
      if (q <= 0 || !(x.qty > 0)) return;
      var t = cbMapGet_(x, st, prods) || ((x.cand || []).length === 1 ? cbTarget_(x.cand[0][0] + '|' + x.cand[0][1], prods) : null) || cbGuess_(x, prods);
      if (!t || t.pid !== pid || String(t.spec || '') !== sp) return;
      var k = Math.min(q, x.qty); x.qty -= k; q -= k; ch++;
      cbTake_(x.lots || [], k);
      log_(who || '後台', '酷柏待對應已手動處理', (x.code ? x.code + ' ' : '') + t_(x.title, 60), (x.spec ? x.spec + ' ' : '') + '×' + k + ' 已在後台手動到貨(' + pid + (sp ? ' ' + sp : '') + '),從待對應扣掉,不會再入帳');
    });
  });
  if (ch) cbPendSave_(pe.filter(function (x) { return x.qty > 0; }));
  return ch;
}
/** LINE 回「J刪」:只移除待對應的那一項(已在後台手動處理、或店裡不需要入帳的) */
function cbPendDrop_(text, who) {
  var pe = cbPend_(), re = /([A-Za-z])\s*(?:刪除|删除|刪|删)/g, m, gone = [], bad = [];
  while ((m = re.exec(text))) {
    var L = m[1].toUpperCase(), x = pe.filter(function (y) { return y.code === L; })[0];
    if (!x) { bad.push(L); continue; }
    pe = pe.filter(function (y) { return y !== x; }); gone.push(L + ' ' + x.title + (x.spec ? '(' + x.spec + ')' : '') + ' ×' + x.qty);
    log_(who || '到貨助理', '移除酷柏待對應', L + ' ' + t_(x.title, 60), (x.spec ? x.spec + ' ' : '') + '×' + x.qty + '(沒有入帳)');
  }
  if (gone.length) cbPendSave_(pe);
  return (gone.length ? '🗑 已從待對應移除(沒有入帳):\n・' + gone.join('\n・') : '') + (bad.length ? (gone.length ? '\n' : '') + '⚠️ 找不到代號:' + bad.join('、') : '') || '代號不正確。';
}
/** 計畫入帳後:記住對照,並把已處理的品項從待對應移除 */
function cbDone_(plans) {
  var ks = {}, n = 0;
  (plans || []).forEach(function (pl) { (pl.cb || []).forEach(function (m) { cbMapPut_(m); if (m.title) setSet_('酷柏品名 ' + m.proid, t_(m.title, 120)); ks[m.k] = 1; n++; }); });
  if (n) cbPendSave_(cbPend_().filter(function (x) { return !ks[cbPk_(x)]; }));
}
/* 自動對照(不用人確認):品牌、品名、規格都對得上、而且全店只有一個商品規格符合 → 直接當作對照過,入帳並記住。
   對不上或有兩個以上可能 → 才交給 AI 配對、請到貨管理員確認。 */
function cbG_(s) { return String(s || '').replace(/【[^】]*】/g, '').replace(/[\s\-_.,，。、・·\/|｜()（）\[\]#＃+*:：'"「」]/g, '').toLowerCase(); }
/* --- 酷柏「一個顏色一個商品」對 COS「同一頁多顏色(規格:顏色 / 尺寸)」:用貨號找商品、用顏色+尺寸找規格 --- */
var CB_CLR_ = { CHESTNUT: '栗', CHESTUNT: '栗', SAND: '沙', APRICOT: '杏', CHOCOLATE: '巧克力', BLACK: '黑', BROWN: '棕', NAVY: '藏藍', GREY: '灰', GRAY: '灰', BEIGE: '米', TAUPE: '米', WHITE: '白', MUSTARD: '杏', TAN: '棕', CARAMEL: '焦糖', TOFFEE: '太妃', PINK: '粉', RED: '紅', BLUE: '藍', GREEN: '綠', CREAM: '奶油', IVORY: '象牙', KHAKI: '卡其', CHARCOAL: '炭灰', OLIVE: '橄欖', NATURAL: '原色', MOCHA: '摩卡', COFFEE: '咖啡', WALNUT: '胡桃', WALINUTS: '胡桃', CAMEL: '駝', SILVER: '銀', GOLD: '金', PURPLE: '紫', YELLOW: '黃', ORANGE: '橘' };
/** 品名裡括號中的貨號(例:（OZ3010）→ OZ3010) */
function cbSku_(s) { var m = String(s || '').match(/[（(]\s*([A-Za-z]{1,4}\d{3,5}[A-Za-z]{0,4})\s*[）)]/); return m ? m[1].toUpperCase() : ''; }
/** 尺寸:EU36 / 36碼 → 36(交期、預售等字一律忽略) */
function cbSize_(s) { var m = String(s || '').match(/EU\s*(\d{2})|(\d{2})\s*碼/i); return m ? (m[1] || m[2]) : ''; }
/** 酷柏的顏色:規格寫「顏色#尺寸」就取 # 前面;否則取品名貨號括號後面的字 */
function cbColorOf_(title, spec) {
  var sp = String(spec || ''), i = sp.indexOf('#'); if (i > 0) return sp.slice(0, i);
  var t = String(title || ''), m = t.match(/[（(]\s*[A-Za-z]{1,4}\d{3,5}[A-Za-z]{0,4}\s*[）)]/); return m ? t.slice(m.index + m[0].length) : '';
}
function cbClrEn_(s) { return (String(s || '').toUpperCase().match(/[A-Z]{3,}/g) || []).filter(function (w) { return !/^(UGG|OZLANA|AUSPECIAL|EVERAU|OZWEAR|AUSTRALIAN|SHEPHERD|NATURE|FUR|COLOR|COLOUR|EU)$/.test(w); }); }
function cbClrZh_(s) { return (String(s || '').match(/[\u4e00-\u9fff]+/g) || []).join('').replace(/[色子]/g, ''); }
/** 兩段顏色文字是不是同一個顏色:英文字相同、中文相同,或用中英對照表接得起來 */
function cbSameClr_(a, b) {
  var ea = cbClrEn_(a), eb = cbClrEn_(b), za = cbClrZh_(a), zb = cbClrZh_(b);
  if (ea.some(function (w) { return eb.indexOf(w) >= 0; })) return true;
  if (za && zb && (za.indexOf(zb) >= 0 || zb.indexOf(za) >= 0)) return true;
  var ta = ea.map(function (w) { return CB_CLR_[w]; }).filter(Boolean), tb = eb.map(function (w) { return CB_CLR_[w]; }).filter(Boolean);
  return ta.some(function (x) { return zb.indexOf(x) >= 0; }) || tb.some(function (x) { return za.indexOf(x) >= 0; });
}
/** 用顏色+尺寸找店內規格。酷柏規格沒有尺寸就不適用(回 null);否則回 {n: 對到幾個, spec: 唯一的那個} */
function cbSpecBy_(it, p) {
  var sl = specs_(p), z = cbSize_(it.spec); if (!z || !sl.length) return null;
  var c = cbColorOf_(it.title, it.spec);
  var h = sl.filter(function (x) {
    var k = x.lastIndexOf(' / '), col = k >= 0 ? x.slice(0, k) : '', rest = k >= 0 ? x.slice(k + 3) : x;
    var sz = cbSize_(rest) || ((String(rest).match(/^\s*(\d{2})\s*$/) || [])[1] || ''); // 舊商品規格常只寫「39」
    if (sz !== z) return false;
    return col ? !!c && cbSameClr_(c, col) : (!c || cbSameClr_(c, p.名稱));
  });
  return { n: h.length, spec: h.length === 1 ? h[0] : '' };
}
function cbGuess_(it, prods) {
  var t = cbG_(it.title), ks = cbG_(it.spec), plain = !!it.single, hit = [], sku = cbSku_(it.title);
  if (!t) return null;
  Object.keys(prods).forEach(function (pid) {
    var p = prods[pid], nm = cbG_(p.名稱), br = cbG_(p.品牌), nm0 = cbG_(String(p.名稱).replace(/\s*#.*$/, '')); // nm0:舊商品「品名#顏色」去掉顏色
    if (!(sku && cbSku_(p.名稱) === sku)) {                            // 貨號相同就算同款(COS 品名常多寫「三色」等字)
      if (!((nm && nm.length >= 3 && t.indexOf(nm) >= 0) || (nm0 && nm0.length >= 3 && t.indexOf(nm0) >= 0))) return; // 店內品名要完整出現在酷柏品名裡
      if (br && t.indexOf(br) < 0) return;                            // 有填品牌的話,品牌也要出現
    }
    var sl = specs_(p);
    var bs = cbSpecBy_(it, p);                                        // 有尺寸的(鞋子):顏色+尺寸要剛好對到一個規格
    if (bs) { if (bs.n === 1) hit.push({ pid: pid, spec: bs.spec, x: !!String(cbColorOf_(it.title, it.spec)).trim() }); else if (bs.n > 1) hit.push(null, null); return; } // 顏色+尺寸都對到才算確定;酷柏沒寫顏色(只對到尺寸)→ 不算確定
    if (!sl.length) { if (plain) hit.push({ pid: pid, spec: '', x: true }); return; }
    var m = sl.filter(function (x) {
      var g = cbG_(x); if (!g) return false;
      if (!plain && ks) return g.indexOf(ks) === 0 || ks.indexOf(g) === 0; // 酷柏規格(例 Hotel Wood)對店內規格(例 Hotel Wood｜NO.7 五星級飯店)
      return t.indexOf(g) >= 0;                                       // 酷柏沒分規格:顏色等寫在品名裡(例 …老帽-棕色 → 棕色)
    });
    if (m.length === 1) hit.push({ pid: pid, spec: m[0], x: !plain && !!ks && (cbG_(m[0]) === ks || cbG_(String(m[0]).split(/[｜|\/(（,，]/)[0]) === ks) }); // 規格文字相同(或店內規格第一段相同,例 Hotel Wood｜NO.7)才算確定;只是開頭相同、從品名找到的只算「像」
    else if (m.length > 1) hit.push(null, null);                      // 同一個商品有兩個規格都像 → 不猜
  });
  if (hit.length > 1 && hit.every(Boolean)) { // 幾個店內品名都出現:只有一個最長、其他都是它的一部分(例 擴香禮盒組 vs Hello Kitty聯名款擴香禮盒組)→ 用最長的
    var nm = function (h) { return cbG_(prods[h.pid].名稱); };
    hit.sort(function (a, b) { return nm(b).length - nm(a).length; });
    if (nm(hit[0]).length > nm(hit[1]).length && hit.slice(1).every(function (h) { return nm(hit[0]).indexOf(nm(h)) >= 0; })) return { pid: hit[0].pid, spec: hit[0].spec, x: false }; // 用品名長短挑的:不算確定
  }
  return hit.length === 1 && hit[0] ? hit[0] : null;
}
/** 同一個商品(貨號相同,或店內品名完整出現在酷柏品名裡)只有一個時回傳商品ID,否則 '' */
function cbOneProd_(it, prods) {
  var t = cbG_(it.title), sku = cbSku_(it.title), out = [];
  if (!t) return '';
  Object.keys(prods).forEach(function (pid) {
    var p = prods[pid], nm = cbG_(p.名稱), br = cbG_(p.品牌);
    if (sku && cbSku_(p.名稱) === sku) { out.push(pid); return; }
    if (!nm || nm.length < 3 || t.indexOf(nm) < 0) return;
    if (br && t.indexOf(br) < 0) return;
    out.push(pid);
  });
  return out.length === 1 ? out[0] : '';
}
/** 商品找得到、但 COS 沒有這個規格:建議新增的規格名稱(照這個商品現有規格的寫法);不適合就回 null */
function cbNewSpec_(it, prods) {
  var pid = cbOneProd_(it, prods); if (!pid) return null;
  var p = prods[pid], sl = specs_(p); if (!sl.length) return null; // 店內商品沒分規格:不自動加規格,請到後台處理
  var z = cbSize_(it.spec), c = String(cbColorOf_(it.title, it.spec) || '').trim(), nm = '';
  var zh = function (col) {
    var w = cbClrEn_(col).map(function (e) { return CB_CLR_[e]; }).filter(Boolean).join('');
    w = w || cbClrZh_(col) || col; var smp = sl.filter(function (x) { return x.lastIndexOf(' / ') > 0; })[0];
    if (smp && /色$/.test(smp.slice(0, smp.lastIndexOf(' / ')).trim()) && !/色$/.test(w)) w += '色';
    return w;
  };
  if (z) {
    var eu = sl.some(function (x) { return /EU\s*\d{2}/i.test(x); }), sz = (eu ? 'EU' : '') + z;
    var col = sl.some(function (x) { return x.lastIndexOf(' / ') > 0; });
    nm = col ? (c ? zh(c) + ' / ' + sz : '') : sz;
  } else {
    nm = String(it.spec || '').replace(/(交期|預計|預購|預售)[^#,，]*$/g, '').replace(/\d{1,2}\s*[\/月]\s*\d{1,2}\s*日?(到貨|出貨)?/g, '').replace(/標準/g, '').trim();
    if (!nm && it.single) nm = c ? zh(c) : '';
  }
  nm = specNorm_(nm).trim();
  if (!nm || sl.indexOf(nm) >= 0) return null;
  return { pid: pid, name: nm };
}
/** 待對應清單裡能自動對照的,直接入帳並記住;回傳要傳給到貨管理員的文字(沒有就空字串) */
function cbPendAuto_() {
  var pe = cbPend_(); if (!pe.length) return '';
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var items = [], cb = [], st = settings_(), chg = false;
  pe.forEach(function (x) {
    // 已綁定(後台或 LINE 選過)優先;沒綁定時只有「商品、規格都完全對得上」才自動入帳。
    // 規格只是「像」、對不到或 COS 沒有這個規格 → 留在待對應,等內勤在 LINE 選好才入帳上架(不會自動猜)
    var g = cbMapGet_(x, st, prods);
    if (!g) {
      var gg = cbGuess_(x, prods);
      if (gg && gg.x) g = gg;
      else {
        var ng = gg ? { pid: gg.pid, spec: gg.spec } : null, np = gg ? null : cbNewSpec_(x, prods);
        if (JSON.stringify(ng) !== JSON.stringify(x.g || null) || JSON.stringify(np) !== JSON.stringify(x.np || null)) { x.g = ng; x.np = np; chg = true; }
        return;
      }
    }
    items.push({ pid: g.pid, spec: g.spec, qty: x.qty, price: x.price, lots: cbLots_(x), text: x.title });
    cb.push({ proid: x.proid, specid: x.specid, spec: x.spec, single: x.single, pid: g.pid, cspec: g.spec, k: cbPk_(x), title: x.title });
  });
  if (chg) cbPendSave_(pe);
  if (!items.length) return '';
  arrSave_(arrPend_().filter(function (pl) { return !(pl.cb && pl.cb.length); })); // 舊的酷柏預覽作廢,避免入帳兩次
  var opt = { auto: true, cb: cb, head: '📦 酷柏到貨(已綁定或商品規格完全對得上的品項,已自動入帳;多出來沒有訂單在等的,回「上架」確認後才上現貨)' }, pv = arrPlan_(items, opt);
  if (!opt.plan) return '';
  CBGA_ = { n: opt.plan.assign.length, q: 0, s: 0 }; opt.plan.assign.forEach(function (x) { CBGA_.q += Number(x.qty); }); opt.plan.surplus.forEach(function (x) { CBGA_.s += Number(x.qty); });
  return pv + '\n\n' + arrApply_([opt.plan], '酷柏到貨自動入帳');
}
var CBGA_ = null; // 自動對照這次入帳的數字(回報給酷柏)
/** 酷柏送來一批到貨:對照過的直接入帳並通知客人,其餘記成待對應。回傳 {ok, auto, stock, skip, pending, added, dup} */
function cbArrIn_(d) {
  d = d || {};
  var c = CacheService.getScriptCache(), bk = 'cbarr_' + t_(d.batch, 80);
  if (d.batch) { var prev = c.get(bk); if (prev) { var pr = JSON.parse(prev); pr.dup = true; pr.added = 0; return pr; } } // 同一批重送:不重複入帳
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var st = settings_(), auto = [], unk = [], already = 0, pw = {};
  cbPend_().forEach(function (x) { (x.lots || []).forEach(function (t) { if (t[2]) pw[String(t[2])] = 1; }); });
  (d.items || []).slice(0, 300).forEach(function (it) {
    // 同一筆批發單再 KEY 一次(先改回未到貨又改到貨):這邊已經入帳、而且還是到貨狀態的件數不再入帳;已在待對應的也不重複加
    if (it && Array.isArray(it.lots) && it.lots.length && it.lots.every(function (t) { return t && t[2]; })) {
      var keep = it.lots.filter(function (t) { var w = String(t[2]); if (pw[w] || cbWidDone_(w)) { already += Math.floor(Number(t[0])) || 0; return false; } return true; });
      if (keep.length !== it.lots.length) { it = JSON.parse(JSON.stringify(it)); it.lots = keep; it.qty = keep.reduce(function (a, t) { return a + (Math.floor(Number(t[0])) || 0); }, 0); }
    }
    var q = Math.floor(Number(it && it.qty)); if (!it || !it.proid || !(q >= 1)) return;
    var m = cbMapGet_(it, st, prods);
    if (m) auto.push({ pid: m.pid, spec: m.spec, qty: q, price: it.price, lots: cbLots_(it), text: t_(it.title, 40) }); else unk.push(it);
  });
  RDYN_ = [];
  var res = { ok: true, auto: 0, stock: 0, skip: 0, pending: 0, added: unk.length, already: already }, text = '';
  if (auto.length) {
    var opt = { auto: true, head: '📦 酷柏到貨(已自動入帳)' }, pv = arrPlan_(auto, opt); CBST_ = { same: 0, chg: 0 };
    if (opt.plan) {
      text = pv + '\n\n' + arrApply_([opt.plan], '酷柏到貨自動入帳');
      res.auto = opt.plan.assign.length; res.skip = opt.plan.skip.length; res.costSame = CBST_.same; res.costNew = CBST_.chg;
      res.autoQty = 0; opt.plan.assign.forEach(function (x) { res.autoQty += Number(x.qty); });
      opt.plan.surplus.forEach(function (s) { res.stock += Number(s.qty); });
    } else {
      res.skip = auto.length;
      text = '⚠️ 酷柏到貨沒有自動入帳:\n' + auto.map(function (a) { return '・' + String(prods[a.pid].名稱) + (a.spec ? '(' + a.spec + ')' : '') + ' ×' + a.qty; }).join('\n') + '\n到貨數量不夠分給排隊中的客人(不能拆單),請到後台處理。';
    }
  }
  if (unk.length) {
    cbPendAdd_(unk);
    CBGA_ = null; var ga = cbPendAuto_(); // 第一次出現、但對得上的:直接入帳(不用等人確認)
    if (ga) { text = (text ? text + '\n\n' : '') + ga; res.guess = 1; if (CBGA_) { res.auto += CBGA_.n; res.autoQty = (res.autoQty || 0) + CBGA_.q; res.stock += CBGA_.s; } }
  }
  res.pending = cbPend_().length;
  if (text) cbTell_(text);
  cbRdyTell_(res);
  if (res.pending) res.pendItems = cbPend_().map(function (x) { return x.title + (x.spec ? '(' + x.spec + ')' : '') + ' ×' + x.qty; }).slice(0, 20);
  if (d.batch) c.put(bk, JSON.stringify(res), 2592000);
  log_('酷柏到貨', '收到到貨', t_(d.batch, 80), '自動入帳 ' + res.auto + ' 筆、多出待確認上架 ' + res.stock + ' 件、略過 ' + res.skip + '、待對應 ' + res.pending + ' 項');
  return res;
}
/** 給配對用:待對應的酷柏品項(每列:#編號|品名|規格|件數) */
function cbPendList_() { return cbPend_().map(function (x, i) { return '#' + (i + 1) + '|' + x.title + '|' + x.spec + '|' + x.qty; }).join('\n'); }
/* 對不上的酷柏品項:絕不自動選一個入帳。列出候選商品(AI 建議＋品牌/品名相近的),到貨管理員回代號(例 A1)或到後台商品「酷柏商品綁定」選,
   選了就永久綁定(酷柏商品編號 → 店內商品＋規格),之後同品項到貨直接入帳。 */
function cbBig_(s) { var o = {}; for (var i = 0; i + 1 < s.length; i++) o[s.substr(i, 2)] = 1; return o; }
function cbWait_() {
  var w = {};
  rows_('訂單明細').forEach(function (l) {
    if (String(l.到貨狀態) === '已到貨' || String(l.到貨狀態) === '已出貨' || l.出貨單ID) return;
    var k = bp_(l.商品ID) + '|' + String(l.規格 || ''); w[k] = (w[k] || 0) + Number(l.數量);
  });
  return w;
}
function cbCand_(x, prods, sugg) {
  var t = cbG_(x.title), ks = cbG_(x.spec), tb = cbBig_(t), out = [], seen = {};
  var add = function (pid, sp, sc) { var k = pid + '|' + sp; if (seen[k] || !cbTarget_(k, prods)) return; seen[k] = 1; out.push({ pid: pid, spec: sp, sc: sc }); };
  (sugg || []).forEach(function (g) { if (g && g.pid) add(String(g.pid), String(g.spec || ''), 9); });
  Object.keys(prods).forEach(function (pid) {
    var p = prods[pid], nm = cbG_(p.名稱), br = cbG_(p.品牌);
    if (!nm || nm.length < 2) return;
    if (br && t.indexOf(br) < 0) return;
    var nb = cbBig_(nm), tot = 0, hit = 0; Object.keys(nb).forEach(function (b) { tot++; if (tb[b]) hit++; });
    var sc = t.indexOf(nm) >= 0 ? 1 : (tot ? hit / tot : 0);
    if (sc < 0.5) return;
    var sl = specs_(p);
    if (!sl.length) { add(pid, '', sc); return; }
    var m = sl.filter(function (y) { var g = cbG_(y); if (!g) return false; return ks && !x.single ? (g.indexOf(ks) === 0 || ks.indexOf(g) === 0) : t.indexOf(g) >= 0; });
    if (m.length) m.slice(0, 3).forEach(function (y) { add(pid, y, sc); });
    else if (sl.length === 1) add(pid, sl[0], sc - 0.01);
  });
  return out.sort(function (a, b) { return b.sc - a.sc; }).slice(0, 5).map(function (c) { return [c.pid, c.spec]; });
}
var CB_L_ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** ai:[{ref, pid, spec}](可以是空的)→ 每個待對應品項存好候選,回傳要傳給到貨管理員的選擇訊息 */
function cbPendPlan_(ai) {
  var pe = cbPend_(); if (!pe.length) return '';
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var sg = {}; (ai || []).forEach(function (r) { var i = Math.floor(Number(r && r.ref)) - 1; if (i >= 0 && r.pid) (sg[i] = sg[i] || []).push({ pid: r.pid, spec: String(r.spec || '').trim() }); });
  var w = cbWait_(), msg = [], used = {};
  pe.forEach(function (x) { if (x.code) used[x.code] = 1; });
  pe.forEach(function (x, i) {
    x.cand = cbCand_(x, prods, (x.g ? [x.g] : []).concat(sg[i] || [])); // 系統猜的(規格只是像)排第一個,但一定要人選
    if (!x.code) { for (var c = 0; c < CB_L_.length; c++) if (!used[CB_L_.charAt(c)]) { x.code = CB_L_.charAt(c); used[x.code] = 1; break; } } // 代號固定跟著品項,之前的品項入帳後也不會錯位
    if (!x.code) { msg.push('・' + x.title + ' ×' + x.qty + ':待對應太多,請到後台商品編輯「酷柏商品綁定」處理'); return; }
    var L = x.code;
    msg.push(L + '｜' + x.title + (x.spec && !x.single ? '(' + x.spec + ')' : '') + ' ×' + x.qty + '(酷柏編號 ' + x.proid + ')');
    var np = x.np && prods[x.np.pid] && specs_(prods[x.np.pid]).indexOf(x.np.name) < 0 ? x.np : null;
    msg.push('   原因:' + (x.g ? '規格對不上(只是相近),請確認是哪個規格' : np ? 'COS 這個商品沒有這個規格' : '找不到確定的 COS 商品'));
    if (!x.cand.length && !np) msg.push('   找不到相近的店內商品:請先建立商品,再到後台商品編輯「酷柏商品綁定」選這個酷柏商品');
    x.cand.forEach(function (c, k) { msg.push('   ' + L + (k + 1) + ' → ' + c[0] + ' ' + String(prods[c[0]].名稱) + (c[1] ? '(' + c[1] + ')' : '') + '・' + (w[c[0] + '|' + c[1]] || 0) + ' 件在等'); });
    if (np) msg.push('   ' + L + '+ → 在 ' + np.pid + ' ' + String(prods[np.pid].名稱) + ' 新增規格「' + np.name + '」並入帳(要用別的名稱:回「' + L + '+ 規格名稱」)');
    msg.push('   ' + L + '0 → 都不是(先不入帳,留在待對應)');
    msg.push('   ' + L + '刪 → 已在後台手動處理/不用入帳,從待對應移除');
  });
  cbPendSave_(pe);
  arrSave_(arrPend_().filter(function (pl) { return !(pl.cb && pl.cb.length); })); // 舊版「回確認入帳」的酷柏預覽作廢
  return '📦 店面到貨上架確認:下面品項對不上或規格不確定,先不入帳(不會自動猜)。\n請回覆代號選擇正確的商品規格,例如「A1」;多項用空格分開,例如「A1 B2」。任一位選了就執行,選過的會永久記住,之後同品項到貨直接入帳上架。\n\n' + msg.join('\n') + '\n\n也可以到後台商品編輯 →「酷柏商品綁定」搜尋酷柏商品綁定。';
}
/** 到貨管理員回代號(例 A1、A1 B2、A0):綁定並把已綁定的待對應品項入帳 */
function cbPick_(text, who) {
  var pe = cbPend_(); if (!pe.length) return '目前沒有待對應的酷柏到貨。';
  var prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var re = /([A-Za-z])\s*(\d{1,2})/g, m, done = [], bad = [], skip = [];
  var pm = String(text).match(/^\s*([A-Za-z])\s*[+＋]\s*(.*)$/); // 「A+」新增建議的規格;「A+ 栗色 / 38」用自己打的名稱
  if (pm) {
    var px = pe.filter(function (y) { return y.code === pm[1].toUpperCase(); })[0], pp = px && px.np && prods[px.np.pid];
    if (!pp) return '代號「' + pm[1].toUpperCase() + '+」不能用:這個品項沒有可以新增的規格,請照上一則訊息的代號回覆。';
    var nn = specNorm_(String(pm[2] || '').trim() || px.np.name).trim(), sl0 = specs_(pp);
    if (!nn) return '規格名稱不能空白。';
    if (sl0.indexOf(nn) < 0) { var pn = cp_(pp); pn.規格 = (String(pp.規格 || '').trim() ? String(pp.規格).trim() + '|' : '') + nn + '=0'; put_('商品', pp._r, pn); pp.規格 = pn.規格; // 新規格預購名額 0:只賣到貨的現貨
      log_(who || '到貨助理', '新增規格', px.np.pid + ' ' + pp.名稱, '規格「' + nn + '」(酷柏到貨確認,預購名額 0)'); }
    text = pm[1] + String((px.cand || []).length + 1); px.cand = (px.cand || []).concat([[px.np.pid, nn]]); // 接著照一般代號綁定
  }
  while ((m = re.exec(text))) {
    var L = m[1].toUpperCase(), n = Number(m[2]), x = pe.filter(function (y) { return y.code === L; })[0];
    if (!x) { bad.push(m[0]); continue; }
    if (n === 0) { skip.push(L); continue; }
    var c = (x.cand || [])[n - 1], t = c && cbTarget_(c[0] + '|' + c[1], prods);
    if (!t) { bad.push(m[0]); continue; }
    cbMapPut_({ proid: x.proid, specid: x.specid, spec: x.spec, single: x.single, pid: t.pid, cspec: t.spec });
    setSet_('酷柏品名 ' + x.proid, t_(x.title, 120));
    log_(who || '到貨助理', '綁定酷柏商品', t.pid + (t.spec ? ' ' + t.spec : ''), '酷柏 ' + x.proid + ' ' + t_(x.title, 60));
    done.push(L + ' → ' + t.pid + ' ' + String(prods[t.pid].名稱) + (t.spec ? '(' + t.spec + ')' : ''));
  }
  if (!done.length && !skip.length) return '代號不正確' + (bad.length ? ':' + bad.join('、') : '') + '。請照上一則訊息的代號回覆,例如「A1」。';
  RDYN_ = []; var r = done.length ? cbPendAuto_() : '';
  var rr = {}; cbRdyTell_(rr);
  return (done.length ? '✅ 已綁定:\n' + done.join('\n') + '\n\n' + (r || '(沒有可入帳的件數)') : '') + (skip.length ? (done.length ? '\n\n' : '') + skip.join('、') + ' 先不入帳,仍留在待對應。' : '') + (bad.length ? '\n⚠️ 代號不正確:' + bad.join('、') : '');
}
/** 後台:這個商品目前綁定的酷柏商品 */
function cbBinds_(pid) {
  var st = settings_(), out = [];
  Object.keys(st).forEach(function (k) {
    if (k.indexOf(CB_MAP_) !== 0) return;
    var v = String(st[k] || ''), i = v.indexOf('|'); if (i < 1 || v.slice(0, i) !== String(pid)) return;
    var key = k.slice(CB_MAP_.length), j = key.indexOf('|'), proid = key.slice(0, j), sp = key.slice(j + 1);
    if (sp.indexOf('t:') === 0) return; // 文字鍵是舊的輔助對照,不列出
    out.push({ key: key, proid: proid, spec: sp, cspec: v.slice(i + 1), title: String(st['酷柏品名 ' + proid] || '') });
  });
  return out.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
}
function adminCbBinds(tk, pid) { me_(tk); return { binds: cbBinds_(String(pid)), pend: cbPend_().map(function (x) { return { proid: x.proid, title: x.title, spec: x.spec, qty: x.qty }; }) }; }
/** 後台綁定:d = {proid, title, single, rows:[{specid, stitle, cspec}]};整個商品沒分款式(single)時用 proid|* 一次綁全部規格 */
function adminCbBind(tk, pid, d) {
  var u = me_(tk), msg = '';
  lk_(function () { msg = cbBindDo_(u, pid, d); });
  var o = adminCbBinds(tk, pid); o.msg = msg; return o;
}
/** 綁定酷柏商品(呼叫端負責鎖):回傳提示文字(待對應裡的貨已自動入帳時) */
function cbBindDo_(u, pid, d) {
  var msg = '';
  d = d || {};
  (function () {
    pid = String(pid || ''); var p = rows_('商品').filter(function (x) { return String(x.商品ID) === pid; })[0];
    if (!p) throw new Error('找不到這個商品');
    var proid = String(Math.floor(Number(d.proid)) || ''); if (!proid || proid === '0') throw new Error('酷柏商品編號不正確');
    var sl = specs_(p), chk = function (c) { c = c == null || c === '' ? '' : specNorm_(c); if (sl.length ? sl.indexOf(c) < 0 : c !== '') throw new Error('規格「' + c + '」不在這個商品裡'); return c; };
    var n = 0;
    if (d.single) chk(d.cspec);
    cbClear_(proid, d.single ? null : (d.rows || []).map(function (r) { return String(Math.floor(Number(r.specid)) || ''); })); // 同一個酷柏商品之前的對照(含舊的文字對照)先清掉,避免舊的錯誤對照優先
    if (d.single) { setSet_(CB_MAP_ + proid + '|*', pid + '|' + chk(d.cspec)); n = 1; }
    else (d.rows || []).slice(0, 100).forEach(function (r) {
      var sid = String(Math.floor(Number(r.specid)) || ''); if (!sid || sid === '0') return;
      if (r.cspec === null || r.cspec === undefined || r.cspec === '__none') { setSet_(CB_MAP_ + proid + '|' + sid, ''); return; }
      setSet_(CB_MAP_ + proid + '|' + sid, pid + '|' + chk(r.cspec)); n++;
    });
    if (!n) throw new Error('酷柏商品的規格都選了「不綁定」,請把每個酷柏規格對到這個商品的規格,或改選「都不是／先不綁定」');
    setSet_('酷柏品名 ' + proid, t_(d.title, 120));
    log_(u.acc, '綁定酷柏商品', pid, '酷柏 ' + proid + ' ' + t_(d.title, 60) + '(' + n + ' 項)');
    RDYN_ = []; var r = cbPendAuto_(); // 待對應裡剛好有這個酷柏商品:立刻入帳並通知客人
    if (r) { cbTell_(r); msg = '待對應裡的這個酷柏商品已自動入帳'; }
    var rr = {}; cbRdyTell_(rr);
  })();
  return msg;
}
/** 清掉一個酷柏商品的對照;sids 有給時只清那些規格編號(以及文字對照與整個商品的對照) */
function cbClear_(proid, sids) {
  var st = settings_(), pre = CB_MAP_ + proid + '|';
  Object.keys(st).forEach(function (k) {
    if (k.indexOf(pre) !== 0 || !String(st[k] || '')) return;
    var sp = k.slice(pre.length);
    if (sids && /^\d+$/.test(sp) && sids.indexOf(sp) < 0) return;
    setSet_(k, '');
  });
}
function adminCbUnbind(tk, pid, key) {
  var u = me_(tk);
  lk_(function () {
    key = String(key || ''); if (!/^\d+\|(\*|\d+)$/.test(key)) throw new Error('綁定代號不正確');
    var v = String(settings_()[CB_MAP_ + key] || ''); if (v.indexOf(String(pid) + '|') !== 0) throw new Error('這個綁定不屬於此商品');
    setSet_(CB_MAP_ + key, '');
    var st = settings_(), pre = CB_MAP_ + key.split('|')[0] + '|t:';
    Object.keys(st).forEach(function (k) { if (k.indexOf(pre) === 0 && String(st[k] || '').indexOf(String(pid) + '|') === 0) setSet_(k, ''); });
    log_(u.acc, '解除酷柏商品綁定', String(pid), '酷柏 ' + key);
  });
  return adminCbBinds(tk, pid);
}
/** 後台搜尋酷柏商品(由伺服器向酷柏查詢,見 server/core.js adminCbSearch):標上每個酷柏規格目前綁到哪個店內商品 */
function cbBindOf_(list) {
  var st = settings_(), prods = {}; rows_('商品').forEach(function (p) { prods[String(p.商品ID)] = p; });
  var nm = function (v) { v = String(v || ''); var i = v.indexOf('|'); if (i < 1) return ''; var p = prods[v.slice(0, i)]; return p ? v.slice(0, i) + ' ' + String(p.名稱) + (v.slice(i + 1) ? '(' + v.slice(i + 1) + ')' : '') : ''; };
  (list || []).forEach(function (x) {
    x.bound = nm(st[CB_MAP_ + x.id + '|*']);
    (x.specs || []).forEach(function (s) { s.bound = nm(st[CB_MAP_ + x.id + '|' + s.id]); });
  });
  return list;
}

/* --- 購物金 --- */
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function grants_(lid) {
  var t = today_();
  return rows_('購物金').filter(function (g) { return String(g['LINE ID']) === lid && Number(g.剩餘) > 0 && String(g.到期日) >= t; })
    .sort(function (a, b) { return String(a.到期日) < String(b.到期日) ? -1 : 1; });
}
function balance_(lid) { return grants_(lid).reduce(function (s, g) { return s + Number(g.剩餘); }, 0); }
function addGrant_(lid, amt, days, src, note, acc, oid, actId) {
  var exp = Utilities.formatDate(new Date(Date.now() + days * 86400000), TZ, 'yyyy-MM-dd');
  put_('購物金', 0, { '序號': seq_('購物金', 'G'), 'LINE ID': lid, '發放時間': now_(), '金額': amt, '剩餘': amt, '到期日': exp, '來源': src, '備註': note || '', '操作人': acc, '訂單ID': oid || '', '活動ID': actId || '' });
}
function spend_(lid, amt) {
  var left = amt, detail = {};
  grants_(lid).forEach(function (g) {
    if (left <= 0) return;
    var use = Math.min(left, Number(g.剩餘)), n = cp_(g); n.剩餘 = Number(g.剩餘) - use; put_('購物金', g._r, n);
    detail[String(g.序號)] = use; left -= use;
  });
  if (left > 0) throw new Error('購物金餘額不足');
  return detail;
}
function refund_(json) {
  var d = {}; try { d = JSON.parse(json || '{}'); } catch (e) {}
  rows_('購物金').forEach(function (g) {
    var k = String(g.序號); if (d[k]) { var n = cp_(g); n.剩餘 = Math.min(Number(g.金額), Number(g.剩餘) + Number(d[k])); put_('購物金', g._r, n); }
  });
}
function meInfo_(lid) {
  var m = memberRow_(lid) || {};
  return { name: String(m.暱稱 || ''), pname: String(m.姓名 || ''), phone: String(m.電話 || ''), email: String(m.Email || ''), addr: String(m.收件地址 || ''), pic: String(m.頭像 || ''), level: levelOf_(lid), friend: m.已加好友 === 'Y', balance: balance_(lid),
    grants: grants_(lid).map(function (g) { return { amt: Number(g.剩餘), exp: String(g.到期日), src: String(g.來源) }; }) };
}

/* --- 計價(階梯價 → 等級/活動擇優折扣 → 免運 → 購物金) --- */
function eligSub_(lines, scope, val) {
  var vs = cs_(val), t = 0;
  lines.forEach(function (l) {
    var p = l[0];
    var ok = scope === '全館' || (scope === '類別' && catHit_(cs_(p.類別), vs)) || (scope === '商品' && vs.indexOf(String(p.商品ID)) >= 0);
    if (ok) t += l[1] * l[2];
  });
  return t;
}
var OVR_ = null;   // 代客下單時,指定某些品項的單價(議價)
function calc_(want, ctx, wantCredit, code) {
  var ids = Object.keys(want);
  if (!ids.length) throw new Error('購物車是空的');
  var by = {}; rows_('商品').forEach(function (p) { by[String(p.商品ID)] = p; });
  var lines = [], sub = 0, tot = {}, preTot = {}, preOf = {};
  ids.forEach(function (id) {
    var b = bp_(id), p0 = by[b]; tot[b] = (tot[b] || 0) + want[id];
    preOf[id] = (p0 && rdyIs_(p0)) ? Math.max(0, want[id] - rdyQty_(rdyGet_(b), spec_(id))) : want[id]; // 扣掉可以用現貨出的,剩下才是預購
    preTot[b] = (preTot[b] || 0) + preOf[id];
  });
  ids.forEach(function (id) {
    var p = by[bp_(id)], n = want[id], sp = spec_(id);
    if (p && p.上架 === 'Y' && closed_(p)) throw new Error('「' + p.名稱 + '」已關團,請重新整理頁面');
    if (!onSale_(p)) throw new Error('有商品已下架,請重新整理頁面');
    var sl = specs_(p);
    if (sl.length && !sp) throw new Error('「' + p.名稱 + '」請先選擇規格');
    if (sp && sl.indexOf(sp) < 0) throw new Error('「' + p.名稱 + '」沒有「' + sp + '」這個規格,請重新整理頁面');
    var pn = preOf[id]; // 這筆要算預購的件數(現貨夠就是 0,不看預購名額)
    if (pn > 0 && p.數量 !== '' && Number(p.數量) < preTot[bp_(id)]) throw new Error('「' + p.名稱 + '」數量不足,剩 ' + Number(p.數量) + ' 件');
    if (sp && pn > 0) { var sq = specQty_(p)[sp]; if (sq !== null && sq !== undefined && sq < pn) throw new Error('「' + p.名稱 + '」' + sp + (sq ? ' 數量不足,剩 ' + sq + ' 件' : ' 已售完')); }
    var u = unit_(Number(p.單價), tiers_(p.階梯價), tot[bp_(id)]);
    if (OVR_ && OVR_[id] !== undefined) u = OVR_[id];
    lines.push([p, n, u, sp]); sub += u * n;
  });
  var st = settings_(), lid = ctx && ctx.lid ? ctx.lid : '', lvl = lid ? levelOf_(lid) : '一般會員', t = today_();
  // 折扣碼(後台「折扣碼」頁設定;遊客也可使用):百分比或固定金額,與會員/活動優惠取最划算的一個
  var codeIn = String(code || '').trim(), codeOk = null, codeRow = null;
  var codeMin = 0;
  if (codeIn) { codeRow = findCode_(codeIn); codeOk = !!codeRow; if (codeRow && (Number(codeRow.最低消費) || 0) > sub) { codeMin = Number(codeRow.最低消費); codeRow = null; codeOk = false; } }
  var best = { amt: 0, name: '' };
  function cand(amt, name) { if (amt > best.amt) best = { amt: amt, name: name }; }
  if (codeRow) {
    var cv = Number(codeRow.數值);
    cand(String(codeRow.類型) === '百分比' ? Math.round(sub * cv / 100) : Math.min(cv, sub), '折扣碼 ' + codeRow.折扣碼);
  }
  var rule = levels_().filter(function (r) { return String(r.等級) === lvl; })[0];
  if ((lid || codeOk) && rule) {
    var rate = Number(rule.折扣率);
    if (rate > 0 && rate < 100) cand(Math.round(eligSub_(lines, String(rule.適用類別) ? '類別' : '全館', rule.適用類別) * (100 - rate) / 100), lvl + '優惠');
  }
  rows_('活動').forEach(function (a) {
    if (a.啟用 !== 'Y' || ['折數', '折金額'].indexOf(a.類型) < 0 || a.觸發 !== '下單') return;
    if ((a.開始 && String(a.開始) > t) || (a.結束 && String(a.結束) < t)) return;
    var lv = cs_(a.適用等級); if (lv.length && lv.indexOf(lvl) < 0) return;
    var el = eligSub_(lines, a.範圍, a.範圍值);
    if (el <= 0 || el < Number(a.最低消費 || 0)) return;
    var v = Number(a.數值);
    cand(a.類型 === '折數' ? Math.round(el * (100 - v) / 100) : Math.min(v, el), String(a.名稱));
  });
  var after = Math.max(0, sub - best.amt), free = Number(st.免運門檻) || 0;
  var fee = 0;   // 運費改於出貨時依出貨金額計算(滿免運門檻免運),下單時不收
  var bal = lid ? balance_(lid) : 0, cr = creditRule_(st, after), minSpend = cr.min;
  var allowed = lid && cr.ok ? Math.max(0, Math.min(bal, cr.cap, after)) : 0;
  var credit = Math.min(Math.floor(Number(wantCredit) || 0), allowed);
  return { lines: lines, sub: sub, discount: best.amt, dname: best.amt ? best.name : '', fee: fee, credit: credit, total: after - credit + fee,
    level: lvl, balance: bal, codeName: codeRow ? String(codeRow.折扣碼) : '', allowed: allowed, minSpend: minSpend, codeOk: codeOk, codeMin: codeMin };
}
function quote(tk, items, wantCredit, code) {
  var ctx = null; try { ctx = tk ? mem_(tk) : null; } catch (e) { ctx = null; }
  if (ctx && !ctx.lid) ctx = null;
  var want = {};
  (items || []).slice(0, 60).forEach(function (i) { var n = Math.floor(Number(i.qty)); if (n >= 1 && n <= 99) want[i.id] = (want[i.id] || 0) + n; });
  try {
    var c = calc_(want, ctx, wantCredit ? 1e9 : 0, code);
    return { ok: true, sub: c.sub, discount: c.discount, dname: c.dname, fee: c.fee, credit: c.credit, total: c.total, codeOk: c.codeOk, codeMin: c.codeMin, level: c.level, balance: c.balance, allowed: c.allowed, minSpend: c.minSpend, login: !!ctx };
  } catch (e) { return { ok: false, msg: e.message }; }
}

/* --- 活動送購物金 --- */
function awardCredits_(sid, acc) {
  var sp = rows_('出貨單').filter(function (x) { return String(x.出貨單ID) === sid; })[0];
  if (!sp) return;
  var lid = String(sp['LINE ID'] || ''); if (!lid) return;
  var f = FLOW[sp.付款方式]; if (!f) return;
  var idx = f.indexOf(sp.狀態), last = f.length - 1;
  var ret = String(sp.狀態) === '已退回', paid = ret ? false : (sp.付款方式 === '賣貨便' || sp.付款方式 === '付現金') ? idx === si_(sp.付款方式) : idx >= ri_(sp.付款方式), done = ret ? false : idx === si_(sp.付款方式);
  var at = String(sp.建立時間).slice(0, 10), lvl = String(sp.會員等級 || '一般會員');
  var pc = {}; rows_('商品').forEach(function (p) { pc[String(p.商品ID)] = p; });
  var lines = rows_('訂單明細').filter(function (l) { return String(l.出貨單ID) === sid; }).map(function (l) { return [pc[bp_(l.商品ID)] || { 商品ID: l.商品ID, 類別: '' }, Number(l.數量), Number(l.單價)]; });
  var st = settings_();
  rows_('活動').forEach(function (a) {
    if (a.啟用 !== 'Y' || ['送購物金', '送購物金%'].indexOf(a.類型) < 0) return;
    if ((a.開始 && at < String(a.開始)) || (a.結束 && at > String(a.結束))) return;
    if (a.觸發 === '付款後' ? !paid : a.觸發 === '出貨完成' ? !done : true) return;
    var lv = cs_(a.適用等級); if (lv.length && lv.indexOf(lvl) < 0) return;
    if (rows_('購物金').some(function (g) { return String(g.訂單ID) === sid && String(g.活動ID) === String(a.活動ID); })) return;
    var el = eligSub_(lines, a.範圍, a.範圍值);
    if (el <= 0 || el < Number(a.最低消費 || 0)) return;
    var amt = a.類型 === '送購物金' ? Number(a.數值) : Math.round(el * Number(a.數值) / 100);
    if (!(amt > 0)) return;
    addGrant_(lid, amt, Number(a.有效天數) || Number(st.購物金預設有效天數) || 90, '活動:' + a.名稱, '出貨單 ' + sid, acc, sid, a.活動ID);
    log_(acc, '活動發放購物金', sid, a.名稱 + ' ' + amt + ' 元 → ' + lid);
  });
}

/* --- 後台:會員、購物金、等級、活動、設定 --- */
function adminMembers(tk) {
  me_(tk);
  var cnt = {}, spent = {};
  rows_('訂單').forEach(function (o) { var k = String(o['LINE ID'] || ''); if (k) { cnt[k] = (cnt[k] || 0) + 1; spent[k] = (spent[k] || 0) + Number(o.總額); } });
  return {
    levels: levels_().map(function (r) { return String(r.等級); }),
    members: rows_('會員').reverse().map(function (m) {
      var k = String(m['LINE ID']);
      return { lid: k, name: String(m.暱稱), pic: String(m.頭像), level: String(m.等級), joined: String(m.加入時間), last: String(m.最近登入), friend: m.已加好友 === 'Y', blocked: m.已加好友 === 'Y' ? '' : String(m.封鎖時間 || ''), note: String(m.備註 || ''), balance: balance_(k), orders: cnt[k] || 0, spent: spent[k] || 0 };
    })
  };
}
function adminMemberGrants(tk, lid) {
  me_(tk);
  return rows_('購物金').filter(function (g) { return String(g['LINE ID']) === lid; }).reverse().map(function (g) {
    return { seq: String(g.序號), at: String(g.發放時間), amt: Number(g.金額), rem: Number(g.剩餘), exp: String(g.到期日), src: String(g.來源), note: String(g.備註), by: String(g.操作人), oid: String(g.訂單ID), voided: /【已作廢/.test(String(g.備註 || '')) };
  });
}
function adminSetLevel(tk, lid, level, note) {
  var u = me_(tk);
  lk_(function () {
    var m = memberRow_(lid); if (!m) throw new Error('找不到會員');
    if (!levels_().some(function (r) { return String(r.等級) === level; })) throw new Error('沒有這個等級');
    var n = cp_(m); n.等級 = level; n.備註 = t_(note, 100); put_('會員', m._r, n);
    log_(u.acc, '修改會員等級', m.暱稱, m.等級 + '→' + level);
  });
  return adminMembers(tk);
}
function adminGrant(tk, lid, amt, days, note, force, cnt) {
  var u = me_(tk), n = Math.floor(Number(cnt || 1));
  if (!(n >= 1 && n <= 20)) throw new Error('張數需為 1-20');
  lk_(function () {
    var m = memberRow_(lid); if (!m) throw new Error('找不到會員');
    var a = Math.floor(Number(amt)), dd = Math.floor(Number(days));
    if (!(a >= 1 && a <= 100000)) throw new Error('金額需為 1-100000');
    if (!(dd >= 1 && dd <= 3650)) throw new Error('有效天數需為 1-3650');
    // 防呆:10 秒內同一位會員、同金額、同備註、同操作人的手動發放,視為連點重複,不再發第二筆
    var nowMs = Date.now(), dupG = rows_('購物金').filter(function (g) {
      if (String(g['LINE ID']) !== String(lid) || String(g.來源) !== '手動發放' || Number(g.金額) !== a || String(g.備註 || '') !== t_(note, 100) || String(g.操作人) !== u.acc) return false;
      var tm = new Date(String(g.發放時間).replace(' ', 'T') + '+08:00').getTime(); return nowMs - tm >= 0 && nowMs - tm < 10000;
    });
    if (dupG.length && !force) throw new Error('DUPGRANT:剛剛(10 秒內)已經發放過一筆相同金額的購物金(' + dupG[0].序號 + ')');
    for (var k = 0; k < n; k++) addGrant_(lid, a, dd, '手動發放', t_(note, 100), u.acc, '', '');
    log_(u.acc, '發放購物金', m.暱稱, a + ' 元' + (n > 1 ? ' ×' + n + ' 張(共 ' + a * n + ' 元)' : '') + ',' + dd + ' 天;' + t_(note, 100) + (dupG.length ? '(確認後再發一次)' : ''));
  });
  return adminMembers(tk);
}
function adminVoidGrant(tk, seq) {
  var u = me_(tk);
  lk_(function () {
    var g = rows_('購物金').filter(function (x) { return String(x.序號) === seq; })[0]; if (!g) throw new Error('找不到這筆購物金');
    if (Number(g.剩餘) <= 0) throw new Error('這筆購物金剩餘 0 元,不需要作廢');
    var n = cp_(g); n.剩餘 = 0; n.備註 = (String(g.備註 || '') + ' 【已作廢 ' + g.剩餘 + ' 元 ' + u.acc + ' ' + now_().slice(5, 16) + '】').trim(); put_('購物金', g._r, n);
    log_(u.acc, '作廢購物金', seq, '剩餘 ' + g.剩餘 + ' 元');
  });
  return adminMembers(tk);
}
function adminLevels(tk) { me_(tk); return levels_().map(function (r) { return { name: String(r.等級), rate: Number(r.折扣率), cats: String(r.適用類別 || '') }; }); }
function adminSaveLevel(tk, d) {
  var u = me_(tk);
  lk_(function () {
    var name = t_(d.name, 20), rate = Number(d.rate);
    if (!name) throw new Error('請填寫等級名稱');
    if (!(rate >= 1 && rate <= 100)) throw new Error('折扣率需為 1-100(100 代表無折扣,90 代表 9 折)');
    var old = levels_().filter(function (r) { return String(r.等級) === name; })[0];
    var o = { '等級': name, '折扣率': rate, '適用類別': t_(d.cats, 100) };
    put_('等級', old ? old._r : 0, o);
    log_(u.acc, old ? '修改等級' : '新增等級', name, '折扣率 ' + rate + ',類別 ' + o.適用類別);
  });
  return adminLevels(tk);
}
function adminDeleteLevel(tk, name) {
  var u = me_(tk);
  lk_(function () {
    if (name === '一般會員') throw new Error('「一般會員」是預設等級,不能刪除');
    if (rows_('會員').some(function (m) { return String(m.等級) === name; })) throw new Error('還有會員是這個等級,請先調整他們的等級');
    var r = levels_().filter(function (x) { return String(x.等級) === name; })[0]; if (!r) throw new Error('找不到等級');
    sh_('等級').deleteRow(r._r); log_(u.acc, '刪除等級', name, '');
  });
  return adminLevels(tk);
}
function actOut_(a) {
  return { id: String(a.活動ID), name: String(a.名稱), from: String(a.開始), to: String(a.結束), scope: String(a.範圍), val: String(a.範圍值), lv: String(a.適用等級), type: String(a.類型), num: Number(a.數值),
    min: a.最低消費 === '' ? '' : Number(a.最低消費), when: String(a.觸發), days: a.有效天數 === '' ? '' : Number(a.有效天數), on: a.啟用 === 'Y' };
}
function adminActivities(tk) { me_(tk); return rows_('活動').reverse().map(actOut_); }
function adminSaveActivity(tk, d) {
  var u = me_(tk);
  lk_(function () {
    var name = t_(d.name, 40); if (!name) throw new Error('請填寫活動名稱');
    var types = ['折數', '折金額', '送購物金', '送購物金%'];
    if (types.indexOf(d.type) < 0) throw new Error('請選擇優惠類型');
    if (['全館', '類別', '商品'].indexOf(d.scope) < 0) throw new Error('請選擇適用範圍');
    var num = Number(d.num); if (!(num > 0)) throw new Error('優惠數值需大於 0');
    if (d.type === '折數' && !(num < 100)) throw new Error('折數請填 1-99(90 代表 9 折)');
    if (d.type === '送購物金%' && !(num <= 100)) throw new Error('比例請填 1-100');
    var when = d.type === '折數' || d.type === '折金額' ? '下單' : d.when;
    if (['下單', '付款後', '出貨完成'].indexOf(when) < 0) throw new Error('請選擇發放時機');
    if (d.scope !== '全館' && !t_(d.val, 300)) throw new Error('請填寫類別名稱或商品編號(多個用逗號分隔)');
    if (d.from && d.to && d.from > d.to) throw new Error('開始日期不能晚於結束日期');
    var ex = d.id ? rows_('活動').filter(function (a) { return String(a.活動ID) === d.id; })[0] : null;
    var id = d.id;
    if (!ex) { var mx = 0; rows_('活動').forEach(function (a) { mx = Math.max(mx, parseInt(String(a.活動ID).slice(1), 10) || 0); }); id = 'A' + ('000' + (mx + 1)).slice(-3); }
    var o = { '活動ID': id, '名稱': name, '開始': d.from || '', '結束': d.to || '', '範圍': d.scope, '範圍值': d.scope === '全館' ? '' : t_(d.val, 300), '適用等級': t_(d.lv, 100), '類型': d.type, '數值': num,
      '最低消費': d.min === '' || d.min == null ? '' : Number(d.min), '觸發': when, '有效天數': d.days === '' || d.days == null ? '' : Number(d.days), '啟用': d.on ? 'Y' : 'N' };
    put_('活動', ex ? ex._r : 0, o);
    log_(u.acc, ex ? '修改活動' : '新增活動', id + ' ' + name, ex ? diff_(ex, o) : d.type + ' ' + num);
  });
  return adminActivities(tk);
}
function adminDeleteActivity(tk, id) {
  var u = me_(tk);
  lk_(function () {
    var a = rows_('活動').filter(function (x) { return String(x.活動ID) === id; })[0]; if (!a) throw new Error('找不到活動');
    sh_('活動').deleteRow(a._r); log_(u.acc, '刪除活動', id + ' ' + a.名稱, '');
  });
  return adminActivities(tk);
}
var SET_KEYS = ['店名', '店到店運費', '賣貨便運費', '宅配運費', '免運門檻', '匯款資訊', '公告', '購物金折抵級距', '購物金使用門檻', '購物金折抵上限', '購物金預設有效天數', '購物金注意事項', '到貨通知內容', '下單成功通知內容', '出貨通知內容', '出貨單成立通知內容', '賣貨便成立通知內容', '分享回饋通知內容', '可自取通知內容', '發票開立通知內容', '到店通知內容', '寄件人姓名', '寄件人手機', '退回通知內容', '送達通知內容', '未收到匯款通知內容', '物流追蹤連結', '加好友連結', '公司名稱', '公司地址', '統一編號', 'IG連結', 'LINE社群連結', '節慶裝飾'];
function defSet_(k) { var r = DEFAULT_SETTINGS.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : ''; }
function adminSettings(tk) {
  me_(tk); var s = settings_(), o = {};
  SET_KEYS.forEach(function (k) { o[k] = s[k] === undefined ? defSet_(k) : s[k]; });
  return { values: o, line: { login: lineOn_(), msg: !!prop_('LINE_MSG_TOKEN'), url: appUrl_() }, arr: { bound: !!String(s.到貨管理員LINE || ''), ai: !!prop_('ANTHROPIC_API_KEY'), cb: !!prop_('COOLBAU_ARR_SECRET'), cbPend: cbPend_().length, cf: arrConfirmers_() }, xmz: { subs: xmzSubs_().length, items: xmzItems_().length, sent: String(s['聖誕專區上線通知'] || '') } };
}
function adminSaveSettings(tk, v) {
  var u = me_(tk);
  lk_(function () {
    ['店到店運費', '賣貨便運費', '宅配運費', '免運門檻', '購物金使用門檻', '購物金預設有效天數'].forEach(function (k) { if (!(Number(v[k]) >= 0) || String(v[k]).trim() === '') throw new Error(k + ' 請填數字'); });
    if (String(v.購物金折抵上限).trim() !== '' && !(Number(v.購物金折抵上限) >= 0)) throw new Error('購物金折抵上限請填數字,或留空代表不限制');
    if (String(v.購物金折抵級距 || '').trim() && !String(v.購物金折抵級距).trim().split(/[,，\s]+/).every(function (x) { return /^\d+=\d+$/.test(x); })) throw new Error('購物金折抵級距格式:滿多少=折多少,用逗號分隔,例如 500=50,1000=150;留空代表改用門檻+上限');
    ['加好友連結', 'IG連結', 'LINE社群連結'].forEach(function (k) { if (String(v[k] || '').trim() && !/^https:\/\//.test(String(v[k]).trim())) throw new Error(k + '需以 https:// 開頭'); });
    if (v.節慶裝飾 !== undefined && ['', '聖誕節'].indexOf(String(v.節慶裝飾)) < 0) throw new Error('節慶裝飾只能選 關閉 或 聖誕節');
    var cur = rows_('設定'), ch = [];
    SET_KEYS.forEach(function (k) {
      if (v[k] === undefined) return;
      var nv = typeof v[k] === 'string' ? t_(v[k], 1000) : v[k], ex = cur.filter(function (r) { return r.項目 === k; })[0];
      if (['店到店運費', '賣貨便運費', '宅配運費', '免運門檻', '購物金使用門檻', '購物金預設有效天數'].indexOf(k) >= 0 || (k === '購物金折抵上限' && nv !== '')) nv = Number(nv);
      if (ex) { if (String(ex.值) !== String(nv)) { ch.push(k + ':' + ex.值 + '→' + nv); put_('設定', ex._r, { '項目': k, '值': nv }); } }
      else { ch.push(k + ':新增'); put_('設定', 0, { '項目': k, '值': nv }); }
    });
    if (ch.length) log_(u.acc, '修改設定', '', ch.join(';'));
  });
  return adminSettings(tk);
}

/* ================= 匯入舊 Excel 訂單(一次性工具) =================
   資料由後台「匯入舊資料」頁選擇 JSON 檔後,分段送來(商品 → 訂單 → 庫存)。
   已出貨(出貨日期有填日期)的列不匯入;客人欄空白 = 公司庫存。 */
function hNum_(v) { if (v === '' || v == null) return null; var n = Number(String(v).replace(/,/g, '')); return isFinite(n) ? n : null; }
function hDate_(v) { var m = String(v == null ? '' : v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
function hNorm_(s) { return String(s || '').toLowerCase().replace(/[\s\-_－—（）()・·.．]/g, ''); }
function hEta_(s) { var m = String(s || '').match(/(\d{1,2})\/(\d{1,2})/); if (!m) return ''; var mo = Number(m[1]); return (mo < 6 ? 2027 : 2026) + '-' + ('0' + mo).slice(-2) + '-' + ('0' + Number(m[2])).slice(-2); }
function hCls_(r) {
  var name = String(r['品名'] == null ? '' : r['品名']).trim(), st = String(r['出貨日期'] == null ? '' : r['出貨日期']).trim();
  if (!name || name === '+') return { skip: '空白列' };
  if (/^\d{4}-\d{2}-\d{2}/.test(st) || /^202\/\d/.test(st)) return { skip: '已出貨' };
  var buyer = String(r['購買人'] == null ? '' : r['購買人']).trim(), spec0 = String(r['規格'] == null ? '' : r['規格']).trim();
  var spec = /^x$/i.test(spec0) ? '' : spec0.split('|').join('/').split('~').join('-').split('=').join('-');
  var s5 = String(r['入庫日期'] == null ? '' : r['入庫日期']).trim(), inD = hDate_(s5), m5 = s5.match(/^(\d{4})(\d{1,2})\/(\d{1,2})$/);
  if (!inD && m5) inD = m5[1] + '-' + ('0' + m5[2]).slice(-2) + '-' + ('0' + m5[3]).slice(-2);
  var c = hNum_(r['含稅成本']), cu = hNum_(r['未稅成本']);
  var prices = [r['含稅售價'], r['未稅售價'], r['群友價'], r['定價']].map(hNum_).filter(function (x) { return x !== null && x > 0; });
  var unit = prices[0] || 0, plist = hNum_(r['群友價']) || hNum_(r['定價']) || unit;
  var o = { kind: buyer ? 'cust' : 'stock', buyer: buyer, brand: String(r['品牌'] == null ? '' : r['品牌']).trim(), name: name, spec: spec, st: st,
    vendor: String(r['廠商'] == null ? '' : r['廠商']).trim(), cost: c !== null ? c : (cu !== null ? cu : ''), tax: c !== null ? 'Y' : 'N', unit: unit, plist: plist,
    eta: hEta_(s5), inDate: inD, pdate: hDate_(r['乙瑄訂購日期']), note: String(r['備註'] == null ? '' : r['備註']).trim(), fee: hNum_(r['運費']) || 0, paid: hDate_(r['售價收款日期']) };
  o.pkey = hNorm_(o.brand) + '|' + hNorm_(name);
  if (o.kind === 'cust') {
    o.odate = hDate_(r['客人訂購日期']) || o.pdate; if (!o.odate) return { skip: '沒有訂購日期' };
    var q = hNum_(r['銷售數量']); o.qty = q && q >= 1 ? Math.floor(q) : 1;
    o.arrived = st === '已通知付款' || st === '在庫中'; o.ptype = st === '在庫中' ? '現貨' : '預購';
  } else {
    var q2 = hNum_(r['入庫數量']); o.qty = q2 && q2 >= 1 ? Math.floor(q2) : 1;
    o.odate = o.pdate || inD || today_(); o.arrived = st !== '預購中' && !!inD; o.ptype = '現貨';
  }
  return o;
}
function hPmap_() {
  var m = { byKey: {}, byName: {} };
  rows_('商品').forEach(function (p) { var n = hNorm_(p.名稱); m.byKey[hNorm_(p.品牌) + '|' + n] = p; (m.byName[n] = m.byName[n] || []).push(p); });
  return m;
}
function hFind_(c, pm) { var h = pm.byKey[c.pkey]; if (h) return h; var l = pm.byName[hNorm_(c.name)]; return l && l.length === 1 ? l[0] : null; }
function hMaxSeq_(sheet, prefix) {
  var m = {}; rows_(sheet).forEach(function (r) { var id = String(r[H[sheet][0]]); if (id.indexOf(prefix) === 0 && id.length === prefix.length + 9) { var k = id.slice(0, prefix.length + 6); m[k] = Math.max(m[k] || 0, Number(id.slice(-3)) || 0); } });
  return m;
}
function hNext_(m, prefix, date) { var k = prefix + date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10); m[k] = (m[k] || 0) + 1; return k + ('000' + m[k]).slice(-3); }
function hVendor_(v) { if (!v) return; var has = rows_('廠商').some(function (r) { return String(r.廠商).trim() === v; }) || rows_('商品_內部').some(function (r) { return String(r.廠商).trim() === v; }); if (!has) put_('廠商', 0, { '廠商': v }); }

function adminHistImport(tk, step, rows, dry) {
  var u = me_(tk); rows = rows || []; dry = !!dry;
  if (rows.length > 3000) throw new Error('一次資料太多');
  var out = { ok: true, dry: dry, step: step, skipped: {} };
  lk_(function () {
    var cl = rows.map(hCls_), all = [];
    cl.forEach(function (c) { if (c.skip) out.skipped[c.skip] = (out.skipped[c.skip] || 0) + 1; else all.push(c); });
    if (step === 'products') hProducts_(u, all, dry, out);
    else if (step === 'orders') hOrders_(u, all.filter(function (c) { return c.kind === 'cust'; }), dry, out);
    else if (step === 'stock') hStock_(u, all.filter(function (c) { return c.kind === 'stock'; }), dry, out);
    else throw new Error('未知步驟');
    if (!dry) log_(u.acc, '匯入舊資料', step, JSON.stringify({ n: rows.length, created: out.created, orders: out.orders, lines: out.lines, ships: out.ships, stock: out.stock }));
  });
  return out;
}

function hProducts_(u, all, dry, out) {
  var G = {}, ks = [];
  all.forEach(function (c) {
    var g = G[c.pkey]; if (!g) { g = G[c.pkey] = { brand: c.brand, name: c.name, specs: [], pend: 0, stockRows: 0, sq: {}, etas: {}, price: 0, vendor: '', cost: '', tax: 'N', cd: '' }; ks.push(c.pkey); }
    if (c.spec && g.specs.indexOf(c.spec) < 0) g.specs.push(c.spec);
    if (c.kind === 'cust' && !c.arrived) { g.pend++; if (c.eta) g.etas[c.eta] = (g.etas[c.eta] || 0) + 1; }
    if (c.kind === 'stock') { g.stockRows++; if (c.arrived) g.sq[c.spec] = (g.sq[c.spec] || 0) + c.qty; if (!c.arrived && c.eta) g.etas[c.eta] = (g.etas[c.eta] || 0) + 1; }
    if (c.plist) g.price = c.plist;
    if (c.cost !== '' && (c.pdate >= g.cd)) { g.vendor = c.vendor || g.vendor; g.cost = c.cost; g.tax = c.tax; g.cd = c.pdate; }
    else if (!g.vendor && c.vendor) g.vendor = c.vendor;
  });
  var pm = hPmap_(), mx = 0;
  rows_('商品').forEach(function (p) { mx = Math.max(mx, parseInt(String(p.商品ID).slice(1), 10) || 0); });
  var created = [], matched = [], filled = 0;
  ks.forEach(function (k) {
    var g = G[k], ex = hFind_({ pkey: k, name: g.name }, pm);
    if (ex) {
      matched.push(g.name + ' → ' + ex.商品ID);
      var oi = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === String(ex.商品ID); })[0];
      if (g.cost !== '' && (!oi || oi.成本 === '' || oi.成本 === undefined)) {
        filled++;
        if (!dry) { hVendor_(g.vendor); put_('商品_內部', oi ? oi._r : 0, { '商品ID': String(ex.商品ID), '廠商': g.vendor || (oi ? oi.廠商 : ''), '成本': g.cost, '成本含稅': g.tax, '貨源': oi ? oi.貨源 : '', '鎖定': oi ? oi.鎖定 : 'N' }); }
      }
      return;
    }
    var sumArr = 0; Object.keys(g.sq).forEach(function (s0) { sumArr += g.sq[s0]; });
    mx++; var id = 'P' + ('000' + mx).slice(-3), hasStock = sumArr > 0, specStr = '', total = '', eta = '', best = 0;
    if (hasStock) {
      if (g.specs.length) { total = 0; specStr = g.specs.map(function (s) { var q = g.sq[s] || 0; total += q; return s + '=' + q; }).join('|'); }
      else total = g.sq[''] || 0;
    } else {
      specStr = g.specs.join('|');
      Object.keys(g.etas).forEach(function (e) { if (g.etas[e] > best) { best = g.etas[e]; eta = e; } });
    }
    var on = false; // 匯入的商品一律先下架,由店家逐一確認後再上架
    created.push(id + ' ' + g.name + (on ? '(上架)' : '(下架)'));
    if (!dry) {
      var brand = g.brand ? brandResolve_(u, { newBrand: g.brand }) : '';
      hVendor_(g.vendor);
      put_('商品', 0, { '商品ID': id, '名稱': g.name, '類別': '', '銷售型態': hasStock ? '現貨' : '預購', '單價': g.price || 0, '數量': total, '到貨日期': eta, '說明': '', '階梯價': '', '圖片': '', '上架': on ? 'Y' : 'N', '規格': specStr, '品牌': brand });
      put_('商品_內部', 0, { '商品ID': id, '廠商': g.vendor, '成本': g.cost, '成本含稅': g.tax, '貨源': '', '鎖定': 'N' });
    }
  });
  out.created = created.length; out.createdList = created; out.matched = matched.length; out.matchedList = matched; out.costFilled = filled;
}

function hOrders_(u, cust, dry, out) {
  var pm = hPmap_(), om = hMaxSeq_('訂單', 'O'), sm = hMaxSeq_('出貨單', 'S'), have = {};
  rows_('訂單').forEach(function (o) { if (String(o.備註).indexOf('[匯入]') === 0) have[String(o.姓名) + '|' + String(o.下單時間).slice(0, 10)] = 1; });
  var G = {}, ks = [];
  cust.forEach(function (c) { var k = c.buyer + '|' + c.odate; if (!G[k]) { G[k] = []; ks.push(k); } G[k].push(c); });
  var nOrd = 0, nLine = 0, nShip = 0, dup = 0, miss = [], shipLines = 0;
  ks.forEach(function (k) {
    if (have[k]) { dup++; return; }
    var ls = G[k], b = ls[0].buyer, od = ls[0].odate, items = [];
    ls.forEach(function (c) { var p = hFind_(c, pm); if (!p && dry) p = { '商品ID': '(新商品)' }; if (!p) { miss.push(c.name); return; } items.push({ c: c, p: p }); });
    if (!items.length) return;
    var oid = hNext_(om, 'O', od), sub = 0, notes = {}, rowsL = [];
    items.forEach(function (it) { sub += it.c.qty * it.c.unit; if (it.c.note) notes[it.c.note] = 1; });
    items.forEach(function (it) { if (!it.c.arrived && it.c.paid) notes['已收款 ' + it.c.paid + '(' + it.c.name + (it.c.spec ? '-' + it.c.spec : '') + '),待到貨後再開出貨單'] = 1; });
    // 已到貨且已收款的品項 → 依收款日合併成一張「已查帳待出貨」出貨單
    var sg = {}, sorder = [];
    items.forEach(function (it) { if (it.c.arrived && it.c.paid) { if (!sg[it.c.paid]) { sg[it.c.paid] = []; sorder.push(it.c.paid); } sg[it.c.paid].push(it); } });
    var sidOf = [];
    sorder.forEach(function (pd) {
      var g = sg[pd], sid = hNext_(sm, 'S', pd), s = 0, fee = 0;
      g.forEach(function (it) { s += it.c.qty * it.c.unit; fee = Math.max(fee, it.c.fee); it.sid = sid; });
      nShip++; shipLines += g.length;
      if (!dry) put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': oid, '狀態': '已查帳待出貨', '物流': '', '物流單號': '', '品項': g.map(function (it) { return it.c.name + (it.c.spec ? '-' + it.c.spec : '') + '×' + it.c.qty; }).join('、'), '建立時間': pd + ' 12:00:00', '出貨時間': '',
        'LINE ID': '', '姓名': b, '電話': '', '付款方式': '匯款', '收件資訊': '', '備註': '[匯入]', '商品金額': s, '優惠折抵': 0, '購物金折抵': 0, '運費': fee, '總額': s + fee, '付款連結': '', '匯款後五碼': '', '會員等級': '一般會員', '折抵明細': JSON.stringify((function () { var x = {}; x[oid] = [0, 0]; return x; })()), '配送方式': '', '購物金明細': '{}' });
    });
    var inShip = items.filter(function (it) { return it.sid; }).length, st = inShip === 0 ? '已下訂' : (inShip < items.length ? '部分出貨' : '已全部出貨');
    nOrd++; nLine += items.length;
    if (!dry) {
      put_('訂單', 0, { '訂單ID': oid, '下單時間': od + ' 12:00:00', '姓名': b, '電話': '', '付款方式': '', '狀態': st, '商品金額': sub, '運費': 0, '總額': sub, '收件資訊': '', '備註': '[匯入]' + Object.keys(notes).join(' / '), 'LINE ID': '', '付款連結': '', '匯款後五碼': '', '會員等級': '一般會員', '優惠名稱': '', '優惠折抵': 0, '購物金折抵': 0, '購物金明細': '{}', '電子郵件': '', '折扣碼': '' });
      items.forEach(function (it) {
        var c = it.c, ar = c.arrived;
        put_('訂單明細', 0, { '訂單ID': oid, '商品ID': String(it.p.商品ID) + (c.spec ? '~' + c.spec : ''), '品名': c.name, '數量': c.qty, '單價': c.unit, '小計': c.qty * c.unit, '到貨狀態': ar ? '已到貨' : '待到貨', '可出貨': ar ? 'Y' : 'N', '申請出貨': '', '出貨單ID': it.sid || '', '型態': c.ptype,
          '廠商': c.vendor, '成本': c.cost, '成本含稅': c.tax, '貨源': '', '廠商付款ID': '', '規格': c.spec, '到貨操作人': ar ? '匯入' : '', '到貨時間': ar ? ((c.inDate || od) + ' 00:00:00') : '', '叫貨狀態': '已叫貨', '叫貨人': '匯入', '叫貨時間': od + ' 00:00:00' });
      });
    }
  });
  out.orders = nOrd; out.lines = nLine; out.ships = nShip; out.shipLines = shipLines; out.dup = dup; out.missing = miss.slice(0, 20);
  hVendors_(cust, dry);
}
function hVendors_(cust, dry) { if (dry) return; var seen = {}; cust.forEach(function (c) { if (c.vendor && !seen[c.vendor]) { seen[c.vendor] = 1; hVendor_(c.vendor); } }); }

function hStock_(u, stock, dry, out) {
  var pm = hPmap_(), km = hMaxSeq_('庫存進貨', 'K'), have = rows_('庫存進貨').some(function (r) { return String(r.建立人) === '匯入'; }), n = 0, miss = [], arr = 0;
  if (have && !dry) throw new Error('庫存已經匯入過了');
  stock.forEach(function (c) {
    var p = hFind_(c, pm); if (!p && dry) p = { '商品ID': '(新商品)' }; if (!p) { miss.push(c.name); return; }
    n++; if (c.arrived) arr++;
    if (dry) return;
    var d = c.inDate || c.pdate || today_();
    put_('庫存進貨', 0, { '訂單ID': hNext_(km, 'K', d), '商品ID': String(p.商品ID), '品名': c.name, '規格': c.spec, '數量': c.qty, '到貨狀態': c.arrived ? '已到貨' : '待到貨', '廠商': c.vendor, '成本': c.cost, '成本含稅': c.tax, '貨源': '', '廠商付款ID': '',
      '到貨操作人': c.arrived ? '匯入' : '', '到貨時間': c.arrived ? d + ' 00:00:00' : '', '日期': d, '建立人': '匯入', '出貨單ID': '' });
  });
  out.stock = n; out.stockArrived = arr; out.missing = miss.slice(0, 20);
}

/** 舊訂單綁定 LINE 會員:列出尚未綁定的購買人,與目前所有會員(供後台搜尋) */
function adminHistBindList(tk) {
  me_(tk);
  var cnt = {}, items = {};
  rows_('訂單明細').forEach(function (l) { items[String(l.訂單ID)] = (items[String(l.訂單ID)] || 0) + 1; });
  rows_('訂單').forEach(function (o) {
    if (String(o.備註).indexOf('[匯入]') !== 0 || String(o['LINE ID'] || '')) return;
    var k = String(o.姓名); cnt[k] = cnt[k] || { name: k, orders: 0, items: 0 }; cnt[k].orders++; cnt[k].items += items[String(o.訂單ID)] || 0;
  });
  var gs = Object.keys(cnt).map(function (k) { return cnt[k]; }).sort(function (a, b) { return b.items - a.items; });
  var ms = rows_('會員').map(function (m) { return { id: String(m['LINE ID']), nick: String(m.暱稱 || ''), real: String(m.姓名 || ''), joined: String(m.加入時間 || '').slice(0, 10) }; });
  var notes = {}; try { notes = JSON.parse(String(settings_().舊訂單備註 || '{}')) || {}; } catch (e) {}
  return { groups: gs, members: ms, notes: notes };
}
/** 匯入舊資料:每位購買人的備註(存在設定「舊訂單備註」) */
function adminHistNote(tk, name, note) {
  var u = me_(tk); name = String(name || '').slice(0, 100); note = t_(note, 200);
  lk_(function () {
    var m = {}; try { m = JSON.parse(String(settings_().舊訂單備註 || '{}')) || {}; } catch (e) {}
    if (note) m[name] = note; else delete m[name];
    setSet_('舊訂單備註', JSON.stringify(m));
    log_(u.acc, '舊訂單備註', name, note);
  });
  return { ok: true };
}
var BIND_MSG_ = 'coscos網站綁定成功!之後下單成功、到貨、出貨都會傳通知到這邊唷❤️謝謝您～';
/** 補發「綁定成功」通知給單一會員(回傳成功/失敗原因) */
function adminHistRenotify(tk, lid) {
  var u = me_(tk), m = rows_('會員').filter(function (x) { return String(x['LINE ID']) === String(lid); })[0];
  if (!m) throw new Error('找不到這位會員');
  var ok = pushLine_(String(lid), BIND_MSG_);
  log_(u.acc, ok ? '補發綁定通知' : '補發綁定通知失敗', String(m.暱稱), ok ? '' : LINE_ERR_);
  var r = adminHistBindList(tk); r.msg = ok ? '已補發綁定成功通知給「' + m.暱稱 + '」' : '「' + m.暱稱 + '」發送失敗:' + LINE_ERR_; return r;
}
function adminHistBind(tk, pairs) {
  var u = me_(tk), done = 0, skip = [], notify = {};
  lk_(function () {
    var mem = {}; rows_('會員').forEach(function (m) { mem[String(m['LINE ID'])] = m; });
    (pairs || []).slice(0, 300).forEach(function (p) {
      var name = String(p.name), lid = String(p.id);
      if (!mem[lid]) { skip.push(name + ':找不到會員'); return; }
      var n = 0;
      rows_('訂單').forEach(function (o) { if (String(o.姓名) === name && String(o.備註).indexOf('[匯入]') === 0 && !String(o['LINE ID'] || '')) { var x = cp_(o); x['LINE ID'] = lid; put_('訂單', o._r, x); n++; } });
      rows_('出貨單').forEach(function (s) { if (String(s.姓名) === name && String(s.備註).indexOf('[匯入]') === 0 && !String(s['LINE ID'] || '')) { var x = cp_(s); x['LINE ID'] = lid; put_('出貨單', s._r, x); } });
      if (n) { done++; notify[lid] = 1; log_(u.acc, '綁定舊訂單', name, '→ ' + String(mem[lid].暱稱) + ' ' + n + ' 張'); } else skip.push(name + ':沒有可綁定的訂單');
    });
  });
  // 綁定成功後,用 LINE 通知客人(每位會員只發一則)
  var okN = 0, failN = 0, failL = [];
  Object.keys(notify).forEach(function (lid) {
    if (pushLine_(lid, BIND_MSG_)) okN++; else { failN++; var mm = rows_('會員').filter(function (m) { return String(m['LINE ID']) === lid; })[0]; failL.push((mm ? String(mm.暱稱) : lid) + '(' + LINE_ERR_ + ')'); }
  });
  failL.forEach(function (x) { log_(u.acc, '綁定通知失敗', x.split('(')[0], x); });
  var r = adminHistBindList(tk); r.msg = '已綁定 ' + done + ' 位,已用 LINE 通知 ' + okN + ' 位' + (failN ? '(' + failN + ' 位通知發送失敗:' + failL.join('、') + ')。可到下方「補發綁定通知」重發' : '') + (skip.length ? ',略過 ' + skip.length + ':' + skip.join('、') : ''); return r;
}


/* ===== 以下由 build.py 加入 ===== */
export const API = {resetAdmin, getShop, placeOrder, adminProxyQuote, adminPlaceOrder, adminLogin, adminVendors, adminBrands, adminAddBrand, adminRenameBrand, adminDeleteBrand, adminCats, adminAddCat, adminRenameCat, adminRenameBig, adminDeleteBig, adminDeleteCat, adminAddVendor, adminDeleteVendor, adminCarriers, adminSaveCarrier, adminDeleteCarrier, trackLink, adminInit, adminSaveProduct, adminDeleteProduct, memberXmasSub, adminXmasNotify, adminBatchProducts, adminBatchProductDates, adminCodes, adminSaveCode, adminSetCodeOn, adminDeleteCode, adminSaveAdmin, adminLogs, memberLogin, memberOrders, memberSaveProfile, memberChangePay, memberReportPay, adminBatchArrival, adminLineHistory, adminBatchOrder, adminPurchaseList, adminLineInfo, adminArrivalRenotify, adminRecordPayment, adminUpdatePayment, adminDeletePayment, adminStockView, adminAddStockIn, adminDeleteStockIn, adminBatchDeleteLines, adminReport, adminOrders, adminOrderAdjust, adminBatchOrderCode, adminUpdateOrder, adminEditLine, adminEditLineFull, adminDeleteOrder, adminBatchDeleteOrders, adminCreateShip, adminUpdateShip, adminShipResend, adminShipPrinted, adminRemitMissing, adminBatchShipStatus, adminDeleteShip, adminAdjustShip, adminMergeShips, adminExpenses, adminSaveExpense, adminDeleteExpense, adminMonthly, adminSaveFixed, adminSaveStaff, adminDeleteMonthlyItem, adminBatchDeleteShips, adminShipHistory, adminBatch, memberCheckout, memberShipQuote, adminLogiClear, memberCreateShip, adminShipQuote, adminCreateShipFor, lineStart, lineLiff, adminResendArrival, adminArrivalCode, adminConfirmCode, adminConfirmUnbind, adminArrivalUnbind, adminCbBinds, adminCbBind, adminCbUnbind, quote, adminMembers, adminMemberGrants, adminSetLevel, adminGrant, adminVoidGrant, adminLevels, adminSaveLevel, adminDeleteLevel, adminActivities, adminSaveActivity, adminDeleteActivity, adminSettings, adminSaveSettings, adminHistImport, adminHistBindList, adminHistNote, adminHistRenotify, adminHistBind};
export const INTERNAL = {catHit_, page_, doGet, setup, resetAdmin, ss_, raw_, sh_, t_, txt_, rows_, put_, log_, major_, diff_, settings_, cats_, cs_, tiers_, unit_, img_, imgList_, bp_, spec_, specParse_, specs_, specNorm_, specQty_, availOf_, rdyIs_, rdyGet_, rdySave_, rdyQty_, rdyAdd_, rdyTake_, rdyCut_, cbRdyReset_, cbRdyTell_, rdyRelist_, rdyAll_, rdyLine_, lineBack_, lineSplit_, adjStock_, imgs_, etaOk_, closeAt_, closeTx_, closed_, onSale0_, onSale_, xmzHide_, pub_, getShop, shopData_, placeOrder, placeOrder0_, placeCore_, proxyCtx_, proxyWant_, adminProxyQuote, adminPlaceOrder, contactSeen_, hex_, hash_, admins_, saveAdmin_, adminLogin, me_, adminProducts_, vendors_, adminVendors, brandSheet_, brands_, brandKey_, brandPick_, brandResolve_, brandList_, brandName_, adminBrands, adminAddBrand, adminRenameBrand, adminDeleteBrand, catList_, catName_, adminCats, adminAddCat, renameCats_, adminRenameCat, adminRenameBig, adminDeleteBig, adminDeleteCat, adminAddVendor, adminDeleteVendor, carriers_, trackUrl_, shortTrack_, saveCarriers_, adminCarriers, adminSaveCarrier, adminDeleteCarrier, trackLink, adminInit, adminSaveProduct, adminDeleteProduct, xmzSubs_, xmzLive_, xmzItems_, memberXmasSub, adminXmasNotify, xmzLaunch_, adminBatchProducts, adminBatchProductDates, codeSheet_, codes_, dstr_, codeState_, findCode_, codeUsed_, codeList_, adminCodes, adminSaveCode, adminSetCodeOn, adminDeleteCode, adminSaveAdmin, adminLogs, nz_, mk_, mem_, lineMeta_, mine_, memberLogin, shipObj_, memberOrders, memberSaveProfile, memberChangePay, memberReportPay, authDrive, adminUploadImage, adminBatchArrival, stockMove_, adminLineHistory, adminBatchOrder, allPurch_, buyerName_, purchaseList_, adminPurchaseList, pickPurchase_, adminLineInfo, adminArrivalRenotify, adminRecordPayment, adminUpdatePayment, adminDeletePayment, stockView_, adminStockView, adminAddStockIn, kFifo_, deleteStockIn_, adminDeleteStockIn, adminBatchDeleteLines, adminReport, rparts_, defCo_, lk_, ri_, si_, paidOk_, ordOk_, now_, cp_, ord_, seq_, adminOrders, adminOrderAdjust, adminBatchOrderCode, ordAdj_, adminUpdateOrder, adminEditLine, adminEditLineFull, deleteOrder_, holdStock_, heldMsg_, adminDeleteOrder, adminBatchDeleteOrders, adminCreateShip, syncOrderStatus_, adminUpdateShip, adminShipResend, adminShipPrinted, adminRemitMissing, shipNotice_, adminBatchShipStatus, deleteShip_, adminDeleteShip, invPrep_, invSave_, shipAlloc_, adminAdjustShip, adminMergeShips, isBoss_, boss_, expObj_, adminExpenses, adminSaveExpense, adminDeleteExpense, staffTotal_, adminMonthly, adminSaveFixed, adminSaveStaff, adminDeleteMonthlyItem, adminBatchDeleteShips, adminShipHistory, adminBatch, memberCheckout, shipCalc_, creditTiers_, creditRule_, pickLines_, memberShipQuote, payPrep_, payDone_, kindOk_, payLabel_, mhFriendOk_, specImg_, specImgSave_, logiOn_, cvsOf_, logiPrep_, logiBatchPrep_, logiBatchSave_, adminLogiClear, logiSave_, logiPrintPrep_, logiStatus_, logiMarkShipped_, realName_, memberCreateShip, memberCreateShip0_, shipCreatedNotice_, shipCtx_, shipRecv_, adminRecv_, feeFor_, adminShipQuote, adminCreateShipFor, ensureSettings_, prop_, lineOn_, lineId_, appUrl_, sha_, tot_, lineStart, lineCallback_, lineLiff, newSession_, upsertMember_, memberRow_, levels_, levelOf_, pushLine_, flexT_, flexBtn_, flexHead_, flexHero_, flexRow_, money_, orderFlex_, arrFlex_, poBtn_, siteUrl_, poHead_, poCell_, poGrid_, poTable_, poSum_, shareText_, shareNotice_, shipFlex_, invFlex_, notifyShipped_, mailTo_, authAll, adminResendArrival, notifyArrival_, setSet_, arrWho_, arrIsAdmin_, cbTargets_, cbTell_, arrPend_, arrSave_, adminArrivalCode, adminConfirmCode, adminConfirmUnbind, arrConfirmers_, adminArrivalUnbind, arrText_, cbPendOne_, cbHeld_, cbHoldText_, cbHoldDone_, cbHoldUp_, arrCands_, arrPlan_, arrSpN_, arrSz_, arrEq_, arrLine_, arrApply_, cbLots_, cbTake_, cbLink_, cbWidDone_, cbUnlinkK_, cbAvg_, cbCostIn_, cbCost_, cbInnCost_, cbNorm_, cbKeys_, cbPk_, cbTarget_, cbMapGet_, cbMapPut_, cbOn_, cbPend_, cbPendSave_, cbPendAdd_, cbPendSettle_, cbPendDrop_, cbDone_, cbG_, cbSku_, cbSize_, cbColorOf_, cbClrEn_, cbClrZh_, cbSameClr_, cbSpecBy_, cbGuess_, cbOneProd_, cbNewSpec_, cbPendAuto_, cbArrIn_, cbPendList_, cbBig_, cbWait_, cbCand_, cbPendPlan_, cbPick_, cbBinds_, adminCbBinds, adminCbBind, cbBindDo_, cbClear_, adminCbUnbind, cbBindOf_, today_, grants_, balance_, addGrant_, spend_, refund_, meInfo_, eligSub_, calc_, quote, awardCredits_, adminMembers, adminMemberGrants, adminSetLevel, adminGrant, adminVoidGrant, adminLevels, adminSaveLevel, adminDeleteLevel, actOut_, adminActivities, adminSaveActivity, adminDeleteActivity, defSet_, adminSettings, adminSaveSettings, hNum_, hDate_, hNorm_, hEta_, hCls_, hPmap_, hFind_, hMaxSeq_, hNext_, hVendor_, adminHistImport, hProducts_, hOrders_, hVendors_, hStock_, adminHistBindList, adminHistNote, adminHistRenotify, adminHistBind};
export { H };
export function __reset() { SS_ = null; SHC_ = {}; RC_ = {}; }
