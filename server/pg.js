// Postgres 實作:一次請求一個交易。寫入要先拿全域鎖(同一時間只處理一個,避免庫存、編號互相覆蓋);純讀取不排隊
import { TABLES, BIG_LIMIT } from './adapter.js';

let TYPES = null; // 欄位型別(冷啟動時查一次):numeric/bigint 轉成文字,和逐表查詢時的格式一致
async function colTypes(sql) {
  if (TYPES) return TYPES;
  const rows = await sql`select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'`;
  const m = {}; rows.forEach((r) => { m[r.table_name + '.' + r.column_name] = r.data_type; });
  TYPES = m; return m;
}
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

export function makePgDb(sql) {
  return {
    async withTx(fn, opt) {
      const types = await colTypes(sql);
      return sql.begin(async (tx) => {
        if (!opt || opt.lock !== false) await tx`select pg_advisory_xact_lock(727001)`;
        return fn(makeTx(tx, types));
      });
    },
  };
}

function makeTx(tx, types) {
  return {
    async loadAll(opt) {
      const withBig = !!(opt && opt.big); // 操作紀錄、重大事件很大,只有看紀錄的功能才讀
      // 所有資料表、快取、設定合成「一個」查詢,只跑一趟資料庫(原本是 20 幾趟)
      const names = Object.keys(TABLES);
      const parts = names.map((n, i) => {
        const t = TABLES[n];
        const cn = t.hasId ? ['id'].concat(t.cols) : t.cols;
        const cols = cn.map((c) => {
          const ty = types[t.table + '.' + c];
          return (ty === 'numeric' || ty === 'bigint') ? q(c) + '::text' : q(c);
        }).join(', ');
        if (t.big && !withBig) return "'t" + i + "', '[]'::json";
        // 每列用陣列(不重複欄位名稱),資料量約少一半
        const inner = t.big
          ? 'select * from (select json_build_array(' + cols + ') as r, id as __o from ' + q(t.table) + ' order by id desc limit ' + Number(BIG_LIMIT) + ') y order by __o'
          : 'select json_build_array(' + cols + ') as r from ' + q(t.table) + ' order by ' + q(t.orderCol);
        return "'t" + i + "', (select coalesce(json_agg(x.r), '[]'::json) from (" + inner + ') x)';
      });
      parts.push("'kv', (select coalesce(json_object_agg(key, value), '{}'::json) from kv_cache where expires_at > now())");
      parts.push("'props', (select coalesce(json_object_agg(key, value), '{}'::json) from props)");
      const [row] = await tx.unsafe('select json_build_object(' + parts.join(', ') + ') as d');
      const d = typeof row.d === 'string' ? JSON.parse(row.d) : row.d;
      const tableData = {};
      names.forEach((n, i) => {
        const t = TABLES[n], cn = t.hasId ? ['id'].concat(t.cols) : t.cols;
        tableData[n] = (d['t' + i] || []).map((a) => { const o = {}; cn.forEach((c, j) => { o[c] = a[j]; }); return o; });
      });
      return { tableData, kv: new Map(Object.entries(d.kv || {})), props: d.props || {} };
    },
    async commit(ops, kvOps) {
      for (const o of ops) {
        if (o.kind === 'delete') await tx`delete from ${tx(o.table)} where ${tx(o.pkcol)} = ${o.pk}`;
        else if (o.kind === 'update') await tx`update ${tx(o.table)} set ${tx(o.rec)} where ${tx(o.pkcol)} = ${o.pk}`;
        else await tx`insert into ${tx(o.table)} ${tx(o.rec)}`;
      }
      for (const k of kvOps) {
        if (k.op === 'put') await tx`insert into kv_cache(key, value, expires_at) values (${k.key}, ${k.value}, now() + ${k.ttl} * interval '1 second') on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`;
        else await tx`delete from kv_cache where key = ${k.key}`;
      }
      if (kvOps.length && Math.random() < 0.05) await tx`delete from kv_cache where expires_at < now() - interval '1 hour'`;
    },
  };
}
