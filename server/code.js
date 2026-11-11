// 由 Code.gs 自動產生(build.py),請不要直接修改;要改請改 Code.gs 再重新產生
/** 銷售網站 + 後台(第一階段) — 資料庫:Google 試算表 */
var TZ = 'Asia/Taipei';
/** 類別用「大項/小項」命名;只有大項的直接寫大項名稱 */
var CATS_DEFAULT = ['活動中商品', '明星商品', '精品/錢包', '精品/包包', '精品/墨鏡', '韓國潮流/上衣', '韓國潮流/帽子', '韓國潮流/鞋子', '韓國潮流/包包', 'ugg', '專櫃美妝香氛保養品', '韓國美妝香氛保養品', '玩偶/三麗鷗', '玩偶/蒙奇奇', '玩偶/其他'];
function catHit_(pcats, vs) {
  return pcats.some(function (c) { return vs.some(function (v) { return c === v || c.indexOf(v + '/') === 0; }); });
}
var PAY = { '刷卡': '待刷卡', '匯款': '待匯款', '賣貨便': '待出貨', '付現金': '待自取' };
var H = {
  '商品': ['商品ID', '名稱', '類別', '銷售型態', '單價', '數量', '到貨日期', '說明', '階梯價', '圖片', '上架', '規格', '品牌'],
  '商品_內部': ['商品ID', '廠商', '成本', '成本含稅', '貨源', '鎖定'],
  '類別': ['類別'],
  '品牌': ['品牌'],
  '折扣碼': ['折扣碼', '類型', '數值', '啟用', '備註', '使用次數', '建立時間', '使用上限', '開始日', '截止日', '最低消費'],
  '廠商': ['廠商'],
  '訂單': ['訂單ID', '下單時間', '姓名', '電話', '付款方式', '狀態', '商品金額', '運費', '總額', '收件資訊', '備註', 'LINE ID', '付款連結', '匯款後五碼', '會員等級', '優惠名稱', '優惠折抵', '購物金折抵', '購物金明細', '電子郵件', '折扣碼'],
  '訂單明細': ['訂單ID', '商品ID', '品名', '數量', '單價', '小計', '到貨狀態', '可出貨', '申請出貨', '出貨單ID', '型態', '廠商', '成本', '成本含稅', '貨源', '廠商付款ID', '規格', '到貨操作人', '到貨時間', '叫貨狀態', '叫貨人', '叫貨時間'],
  '庫存進貨': ['訂單ID', '商品ID', '品名', '規格', '數量', '到貨狀態', '廠商', '成本', '成本含稅', '貨源', '廠商付款ID', '到貨操作人', '到貨時間', '日期', '建立人', '出貨單ID'],
  '廠商付款': ['付款ID', '付款日期', '廠商', '金額', '匯款備註', '品項數', '應付成本', '品項', '建立人', '建立時間', '圖片'],
  '出貨單': ['出貨單ID', '訂單ID', '狀態', '物流', '物流單號', '品項', '建立時間', '出貨時間', 'LINE ID', '姓名', '電話', '付款方式', '收件資訊', '備註', '商品金額', '優惠折抵', '購物金折抵', '運費', '總額', '付款連結', '匯款後五碼', '會員等級', '折抵明細', '配送方式', '購物金明細', '匯款日期', '收款帳號', '列印時間', '出貨單圖片'],
  '會員': ['LINE ID', '暱稱', '頭像', '等級', '加入時間', '最近登入', '已加好友', '備註', '姓名', '電話', 'Email', '收件地址'],
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
  txt_('出貨單', ['出貨單ID', '訂單ID', '物流單號', '品項', '建立時間', '出貨時間', '電話', '收件資訊', '付款連結', '匯款後五碼', '匯款日期', '收款帳號', '列印時間', '出貨單圖片']);
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
function imgList_(v) {
  var l = String(v || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8);
  l.forEach(function (u) { if (!img_(u)) throw new Error('圖片網址需為 https:// 開頭,或 Google 雲端硬碟分享連結'); });
  var out = l.join('|'); if (out.length > 4000) throw new Error('圖片太多或網址太長');
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
function specQty_(p) { return specParse_(p).q; }
/** 這個商品(含規格)目前還能賣幾件;null=不限量 */
function availOf_(p, sp) {
  var q = specQty_(p);
  if (sp && q[sp] !== undefined && q[sp] !== null) return q[sp];
  return p.數量 === '' ? null : Number(p.數量);
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
function imgs_(v) { return String(v || '').split('|').map(img_).filter(Boolean); }
function pub_(p) {
  return {
    id: p.商品ID, name: p.名稱, cats: cs_(p.類別), type: p.銷售型態, price: Number(p.單價),
    stock: p.數量 === '' ? null : Number(p.數量), arrival: p.到貨日期, desc: p.說明,
    tiers: tiers_(p.階梯價), img: imgs_(p.圖片)[0] || '', imgs: imgs_(p.圖片), specs: specs_(p), specQty: specQty_(p), brand: String(p.品牌 || '')
  };
}
function getShop() {
  var c = CacheService.getScriptCache();
  try { var hit = c.get('shop1'); if (hit) return JSON.parse(hit); } catch (e) {}
  var r = shopData_();
  try { var js = JSON.stringify(r); if (js.length < 90000) c.put('shop1', js, 120); } catch (e) {}
  return r;
}
function shopData_() {
  var st = settings_();
  return {
    store: st.店名 || '', notice: st.公告 || '', free: Number(st.免運門檻) || 0, fee: Number(st.宅配運費) || 0, feeCvs: Number(st.店到店運費) || 0,
    line: { on: lineOn_(), liff: prop_('LIFF_ID'), friend: String(st.加好友連結 || ''), community: String(st.LINE社群連結 || '') },
    biz: { name: String(st.公司名稱 || ''), addr: String(st.公司地址 || ''), tax: /^\d+$/.test(String(st.統一編號 || '')) ? ('00000000' + st.統一編號).slice(-8) : String(st.統一編號 || ''), ig: String(st.IG連結 || '') },
    cats: cats_(), products: rows_('商品').filter(function (p) { return p.上架 === 'Y'; }).map(pub_)
  };
}
function placeOrder(o) {
  o = o || {};
  var ctx = null;
  if (o.token) { try { ctx = mem_(o.token); } catch (e) { ctx = null; } }
  if (ctx && !ctx.lid) ctx = null;
  var name = t_(o.name, 40), phone = t_(o.phone, 20), ship = '', pay = '', email = t_(o.email, 80);
  if (ctx) { var mi_ = meInfo_(ctx.lid); name = name || mi_.pname || mi_.name || 'LINE會員'; if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話'); }
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
      adjStock_(p, l[3] || '', -l[1]);
      put_('訂單明細', 0, { '訂單ID': oid, '商品ID': lpid, '規格': l[3] || '', '品名': p.名稱, '數量': l[1], '單價': l[2], '小計': l[1] * l[2], '到貨狀態': inStock ? '已到貨' : '待到貨', '可出貨': inStock ? 'Y' : 'N', '型態': p.銷售型態,
        '廠商': (innM[String(p.商品ID)] || {}).廠商 || '', '成本': (innM[String(p.商品ID)] || {}).成本 === undefined ? '' : (innM[String(p.商品ID)] || {}).成本, '成本含稅': (innM[String(p.商品ID)] || {}).成本含稅 || 'N', '貨源': (innM[String(p.商品ID)] || {}).貨源 || '', '叫貨狀態': inStock ? '已叫貨' : '', '叫貨人': inStock ? '系統' : '', '叫貨時間': inStock ? now_() : '' });
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
        pushLine_(ctx.lid, Object.keys(vals).reduce(function (t, k) { return t.split('{' + k + '}').join(vals[k]); }, tpl));
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
    if (follow !== false && n.已加好友 !== 'Y') { n.已加好友 = 'Y'; ch = true; }
    if (follow === false && n.已加好友 !== 'N') { n.已加好友 = 'N'; ch = true; }
    if (ch) put_('會員', m._r, n);
    return;
  }
  put_('會員', 0, { 'LINE ID': lid, '暱稱': name || 'LINE使用者', '頭像': pic || '', '等級': '一般會員', '加入時間': now_(), '最近登入': '', '已加好友': follow === false ? 'N' : 'Y', '備註': '由 LINE 私訊自動建立' });
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
      img: String(p.圖片 || ''), on: p.上架 === 'Y', brand: String(p.品牌 || ''), vendor: String(i.廠商 || ''),
      cost: (i.成本 === undefined || i.成本 === '') ? '' : Number(i.成本), taxIncl: i.成本含稅 === 'Y',
      source: String(i.貨源 || ''), locked: i.鎖定 === 'Y', specs: specs_(p), specQty: specQty_(p)
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
function brands_() { brandSheet_(); return rows_('品牌').map(function (r) { return String(r.品牌); }); }
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
function adminInit(tk) { me_(tk); return { products: adminProducts_(), cats: cats_(), admins: admins_(), vendors: vendors_(), brands: brands_(), carriers: carriers_() }; }

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
      s = t_(s, 30).split('|').join('/').split('~').join('-').split('=').join('-');
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
    if (d.arrival && d.arrival !== '排隊中' && !/^\d{4}-\d{2}-\d{2}$/.test(d.arrival)) throw new Error('到貨日期格式不正確');
    tiers_(d.tiers, true);
    var ps = rows_('商品'), id = d.id;
    var old = id ? ps.filter(function (p) { return p.商品ID === id; })[0] : null;
    if (!old) {
      var mx = 0;
      ps.forEach(function (p) { mx = Math.max(mx, parseInt(String(p.商品ID).slice(1), 10) || 0); });
      id = 'P' + ('000' + (mx + 1)).slice(-3);
    }
    var oi = rows_('商品_內部').filter(function (r) { return r.商品ID === id; })[0] || null;
    var inn = { '商品ID': id, '廠商': t_(d.vendor, 60), '成本': (d.cost === '' || d.cost == null) ? '' : Number(d.cost), '成本含稅': d.taxIncl ? 'Y' : 'N', '貨源': t_(d.source, 60), '鎖定': 'N' };
    var row = { '商品ID': id, '名稱': name, '類別': (d.cats || []).join(','), '銷售型態': d.type, '單價': price, '數量': stock, '到貨日期': d.arrival || '', '說明': t_(d.desc, 1000), '階梯價': String(d.tiers || '').trim(), '圖片': imgList_(d.img), '上架': d.on ? 'Y' : 'N', '規格': specs.join('|'), '品牌': brandResolve_(u, d) };
    put_('商品', old ? old._r : 0, row);
    put_('商品_內部', oi ? oi._r : 0, inn);
    log_(u.acc, old ? '修改商品' : '新增商品', id + ' ' + name, old ? [diff_(old, row), diff_(oi, inn)].filter(function (x) { return x && x !== '新增'; }).join(';') : '新增');
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
        var n = cp_(p); n.上架 = want; put_('商品', p._r, n);
        log_(u.acc, op === 'on' ? '上架商品' : '下架商品', id + ' ' + p.名稱, '(批次)');
      }
      done++;
    });
  });
  var label = { on: '上架', off: '下架', delete: '刪除' }[op];
  return { products: adminProducts_(), msg: '已' + label + ' ' + done + ' 項商品' + (skip.length ? ',略過 ' + skip.length + ' 項:\n' + skip.join('\n') : '') };
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
    cr: String(r.建立時間 || ''), at: String(r.出貨時間 || ''), name: String(r.姓名 || ''), phone: String(r.電話 || ''), ship: String(r.收件資訊 || ''), note: String(r.備註 || ''),
    sub: Number(r.商品金額), disc: Number(r.優惠折抵), cred: Number(r.購物金折抵), fee: Number(r.運費), total: Number(r.總額),
    link: /^https:\/\//.test(String(r.付款連結)) ? String(r.付款連結) : '', last5: String(r.匯款後五碼 || ''), rdate: String(r.匯款日期 || ''), bank: String(r.收款帳號 || ''), pr: String(r.列印時間 || ''), img: String(r.出貨單圖片 || ''), method: String(r.配送方式 || ''), trk: shortTrack_(r) };
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
function purchaseList_() {
  var lm = lineMeta_(true), ords = {}, shs = {};
  rows_('訂單').forEach(function (o) { ords[String(o.訂單ID)] = o; });
  rows_('出貨單').forEach(function (x) { shs[String(x.出貨單ID)] = String(x.狀態 || ''); });
  var lines = allPurch_().map(function (r) {
    var m = lm(r), st = r._sh === '庫存進貨', o = ords[String(r.訂單ID)] || {};
    return { key: String(r.訂單ID) + '|' + String(r.商品ID), oid: String(r.訂單ID), pid: String(r.商品ID), stock: st, at: st ? String(r.日期 || '') : String(o.下單時間 || '').slice(0, 10), name: String(r.品名), qty: Number(r.數量), unit: st ? 0 : Number(r.單價),
      code: st ? '' : String(o.折扣碼 || ''), dname: st ? '' : String(o.優惠名稱 || ''), disc: st ? 0 : Number(o.優惠折抵 || 0),
      buyer: st ? '【庫存】' : String(o.姓名 || ''), spec: String(r.規格 || ''), sid: String(r.出貨單ID || ''), sst: shs[String(r.出貨單ID || '')] || '', arrBy: String(r.到貨操作人 || ''), arrAt: String(r.到貨時間 || ''), ord: st ? '' : String(r.叫貨狀態 || ''), ordBy: st ? '' : String(r.叫貨人 || ''), ordAt: st ? '' : String(r.叫貨時間 || ''), brand: m.brand || '', typ: st ? '庫存' : m.typ, arr: String(r.到貨狀態), vendor: m.vendor, cost: m.cost, tax: m.tax, src: m.src, pay: m.pay };
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
  var u = me_(tk), done = 0, infoDone = 0, skip = [], arrived = {};
  d = d || {};
  if (d.arr && ['待到貨', '已到貨'].indexOf(d.arr) < 0) throw new Error('到貨狀態不正確');
  lk_(function () {
    var cost = null;
    if (d.cost !== '' && d.cost != null) { cost = Number(d.cost); if (!(cost >= 0)) throw new Error('成本不正確'); }
    var vendor = t_(d.vendor, 60), src = t_(d.src, 60), hasInfo = !!(vendor || src || cost !== null || ['Y', 'N'].indexOf(d.tax) >= 0);
    if (!d.arr && !hasInfo) throw new Error('請至少填寫一項要修改的內容');
    var lm = lineMeta_(true);
    pickPurchase_(keys).forEach(function (l) {
      var sh = l._sh || '訂單明細', n = cp_(l), m = lm(l), tag = String(l.訂單ID) + ' ' + l.品名, touched = false;
      if (d.arr && String(l.到貨狀態) !== d.arr) {
        if (l.出貨單ID) skip.push(tag + '(已建立出貨單 ' + l.出貨單ID + ',到貨狀態不能改)');
        else {
          n.到貨狀態 = d.arr; n.可出貨 = d.arr === '已到貨' ? 'Y' : 'N'; n.到貨操作人 = u.acc; n.到貨時間 = now_(); if (d.arr === '已到貨' && sh !== '庫存進貨') ordOk_(n, u.acc); touched = true;
          log_(u.acc, '到貨', tag, '到貨:' + l.到貨狀態 + '→' + d.arr + '(批次)');
          if (sh === '庫存進貨') stockMove_(l, d.arr === '已到貨' ? Number(l.數量) : -Number(l.數量));
          else if (d.arr === '已到貨') (arrived[String(l.訂單ID)] = arrived[String(l.訂單ID)] || []).push(l.品名);
        }
      }
      if (hasInfo) {
        if (l.廠商付款ID) skip.push(tag + '(已記錄付款 ' + l.廠商付款ID + ',廠商/成本/貨源不能改)');
        else {
          n.廠商 = vendor || m.vendor; n.成本 = cost !== null ? cost : m.cost; n.成本含稅 = (d.tax === 'Y' || d.tax === 'N') ? d.tax : (m.tax ? 'Y' : 'N'); n.貨源 = src || m.src; touched = true; infoDone++;
          log_(u.acc, '修改進貨資料', tag, '廠商:' + m.vendor + '→' + n.廠商 + ';成本:' + m.cost + '→' + n.成本 + ';貨源:' + m.src + '→' + n.貨源);
        }
      }
      if (touched) { put_(sh, l._r, n); done++; }
    });
    log_(u.acc, '批次修改', '', '共 ' + done + ' 筆' + (skip.length ? ';略過:' + skip.join('、') : '') + ';內容:' + ['到貨=' + (d.arr || ''), '廠商=' + vendor, '貨源=' + src, '成本=' + (cost === null ? '' : cost), '含稅=' + (d.tax || '')].join(','));
  });
  var r = purchaseList_(); r.msg = '已修改 ' + done + ' 筆' + (skip.length ? ',略過 ' + skip.length + ' 筆:\n' + skip.join('\n') : '');
  if (d.notify && Object.keys(arrived).length) { var nt = notifyArrival_(arrived); r.msg += '\n通知:成功 ' + nt.sent + '、無 LINE/Email ' + nt.noLine + '、失敗 ' + nt.failed; }
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
    if (d.imgs) n.圖片 = imgList_([].concat(d.imgs).join('|'));
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
  var products = rows_('商品').map(function (p) {
    var id = String(p.商品ID), i = inn[id] || {};
    return { id: id, name: String(p.名稱), type: String(p.銷售型態), on: p.上架 === 'Y', stock: p.數量 === '' ? '' : Number(p.數量), specs: specs_(p), waitOrders: wait[id] || 0, waitStock: inb[id] || 0,
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
  var u = me_(tk); d = d || {};
  lk_(function () {
    var p = rows_('商品').filter(function (x) { return String(x.商品ID) === String(d.pid); })[0];
    if (!p) throw new Error('請選擇商品');
    var qty = Math.floor(Number(d.qty));
    if (!(qty >= 1 && qty <= 99999)) throw new Error('進貨數量不正確');
    var cost = (d.cost === '' || d.cost == null) ? '' : Number(d.cost);
    if (cost !== '' && !(cost >= 0)) throw new Error('成本不正確');
    var sp = t_(d.spec, 30), sl = specs_(p);
    if (sl.length && sl.indexOf(sp) < 0) throw new Error('請選擇規格');
    if (!sl.length) sp = '';
    var inn = rows_('商品_內部').filter(function (r) { return String(r.商品ID) === String(p.商品ID); })[0] || {};
    var id = seq_('庫存進貨', 'K'), arrived = !!d.arrived;
    var row = { '訂單ID': id, '商品ID': String(p.商品ID), '品名': String(p.名稱), '規格': sp, '數量': qty, '到貨狀態': arrived ? '已到貨' : '待到貨',
      '廠商': t_(d.vendor, 60) || String(inn.廠商 || ''), '成本': cost === '' ? (inn.成本 === undefined ? '' : inn.成本) : cost, '成本含稅': d.tax === 'Y' ? 'Y' : (d.tax === 'N' ? 'N' : (inn.成本含稅 || 'N')), '貨源': t_(d.src, 60) || String(inn.貨源 || ''),
      '廠商付款ID': '', '到貨操作人': arrived ? u.acc : '', '到貨時間': arrived ? now_() : '', '日期': today_(), '建立人': u.acc, '出貨單ID': '' };
    put_('庫存進貨', 0, row);
    if (arrived) stockMove_(row, qty);
    log_(u.acc, '新增庫存進貨', id + ' ' + p.名稱, qty + ' 件' + (sp ? ',規格 ' + sp : '') + (arrived ? ',已到貨(庫存 +' + qty + ')' : ''));
  });
  return stockView_();
}
function deleteStockIn_(u, id) {
  var l = rows_('庫存進貨').filter(function (x) { return String(x.訂單ID) === String(id); })[0];
  if (!l) throw new Error('找不到庫存進貨 ' + id);
  if (l.廠商付款ID) throw new Error(id + ' 已記錄廠商付款 ' + l.廠商付款ID + ',請先到「廠商付款紀錄」刪除付款');
  if (l.到貨狀態 === '已到貨') stockMove_(l, -Number(l.數量));
  var snap = cp_(l);
  sh_('庫存進貨').deleteRow(l._r);
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
  var u = me_(tk), done = 0, skip = [], orders = {}, stocks = {};
  (keys || []).slice(0, 500).forEach(function (k) { var oid = String(k).split('|')[0]; if (/^K/.test(oid) && !orders[oid]) stocks[oid] = 1; else orders[oid] = 1; });
  lk_(function () {
    Object.keys(stocks).forEach(function (id) { try { deleteStockIn_(u, id); done++; } catch (e) { skip.push(e.message); } });
    Object.keys(orders).forEach(function (oid) { try { deleteOrder_(u, oid); done++; } catch (e) { skip.push(e.message); } });
  });
  var r = purchaseList_(); r.msg = '已刪除 ' + done + ' 筆(庫存進貨或整張訂單)' + (skip.length ? ',略過 ' + skip.length + ' 筆:\n' + skip.join('\n') : '');
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
    sum.lines++; sum.qty += qty; sum.revenue += rev; os[String(l.訂單ID)] = 1; if (s) ss[String(s.出貨單ID)] = 1;
    if (has) { sum.cost += m.cost * qty; sum.profit += rev - m.cost * qty; } else sum.noCost++;
    var k = String(l.品名) + (l.規格 ? '(' + l.規格 + ')' : ''), pr = prod[k] = prod[k] || { name: k, qty: 0, revenue: 0, cost: 0, profit: 0 };
    pr.qty += qty; pr.revenue += rev; if (has) { pr.cost += m.cost * qty; pr.profit += rev - m.cost * qty; }
    status[st] = (status[st] || 0) + 1;
  });
  sum.orders = Object.keys(os).length; sum.ships = Object.keys(ss).length;
  var statuses = ['尚未建立出貨單']; Object.keys(FLOW).forEach(function (k) { FLOW[k].forEach(function (x) { if (statuses.indexOf(x) < 0) statuses.push(x); }); });
  return { sum: sum, prods: Object.keys(prod).map(function (k) { return prod[k]; }).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 200), statuses: statuses };
}

/* ---------- 第三階段:訂單與出貨管理 ---------- */
var FLOW = {
  '刷卡': ['待刷卡', '已刷卡待出貨', '已出貨'],
  '匯款': ['待匯款', '已匯款待查帳', '已查帳待出貨', '已出貨'],
  '賣貨便': ['待出貨', '已出貨待收貨', '已收貨付款'],
  '付現金': ['待自取', '已自取付款']
};
function lk_(fn) { var L = LockService.getScriptLock(); L.waitLock(20000); try { return fn(); } finally { L.releaseLock(); } }
function ri_(pay) { return (pay === '賣貨便' || pay === '付現金') ? 0 : pay === '匯款' ? 2 : 1; }   // 可出貨的狀態位置
function si_(pay) { return (pay === '賣貨便' || pay === '付現金') ? 1 : pay === '匯款' ? 3 : 2; }   // 已出貨的狀態位置
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
  rows_('出貨單').forEach(function (r) { sh[String(r.出貨單ID)] = shipObj_(r); sh[String(r.出貨單ID)].lid = String(r['LINE ID'] || ''); sh[String(r.出貨單ID)].link = String(r.付款連結 || ''); });
  var ofShip = {};
  rows_('訂單明細').forEach(function (r) {
    var m = lm(r);
    (items[r.訂單ID] = items[r.訂單ID] || []).push({ pid: String(r.商品ID), name: r.品名, qty: Number(r.數量), unit: Number(r.單價), sub: Number(r.小計), arr: r.到貨狀態, sid: String(r.出貨單ID || ''), typ: m.typ, eta: m.eta, vendor: m.vendor, cost: m.cost, tax: m.tax, src: m.src, spec: m.spec });
    if (r.出貨單ID && sh[String(r.出貨單ID)]) { var a = ofShip[r.訂單ID] = ofShip[r.訂單ID] || {}; a[String(r.出貨單ID)] = sh[String(r.出貨單ID)]; }
  });
  return {
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
  lk_(function () {
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
  });
  return adminOrders(tk);
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
    if (['待到貨', '已到貨'].indexOf(arr) < 0) throw new Error('到貨狀態不正確');
    var shipped = !!l.出貨單ID;
    if (shipped && (q !== Number(l.數量) || up !== Number(l.單價) || arr !== String(l.到貨狀態))) throw new Error('此品項已建立出貨單,數量、單價、到貨狀態需先刪除出貨單才能修改');
    var delta = q - Number(l.數量);
    var p = rows_('商品').filter(function (x) { return String(x.商品ID) === bp_(pid); })[0];
    var oldSp = String(l.規格 || ''), newSp = (!d.keep && d.spec !== undefined) ? t_(d.spec, 60) : oldSp;
    if (p && (delta !== 0 || newSp !== oldSp)) {
      var av = availOf_(p, newSp);
      if (av !== null && newSp === oldSp && delta > 0 && av - delta < 0) throw new Error('商品庫存不足,最多還能加 ' + av + ' 件');
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
      if (eta && eta !== '排隊中' && !/^\d{4}-\d{2}-\d{2}$/.test(eta)) throw new Error('到貨日期格式不正確');
      if (p && eta !== String(p.到貨日期 || '')) { var pn = cp_(p); pn.到貨日期 = eta; put_('商品', p._r, pn); extra += ';到貨日期→' + eta; }
    }
    var n = cp_(l);
    if (!d.keep && d.spec !== undefined) n.規格 = t_(d.spec, 60);
    n.品名 = name; n.型態 = type; n.數量 = q; n.單價 = up; n.小計 = q * up;
    if (newInfo) Object.keys(newInfo).forEach(function (k) { n[k] = newInfo[k]; });
    if (arr !== String(l.到貨狀態)) { n.到貨狀態 = arr; n.可出貨 = arr === '已到貨' ? 'Y' : 'N'; if (arr === '已到貨') { arrNames = [name]; ordOk_(n, u.acc); } n.到貨操作人 = u.acc; n.到貨時間 = now_(); }
    put_('訂單明細', l._r, n);
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
  lines.forEach(function (l) {
    var p = ps[bp_(l.商品ID)];
    if (p) adjStock_(p, String(l.規格 || ''), Number(l.數量));
  });
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
function adminDeleteOrder(tk, oid) {
  var u = me_(tk);
  lk_(function () { deleteOrder_(u, String(oid)); });
  return adminOrders(tk);
}
function adminBatchDeleteOrders(tk, oids) {
  var u = me_(tk), done = 0, skip = [];
  lk_(function () {
    var seen = {};
    (oids || []).slice(0, 200).forEach(function (x) {
      x = String(x); if (seen[x]) return; seen[x] = 1;
      try { deleteOrder_(u, x); done++; } catch (e) { skip.push(x + ':' + e.message); }
    });
  });
  var r = adminOrders(tk); r.msg = '已刪除 ' + done + ' 張訂單' + (skip.length ? ',略過 ' + skip.length + ' 張:\n' + skip.join('\n') : '');
  return r;
}

/** 後台代客建立出貨單 */
function adminCreateShip(tk, items, d) {
  var u = me_(tk); d = d || {};
  if (!PAY[d.pay]) throw new Error('請選擇付款方式');
  if (!t_(d.ship, 200)) throw new Error('請填寫收件資訊');
  lk_(function () {
    var lines = pickLines_(null, items), c = shipCalc_(lines), o0 = ord_(String(lines[0].訂單ID));
    lines.forEach(function (l) { var ox = ord_(String(l.訂單ID)); if (String(ox['LINE ID'] || '') !== String(o0['LINE ID'] || '') || nz_(ox.電話) !== nz_(o0.電話)) throw new Error('一張出貨單只能合併同一位客人的訂單'); });
    var sid = seq_('出貨單', 'S'), oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': Object.keys(oids).join(','), '狀態': PAY[d.pay], '物流': t_(d.co, 30), '物流單號': t_(d.no, 40), '品項': lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'), '建立時間': now_(), '出貨時間': '',
      'LINE ID': String(o0['LINE ID'] || ''), '姓名': String(o0.姓名), '電話': String(d.phone || o0.電話), '付款方式': d.pay, '收件資訊': t_(d.ship, 200), '備註': t_(d.note, 200), '商品金額': c.sub, '優惠折抵': c.disc, '購物金折抵': c.cred, '運費': c.fee, '總額': c.total,
      '付款連結': '', '匯款後五碼': '', '會員等級': String(o0.會員等級 || ''), '折抵明細': JSON.stringify(c.alloc) });
    lines.forEach(function (l) { var n = cp_(l); n.出貨單ID = sid; put_('訂單明細', l._r, n); });
    log_(u.acc, '建立出貨單', sid, lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'));
    Object.keys(oids).forEach(function (oid) { syncOrderStatus_(oid, u.acc); });
  });
  return adminOrders(tk);
}

function syncOrderStatus_(oid, acc) {
  var o = ord_(oid);
  var lines = rows_('訂單明細').filter(function (l) { return String(l.訂單ID) === oid; });
  var sids = {}; lines.forEach(function (l) { if (l.出貨單ID) sids[String(l.出貨單ID)] = 1; });
  var ships = rows_('出貨單').filter(function (s) { return sids[String(s.出貨單ID)]; });
  var shipped = lines.filter(function (l) { return !!l.出貨單ID; }).length;
  var to = '已下訂';
  if (shipped > 0 && shipped < lines.length) to = '部分出貨';
  else if (shipped === lines.length && lines.length > 0) {
    var fin = ships.length > 0 && ships.every(function (s) { var f = FLOW[s.付款方式]; return !!f && s.狀態 === f[f.length - 1]; });
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
      if (d.pay === '付現金' && String(s.配送方式) !== '自取') throw new Error('付現金只能用在自取');
      if (d.pay === '賣貨便' && String(s.配送方式) !== '店到店') throw new Error('賣貨便只能用在店到店');
      payNew = String(d.pay); payChanged = true; d.st = PAY[payNew];
    }
    var f = FLOW[payNew] || [];
    if (f.indexOf(d.st) < 0) throw new Error('此付款方式沒有「' + d.st + '」這個狀態');
    var fee = Number(d.fee);
    if (d.fee === '' || !(fee >= 0)) throw new Error('運費不正確');
    var ship = t_(d.ship, 200); if (!ship) throw new Error('請填寫收件資訊');
    var link = t_(d.link, 500); if (link && !/^https:\/\//.test(link)) throw new Error('付款連結需以 https:// 開頭');
    var n = cp_(s);
    n.付款方式 = payNew; n.狀態 = d.st; if (payChanged && payNew === '匯款') n.收款帳號 = String(settings_().匯款資訊 || ''); n.物流 = t_(d.co, 30); n.物流單號 = t_(d.no, 40); n.付款連結 = link; n.匯款後五碼 = t_(d.last5, 5); if (d.rdate !== undefined) { var rd = String(d.rdate || ''); if (rd && !/^\d{4}-\d{2}-\d{2}$/.test(rd)) throw new Error('匯款日期格式不正確'); n.匯款日期 = rd; } n.收件資訊 = ship; n.備註 = t_(d.note, 200); n.電話 = t_(d.phone, 20) || s.電話;
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
  if (ni >= si && oi < si) out.push(notifyShipped_(n));
  if (ni === f.length - 1 && oi !== ni && si < f.length - 1) out.push(notifyShipped_(n, '送達通知內容', '商品已送達', true));
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
  if (f.indexOf(s.狀態) >= si_(s.付款方式)) throw new Error('出貨單 ' + sid + ' 已出貨,無法刪除,請先把狀態改回出貨前');
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
          if (bp_(l.商品ID) === id && l.到貨狀態 !== '已到貨') {
            var n = cp_(l); n.到貨狀態 = '已到貨'; n.可出貨 = 'Y'; n.到貨操作人 = u.acc; n.到貨時間 = now_(); ordOk_(n, u.acc); put_('訂單明細', l._r, n); l.到貨狀態 = '已到貨';
            log_(u.acc, '到貨', String(l.訂單ID) + ' ' + l.品名, '到貨:' + '待到貨→已到貨(商品批次到貨)');
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
  var free = Number(st.免運門檻) || 0, base = opt.method === '自取' ? 0 : opt.method === '店到店' ? Number(st.店到店運費) || 0 : Number(st.宅配運費) || 0;
  var fee = (free > 0 && sub - disc >= free) ? 0 : base;
  // 出貨時由客人選擇要用多少購物金(只折商品金額,不折運費)
  var lid = opt.ctx && opt.ctx.lid ? opt.ctx.lid : '', goods = Math.max(0, sub - disc - cred), bal = lid ? balance_(lid) : 0;
  var minSpend = Number(st.購物金使用門檻) || 0, capS = String(st.購物金折抵上限 === undefined ? '' : st.購物金折抵上限).trim(), cap = capS === '' ? Infinity : Number(capS);
  var allowed = lid && goods >= minSpend ? Math.max(0, Math.min(bal, cap, goods)) : 0;
  var want = Math.max(0, Math.floor(Number(opt.credit) || 0)), pick = Math.min(want, allowed);
  return { sub: sub, disc: disc, cred: cred, pick: pick, over: want > allowed, allowed: allowed, balance: bal, minSpend: minSpend, fee: fee, total: Math.max(0, goods - pick) + fee, alloc: alloc };
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
    var c = shipCalc_(pickLines_(ctx, items), { method: d.method, ctx: ctx, credit: d.credit });
    return { ok: true, sub: c.sub, disc: c.disc, cred: c.cred + c.pick, fee: c.fee, total: c.total, pick: c.pick, allowed: c.allowed, balance: c.balance, minSpend: c.minSpend, login: !!ctx.lid };
  }
  catch (e) { return { ok: false, msg: e.message }; }
}
/** 客人勾選已到貨品項 →「確定出貨」→ 建立出貨單,之後走付款與出貨流程 */
function memberCreateShip(tk, items, d) {
  var ctx = mem_(tk); d = d || {};
  var pay = d.pay, ship = t_(d.ship, 200), phone = t_(d.phone, 20), method = d.method ? String(d.method) : '';
  if (!PAY[pay]) throw new Error('請選擇付款方式');
  if (pay === '刷卡') throw new Error('信用卡付款籌備中,目前請選擇匯款或賣貨便');
  if (pay === '賣貨便' && method === '自取') throw new Error('賣貨便無法自取,請選擇匯款或付現金');
  if (pay === '賣貨便' && (d.method || d.cvs)) method = '店到店';
  if (pay === '付現金' && method !== '自取') throw new Error('付現金只能選擇自取');
  if (method) {
    if (['店到店', '宅配', '自取'].indexOf(method) < 0) throw new Error('請選擇配送方式');
    var rn = t_(d.rname, 30);
    if (!rn) throw new Error('請填寫收件人姓名');
    if (method === '店到店') {
      var cvs = t_(d.cvs, 20), store = t_(d.store, 60);
      if (['7-11', '全家'].indexOf(cvs) < 0) throw new Error('超商僅提供 7-11 或全家'); if (!store) throw new Error('請填寫取貨門市(店名或店號)');
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
    var lines = pickLines_(ctx, items), c = shipCalc_(lines, { method: method, ctx: ctx, credit: d.credit }), o0 = ord_(String(lines[0].訂單ID));
    if (c.over) throw new Error('購物金超過可使用額度(最多 ' + c.allowed + ')');
    var cdetail = c.pick > 0 ? spend_(ctx.lid, c.pick) : {};
    sid = seq_('出貨單', 'S');
    var oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': Object.keys(oids).join(','), '狀態': PAY[pay], '物流': '', '物流單號': '', '品項': lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'), '建立時間': now_(), '出貨時間': '',
      'LINE ID': ctx.lid || '', '姓名': String(o0.姓名), '電話': phone, '付款方式': pay, '收件資訊': ship, '備註': t_(d.note, 200), '商品金額': c.sub, '優惠折抵': c.disc, '購物金折抵': c.cred + c.pick, '運費': c.fee, '總額': c.total,
      '付款連結': '', '匯款後五碼': '', '會員等級': String(o0.會員等級 || ''), '折抵明細': JSON.stringify(c.alloc), '配送方式': method, '購物金明細': JSON.stringify(cdetail), '收款帳號': pay === '匯款' ? String(settings_().匯款資訊 || '') : '' });
    lines.forEach(function (l) { var n = cp_(l); n.出貨單ID = sid; put_('訂單明細', l._r, n); });
    log_('客人 ' + o0.姓名, '建立出貨單', sid, pay + (method ? ',' + method : '') + (c.pick ? ',購物金 -' + c.pick : '') + ',應付 ' + c.total + ':' + lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'));
    Object.keys(oids).forEach(function (oid) { syncOrderStatus_(oid, '客人'); });
  });
  var r = memberOrders(tk); r.sid = sid; return r;
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
  if (!rn) throw new Error('請填寫收件人姓名');
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
function adminShipQuote(tk, items, d) {
  me_(tk); d = d || {};
  try {
    var ctx = shipCtx_(d), c = shipCalc_(pickLines_(ctx, items), { method: d.method, ctx: ctx, credit: d.credit });
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
  if (pay === '賣貨便') method = '店到店';
  if (!/^[0-9+\-\s]{8,20}$/.test(phone)) throw new Error('請填寫正確的聯絡電話');
  var sid, total = 0, name = '', msg = '', oidsOut = '', itemsTxt = '', lidOut = '';
  lk_(function () {
    var lines = pickLines_(ctx, items), c = shipCalc_(lines, { method: method, ctx: ctx, credit: d.credit }), o0 = ord_(String(lines[0].訂單ID));
    if (c.over) throw new Error('購物金超過可使用額度(最多 ' + c.allowed + ')');
    var cdetail = c.pick > 0 ? spend_(ctx.lid, c.pick) : {};
    sid = seq_('出貨單', 'S');
    var oids = {}; lines.forEach(function (l) { oids[String(l.訂單ID)] = 1; });
    itemsTxt = lines.map(function (l) { return l.品名 + '×' + l.數量; }).join('、'); total = c.total; name = String(o0.姓名); lidOut = ctx.lid || ''; oidsOut = Object.keys(oids).join(',');
    put_('出貨單', 0, { '出貨單ID': sid, '訂單ID': oidsOut, '狀態': PAY[pay], '物流': '', '物流單號': '', '品項': itemsTxt, '建立時間': now_(), '出貨時間': '',
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
  ['店名', 'coscos韓國選物店'], ['免運門檻', 1500], ['店到店運費', 60], ['宅配運費', 80], ['匯款資訊', '請填寫銀行代碼、帳號、戶名'], ['公告', ''],
  ['購物金使用門檻', 1000], ['購物金折抵上限', 100], ['購物金預設有效天數', 90],
  ['到貨通知內容', '{姓名} 您好,您訂購的 {品名} 已到貨!請到會員中心勾選要出貨的商品:{連結}'],
  ['下單成功通知內容', '訂單{訂單編號}確認！\n\n商品:{品項}\n訂單金額:NT$ {金額}\n\n預購商品到貨後會再訊息通知您❤️\n到貨商品可以在會員的訂單明細勾選出貨～\n\n有任何問題隨時聯繫我們🫶'],
  ['出貨通知內容', '📢出貨通知\n\n出貨單號:{出貨單號}\n物流:{物流}\n物流單號:{物流單號}\n追蹤連結:{追蹤連結}\n出貨單如圖{附圖}\n\n有任何問題都歡迎聯繫我們唷～'],
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
  if (m) { var n = cp_(m); n.暱稱 = name; n.頭像 = pic; n.最近登入 = now_(); n.已加好友 = friend ? 'Y' : 'N'; put_('會員', m._r, n); return n; }
  var o = { 'LINE ID': lid, '暱稱': name, '頭像': pic, '等級': '一般會員', '加入時間': now_(), '最近登入': now_(), '已加好友': friend ? 'Y' : 'N', '備註': '' };
  put_('會員', 0, o); return o;
}
function memberRow_(lid) { return rows_('會員').filter(function (r) { return String(r['LINE ID']) === lid; })[0]; }
function levels_() { return rows_('等級'); }
function levelOf_(lid) { var m = memberRow_(lid); return m && String(m.等級) ? String(m.等級) : '一般會員'; }
function pushLine_(lid, text, imgs) {
  var tk = prop_('LINE_MSG_TOKEN'); if (!tk) return false;
  try {
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tk }, muteHttpExceptions: true,
      payload: JSON.stringify({ to: lid, messages: [{ type: 'text', text: text }].concat((imgs || []).filter(function (u) { return /^https:\/\//.test(u); }).slice(0, 4).map(function (u) { return { type: 'image', originalContentUrl: u, previewImageUrl: u }; })) }) });
    return r.getResponseCode() === 200;
  } catch (e) { return false; }
}
/** 出貨單改成「已出貨」時,用 LINE 通知客人(內容在設定頁);回傳結果文字 */
function notifyShipped_(s, key, subj, quiet) {
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
  return pushLine_(lid, msg, shipImg ? [shipImg] : null) ? '已用 LINE 通知客人' + (shipImg ? '(含出貨單圖片)' : '') : 'LINE 通知發送失敗(客人可能未加好友)';
}
/** 沒有 LINE 的客人(遊客)改用 Email 通知;回傳是否成功 */
function mailTo_(to, subject, body) {
  try { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(to))) return false; MailApp.sendEmail({ to: String(to), subject: subject, body: body, name: String(settings_().店名 || 'coscos') }); return true; }
  catch (e) { return false; }
}
/** 第一次部署後,請在編輯器執行一次 authAll,授權雲端硬碟(商品圖片)與寄信(遊客通知) */
function authAll() { DriveApp.getRootFolder(); return 'Drive/Mail OK, 今日剩餘寄信額度 ' + MailApp.getRemainingDailyQuota(); }
function notifyArrival_(arr) {
  var tpl = String(settings_().到貨通知內容 || ''), r = { sent: 0, noLine: 0, failed: 0 };
  Object.keys(arr).forEach(function (oid) {
    var o = rows_('訂單').filter(function (x) { return String(x.訂單ID) === oid; })[0]; if (!o) return;
    var lid = String(o['LINE ID'] || ''), em = String(o.電子郵件 || '');
    var names = arr[oid].filter(function (x, i, a) { return a.indexOf(x) === i; }).join('、');
    var text = tpl.split('{姓名}').join(o.姓名).split('{品名}').join(names).split('{訂單}').join(oid).split('{連結}').join(appUrl_());
    if (lid) { if (pushLine_(lid, text)) r.sent++; else r.failed++; }
    else if (em) { if (mailTo_(em, '【' + (settings_().店名 || 'coscos') + '】商品到貨通知', text)) r.sent++; else r.failed++; }
    else r.noLine++;
  });
  return r;
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
  var lines = [], sub = 0, tot = {};
  ids.forEach(function (id) { var b = bp_(id); tot[b] = (tot[b] || 0) + want[id]; });
  ids.forEach(function (id) {
    var p = by[bp_(id)], n = want[id], sp = spec_(id);
    if (!p || p.上架 !== 'Y') throw new Error('有商品已下架,請重新整理頁面');
    var sl = specs_(p);
    if (sl.length && !sp) throw new Error('「' + p.名稱 + '」請先選擇規格');
    if (sp && sl.indexOf(sp) < 0) throw new Error('「' + p.名稱 + '」沒有「' + sp + '」這個規格,請重新整理頁面');
    if (p.數量 !== '' && Number(p.數量) < tot[bp_(id)]) throw new Error('「' + p.名稱 + '」數量不足,剩 ' + Number(p.數量) + ' 件');
    if (sp) { var sq = specQty_(p)[sp]; if (sq !== null && sq !== undefined && sq < n) throw new Error('「' + p.名稱 + '」' + sp + (sq ? ' 數量不足,剩 ' + sq + ' 件' : ' 已售完')); }
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
  var bal = lid ? balance_(lid) : 0, minSpend = Number(st.購物金使用門檻) || 0, capS = String(st.購物金折抵上限 === undefined ? '' : st.購物金折抵上限).trim();
  var cap = capS === '' ? Infinity : Number(capS);
  var allowed = lid && after >= minSpend ? Math.max(0, Math.min(bal, cap, after)) : 0;
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
  var paid = (sp.付款方式 === '賣貨便' || sp.付款方式 === '付現金') ? idx === last : idx >= ri_(sp.付款方式), done = idx === last;
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
      return { lid: k, name: String(m.暱稱), pic: String(m.頭像), level: String(m.等級), joined: String(m.加入時間), last: String(m.最近登入), friend: m.已加好友 === 'Y', note: String(m.備註 || ''), balance: balance_(k), orders: cnt[k] || 0, spent: spent[k] || 0 };
    })
  };
}
function adminMemberGrants(tk, lid) {
  me_(tk);
  return rows_('購物金').filter(function (g) { return String(g['LINE ID']) === lid; }).reverse().map(function (g) {
    return { seq: String(g.序號), at: String(g.發放時間), amt: Number(g.金額), rem: Number(g.剩餘), exp: String(g.到期日), src: String(g.來源), note: String(g.備註), by: String(g.操作人), oid: String(g.訂單ID) };
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
function adminGrant(tk, lid, amt, days, note) {
  var u = me_(tk);
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
    if (dupG.length) throw new Error('剛剛已經發放過一筆相同的購物金(' + dupG[0].序號 + '),已略過重複發放');
    addGrant_(lid, a, dd, '手動發放', t_(note, 100), u.acc, '', '');
    log_(u.acc, '發放購物金', m.暱稱, a + ' 元,' + dd + ' 天;' + t_(note, 100));
  });
  return adminMembers(tk);
}
function adminVoidGrant(tk, seq) {
  var u = me_(tk);
  lk_(function () {
    var g = rows_('購物金').filter(function (x) { return String(x.序號) === seq; })[0]; if (!g) throw new Error('找不到這筆購物金');
    var n = cp_(g); n.剩餘 = 0; put_('購物金', g._r, n);
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
var SET_KEYS = ['店名', '店到店運費', '宅配運費', '免運門檻', '匯款資訊', '公告', '購物金使用門檻', '購物金折抵上限', '購物金預設有效天數', '到貨通知內容', '下單成功通知內容', '出貨通知內容', '送達通知內容', '未收到匯款通知內容', '物流追蹤連結', '加好友連結', '公司名稱', '公司地址', '統一編號', 'IG連結', 'LINE社群連結'];
function defSet_(k) { var r = DEFAULT_SETTINGS.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : ''; }
function adminSettings(tk) {
  me_(tk); var s = settings_(), o = {};
  SET_KEYS.forEach(function (k) { o[k] = s[k] === undefined ? defSet_(k) : s[k]; });
  return { values: o, line: { login: lineOn_(), msg: !!prop_('LINE_MSG_TOKEN'), url: appUrl_() } };
}
function adminSaveSettings(tk, v) {
  var u = me_(tk);
  lk_(function () {
    ['店到店運費', '宅配運費', '免運門檻', '購物金使用門檻', '購物金預設有效天數'].forEach(function (k) { if (!(Number(v[k]) >= 0) || String(v[k]).trim() === '') throw new Error(k + ' 請填數字'); });
    if (String(v.購物金折抵上限).trim() !== '' && !(Number(v.購物金折抵上限) >= 0)) throw new Error('購物金折抵上限請填數字,或留空代表不限制');
    ['加好友連結', 'IG連結', 'LINE社群連結'].forEach(function (k) { if (String(v[k] || '').trim() && !/^https:\/\//.test(String(v[k]).trim())) throw new Error(k + '需以 https:// 開頭'); });
    var cur = rows_('設定'), ch = [];
    SET_KEYS.forEach(function (k) {
      if (v[k] === undefined) return;
      var nv = typeof v[k] === 'string' ? t_(v[k], 1000) : v[k], ex = cur.filter(function (r) { return r.項目 === k; })[0];
      if (['店到店運費', '宅配運費', '免運門檻', '購物金使用門檻', '購物金預設有效天數'].indexOf(k) >= 0 || (k === '購物金折抵上限' && nv !== '')) nv = Number(nv);
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
  var ms = rows_('會員').map(function (m) { return { id: String(m['LINE ID']), nick: String(m.暱稱 || ''), real: String(m.姓名 || '') }; });
  return { groups: gs, members: ms };
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
  var okN = 0, failN = 0;
  Object.keys(notify).forEach(function (lid) {
    if (pushLine_(lid, 'coscos網站綁定成功!之後下單成功、到貨、出貨都會傳通知到這邊唷❤️謝謝您～')) okN++; else failN++;
  });
  var r = adminHistBindList(tk); r.msg = '已綁定 ' + done + ' 位,已用 LINE 通知 ' + okN + ' 位' + (failN ? '(' + failN + ' 位通知發送失敗,可能未加好友)' : '') + (skip.length ? ',略過 ' + skip.length + ':' + skip.join('、') : ''); return r;
}


/* ===== 以下由 build.py 加入 ===== */
export const API = {resetAdmin, getShop, placeOrder, adminProxyQuote, adminPlaceOrder, adminLogin, adminVendors, adminBrands, adminAddBrand, adminRenameBrand, adminDeleteBrand, adminCats, adminAddCat, adminRenameCat, adminRenameBig, adminDeleteBig, adminDeleteCat, adminAddVendor, adminDeleteVendor, adminCarriers, adminSaveCarrier, adminDeleteCarrier, trackLink, adminInit, adminSaveProduct, adminDeleteProduct, adminBatchProducts, adminCodes, adminSaveCode, adminSetCodeOn, adminDeleteCode, adminSaveAdmin, adminLogs, memberLogin, memberOrders, memberSaveProfile, memberReportPay, adminBatchArrival, adminLineHistory, adminBatchOrder, adminPurchaseList, adminLineInfo, adminRecordPayment, adminUpdatePayment, adminDeletePayment, adminStockView, adminAddStockIn, adminDeleteStockIn, adminBatchDeleteLines, adminReport, adminOrders, adminOrderAdjust, adminUpdateOrder, adminEditLine, adminEditLineFull, adminDeleteOrder, adminBatchDeleteOrders, adminCreateShip, adminUpdateShip, adminShipResend, adminShipPrinted, adminRemitMissing, adminBatchShipStatus, adminDeleteShip, adminBatchDeleteShips, adminShipHistory, adminBatch, memberCheckout, memberShipQuote, memberCreateShip, adminShipQuote, adminCreateShipFor, lineStart, lineLiff, quote, adminMembers, adminMemberGrants, adminSetLevel, adminGrant, adminVoidGrant, adminLevels, adminSaveLevel, adminDeleteLevel, adminActivities, adminSaveActivity, adminDeleteActivity, adminSettings, adminSaveSettings, adminHistImport, adminHistBindList, adminHistBind};
export const INTERNAL = {catHit_, page_, doGet, setup, resetAdmin, ss_, raw_, sh_, t_, txt_, rows_, put_, log_, major_, diff_, settings_, cats_, cs_, tiers_, unit_, img_, imgList_, bp_, spec_, specParse_, specs_, specQty_, availOf_, adjStock_, imgs_, pub_, getShop, shopData_, placeOrder, placeCore_, proxyCtx_, proxyWant_, adminProxyQuote, adminPlaceOrder, contactSeen_, hex_, hash_, admins_, saveAdmin_, adminLogin, me_, adminProducts_, vendors_, adminVendors, brandSheet_, brands_, brandKey_, brandPick_, brandResolve_, brandList_, brandName_, adminBrands, adminAddBrand, adminRenameBrand, adminDeleteBrand, catList_, catName_, adminCats, adminAddCat, renameCats_, adminRenameCat, adminRenameBig, adminDeleteBig, adminDeleteCat, adminAddVendor, adminDeleteVendor, carriers_, trackUrl_, shortTrack_, saveCarriers_, adminCarriers, adminSaveCarrier, adminDeleteCarrier, trackLink, adminInit, adminSaveProduct, adminDeleteProduct, adminBatchProducts, codeSheet_, codes_, dstr_, codeState_, findCode_, codeUsed_, codeList_, adminCodes, adminSaveCode, adminSetCodeOn, adminDeleteCode, adminSaveAdmin, adminLogs, nz_, mk_, mem_, lineMeta_, mine_, memberLogin, shipObj_, memberOrders, memberSaveProfile, memberReportPay, authDrive, adminUploadImage, adminBatchArrival, stockMove_, adminLineHistory, adminBatchOrder, allPurch_, purchaseList_, adminPurchaseList, pickPurchase_, adminLineInfo, adminRecordPayment, adminUpdatePayment, adminDeletePayment, stockView_, adminStockView, adminAddStockIn, deleteStockIn_, adminDeleteStockIn, adminBatchDeleteLines, adminReport, lk_, ri_, si_, paidOk_, ordOk_, now_, cp_, ord_, seq_, adminOrders, adminOrderAdjust, adminUpdateOrder, adminEditLine, adminEditLineFull, deleteOrder_, adminDeleteOrder, adminBatchDeleteOrders, adminCreateShip, syncOrderStatus_, adminUpdateShip, adminShipResend, adminShipPrinted, adminRemitMissing, shipNotice_, adminBatchShipStatus, deleteShip_, adminDeleteShip, adminBatchDeleteShips, adminShipHistory, adminBatch, memberCheckout, shipCalc_, pickLines_, memberShipQuote, memberCreateShip, shipCtx_, shipRecv_, adminShipQuote, adminCreateShipFor, ensureSettings_, prop_, lineOn_, lineId_, appUrl_, sha_, tot_, lineStart, lineCallback_, lineLiff, newSession_, upsertMember_, memberRow_, levels_, levelOf_, pushLine_, notifyShipped_, mailTo_, authAll, notifyArrival_, today_, grants_, balance_, addGrant_, spend_, refund_, meInfo_, eligSub_, calc_, quote, awardCredits_, adminMembers, adminMemberGrants, adminSetLevel, adminGrant, adminVoidGrant, adminLevels, adminSaveLevel, adminDeleteLevel, actOut_, adminActivities, adminSaveActivity, adminDeleteActivity, defSet_, adminSettings, adminSaveSettings, hNum_, hDate_, hNorm_, hEta_, hCls_, hPmap_, hFind_, hMaxSeq_, hNext_, hVendor_, adminHistImport, hProducts_, hOrders_, hVendors_, hStock_, adminHistBindList, adminHistBind};
export { H };
export function __reset() { SS_ = null; SHC_ = {}; RC_ = {}; }
