// 轉接層:把 Apps Script 的服務(試算表、快取、鎖、工具…)模擬在「記憶體 + Postgres」上,
// 讓原本的 Code.gs 商業邏輯不用改就能在 Supabase 上執行。
// 流程:一次請求 = 先把要用的資料表整批讀進記憶體 → 同步執行商業邏輯 → 把變更一次寫回資料庫。
import { createHash, randomUUID } from 'node:crypto';

// 試算表分頁 → 資料表、欄位(順序和原本試算表標題列一致)、數值欄位
const T = (table, cols, o) => Object.assign({ table, cols }, o);
export const TABLES = {
  '商品': T('products', ['id','name','categories','sale_type','price','stock','arrival','description','tiers','images','on_sale','specs','brand'], { pk: 'id', num: ['price','stock'] }),
  '商品_內部': T('product_internal', ['product_id','vendor','cost','cost_tax_incl','source','locked'], { pk: 'product_id', num: ['cost'] }),
  '類別': T('categories', ['name'], { pk: 'name' }),
  '品牌': T('brands', ['name'], { pk: 'name' }),
  '廠商': T('vendors', ['name'], { pk: 'name' }),
  '折扣碼': T('discount_codes', ['code','type','value','enabled','note','used','created_at','usage_limit','start_date','end_date'], { pk: 'code', num: ['value','used','usage_limit'] }),
  '等級': T('levels', ['name','rate','categories'], { pk: 'name', num: ['rate'] }),
  '會員': T('members', ['line_id','nickname','avatar','level','joined_at','last_login','friend','note'], { pk: 'line_id' }),
  '訂單': T('orders', ['order_id','ordered_at','name','phone','pay_method','status','subtotal','shipping','total','receiver','note','line_id','pay_link','remit_last5','level','promo_name','promo_discount','credit_used','credit_detail','email','discount_code'], { pk: 'order_id', num: ['subtotal','shipping','total','promo_discount','credit_used'] }),
  '訂單明細': T('order_lines', ['order_id','product_id','product_name','qty','unit_price','line_total','arrival_status','shippable','ship_requested','ship_id','sale_type','vendor','cost','cost_tax_incl','source','vendor_payment_id','spec','arrived_by','arrived_at','ordered_status','ordered_by','ordered_at'], { pk: 'id', num: ['qty','unit_price','line_total','cost'] }),
  '庫存進貨': T('stock_in', ['order_id','product_id','product_name','spec','qty','arrival_status','vendor','cost','cost_tax_incl','source','vendor_payment_id','arrived_by','arrived_at','date','created_by','ship_id'], { pk: 'id', num: ['qty','cost'] }),
  '廠商付款': T('vendor_payments', ['payment_id','pay_date','vendor','amount','remit_note','item_count','cost_due','items','created_by','created_at','image'], { pk: 'payment_id', num: ['amount','item_count','cost_due'] }),
  '出貨單': T('shipments', ['ship_id','order_id','status','carrier','tracking_no','items','created_at','shipped_at','line_id','name','phone','pay_method','receiver','note','subtotal','promo_discount','credit_used','shipping','total','pay_link','remit_last5','level','discount_detail','ship_method','credit_detail'], { pk: 'ship_id', num: ['subtotal','promo_discount','credit_used','shipping','total'] }),
  '購物金': T('credits', ['seq','line_id','granted_at','amount','remaining','expires','source','note','operator','order_id','activity_id'], { pk: 'seq', num: ['amount','remaining'] }),
  '活動': T('activities', ['activity_id','name','starts','ends','scope','scope_value','levels','type','value','min_spend','trigger','valid_days','enabled'], { pk: 'activity_id', num: ['value','min_spend','valid_days'] }),
  '登入階段': T('sessions', ['hash','line_id','expires'], { pk: 'hash' }),
  '管理員': T('admins', ['account','display_name','salt','password_hash','enabled'], { pk: 'account' }),
  '操作紀錄': T('audit_log', ['at','account','action','target','detail'], { pk: 'id', big: true }),
  '重大事件': T('major_events', ['at','account','type','target','summary','snapshot'], { pk: 'id', big: true }),
  '設定': T('settings', ['key','value'], { pk: 'key', autoNum: ['value'] }),
};
for (const k of Object.keys(TABLES)) {
  const t = TABLES[k];
  t.numSet = new Set(t.num || []);
  t.autoSet = new Set(t.autoNum || []);
  t.hasId = t.pk === 'id' && t.table !== 'products'; // 這幾張表用流水號 id 當主鍵(隱藏欄位)
  t.orderCol = t.hasId ? 'id' : 'ord';
}
// 大表只讀最近 N 筆(只追加,不會被商業邏輯刪除)
export const BIG_LIMIT = 4000;

function toSheetVal(t, col, v) {
  if (v === null || v === undefined) return '';
  if (t.numSet.has(col)) return v === '' ? '' : Number(v);
  if (t.autoSet.has(col) && typeof v === 'string' && v.length < 16 && /^-?\d+(\.\d+)?$/.test(v)) return Number(v); // 和試算表一樣,純數字自動當數字
  return v;
}
function toDbVal(t, col, v) {
  if (v instanceof Date) v = v.toISOString();
  if (t.numSet.has(col)) { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  return v === null || v === undefined ? '' : String(v);
}

class Sheet {
  constructor(name, t, header, rows) {
    this.name = name; this.t = t; this.header = header;
    // rows: [{ vals:[…sheet values…], pk: 原主鍵值 | undefined(新增), dirty:false }]
    this.rows = rows; this.deleted = [];
  }
  getLastRow() { return this.rows.length + 1; }
  getLastColumn() { return this.header.length; }
  getMaxRows() { return Math.max(this.rows.length + 1, 1000); }
  setFrozenRows() { return this; }
  getDataRange() { const self = this; return { getValues() { return [self.header.slice()].concat(self.rows.map(r => r.vals.slice())); } }; }
  getRange(r, c, nr, nc) {
    const self = this; nr = nr || 1; nc = nc || 1;
    const rng = {
      setValues(v2) {
        for (let i = 0; i < nr; i++) {
          const ri = r - 2 + i; if (r + i === 1) continue; // 標題列忽略
          const src = v2[i] || [];
          if (ri < self.rows.length) {
            const row = self.rows[ri];
            for (let j = 0; j < nc; j++) row.vals[c - 1 + j] = src[j] === undefined ? '' : src[j];
            row.dirty = true;
          } else if (ri === self.rows.length) {
            const vals = new Array(self.header.length).fill('');
            for (let j = 0; j < nc; j++) vals[c - 1 + j] = src[j] === undefined ? '' : src[j];
            self.rows.push({ vals, pk: undefined, dirty: true });
          } else throw new Error('寫入位置超出範圍: ' + self.name + ' row ' + r);
        }
        return rng;
      },
      setValue(v) { return rng.setValues([[v]]); },
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = self.rows[r - 2 + i]; out.push(row ? row.vals.slice(c - 1, c - 1 + nc) : new Array(nc).fill('')); } return out; },
      setNumberFormat() { return rng; }, setFontWeight() { return rng; },
    };
    return rng;
  }
  deleteRow(r) {
    const ri = r - 2; if (ri < 0 || ri >= this.rows.length) return;
    const row = this.rows.splice(ri, 1)[0];
    if (row.pk !== undefined) this.deleted.push(row.pk);
  }
}

/** 建立一次請求用的服務物件。db 需提供 load(sheetNames)、commit(ops);kv/props 是這次請求開頭讀進來的 */
export function createRuntime({ H, tableData, kv, props, fetchMap }) {
  const sheets = {};
  for (const name of Object.keys(TABLES)) {
    const t = TABLES[name];
    const raw = tableData[name] || [];
    const rows = raw.map(rec => ({
      vals: t.cols.map(c => toSheetVal(t, c, rec[c])),
      pk: t.hasId ? rec.id : rec[t.pk], dirty: false,
    }));
    // 用試算表標題(中文)當 header,商業邏輯用中文欄名取值
    sheets[name] = new Sheet(name, t, H[name], rows);
  }
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => sheets[n] || null,
    deleteSheet: () => {},
    getSheets: () => Object.keys(sheets).map(n => sheets[n]),
  };
  const kvOps = []; const mailQueue = []; const fetchQueue = [];
  const cache = {
    get: (k) => (kv.has(k) ? kv.get(k) : null),
    put: (k, v, ttl) => { kv.set(k, String(v)); kvOps.push({ op: 'put', key: k, value: String(v), ttl: ttl || 600 }); },
    remove: (k) => { kv.delete(k); kvOps.push({ op: 'remove', key: k }); },
  };
  const g = {
    SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss },
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props[k] === undefined ? null : props[k]) }) },
    ScriptApp: { getService: () => ({ getUrl: () => props.APP_URL || '' }) },
    Logger: { log() {} },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 1 } },
    DriveApp: { getRootFolder() {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: (alg, s) => Array.from(createHash('sha256').update(String(s), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)),
      getUuid: () => randomUUID(),
      formatDate: formatDate,
      sleep() {},
      newBlob() { throw new Error('不支援'); }, base64Decode() { throw new Error('不支援'); },
    },
    MailApp: {
      sendEmail: (o) => { mailQueue.push(o); },
      getRemainingDailyQuota: () => 100,
    },
    UrlFetchApp: {
      fetch: (url, opt) => {
        const r = typeof fetchMap === 'function' ? fetchMap(url, opt) : (fetchMap && fetchMap[url]);
        if (r) return { getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)), getResponseCode: () => r.code || 200 };
        fetchQueue.push({ url, opt });
        return { getContentText: () => '{}', getResponseCode: () => 200 };
      },
    },
  };

  /** 取出這次請求造成的所有資料庫變更 */
  function collectOps() {
    const ops = [];
    for (const name of Object.keys(sheets)) {
      const s = sheets[name], t = s.t;
      for (const pk of s.deleted) ops.push({ kind: 'delete', table: t.table, pkcol: t.pk, pk });
      for (const r of s.rows) {
        if (!r.dirty) continue;
        const rec = {}; t.cols.forEach((c, i) => { rec[c] = toDbVal(t, c, r.vals[i]); });
        if (r.pk === undefined) ops.push({ kind: 'insert', table: t.table, rec });
        else ops.push({ kind: 'update', table: t.table, pkcol: t.pk, pk: r.pk, rec });
      }
    }
    return ops;
  }
  return { globals: g, collectOps, kvOps, mailQueue, fetchQueue, sheets, fetchMap };
}

/** Utilities.formatDate 的簡化版,支援 Code.gs 用到的 yyyy yy MM dd HH mm ss(依時區) */
export function formatDate(date, tz, fmt) {
  const d = date instanceof Date ? date : new Date(date);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(d).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  return fmt.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (m) => ({ yyyy: p.year, yy: p.year.slice(2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second }[m]));
}
