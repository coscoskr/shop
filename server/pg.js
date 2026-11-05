// Postgres 實作:一次請求一個交易,先拿全域鎖(同一時間只處理一個,避免庫存、編號互相覆蓋)
import { TABLES, BIG_LIMIT } from './adapter.js';

export function makePgDb(sql) {
  return {
    async withTx(fn) {
      return sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(727001)`;
        return fn(makeTx(tx));
      });
    },
  };
}

function makeTx(tx) {
  return {
    async loadAll() {
      const names = Object.keys(TABLES);
      const loaded = await Promise.all(names.map((n) => {
        const t = TABLES[n];
        const cols = t.hasId ? ['id'].concat(t.cols) : t.cols;
        if (t.big) {
          return tx`select * from (select ${tx(cols)} from ${tx(t.table)} order by id desc limit ${BIG_LIMIT}) x order by id`;
        }
        return tx`select ${tx(cols)} from ${tx(t.table)} order by ${tx(t.orderCol)}`;
      }));
      const tableData = {};
      names.forEach((n, i) => { tableData[n] = Array.from(loaded[i]); });
      const kvRows = await tx`select key, value from kv_cache where expires_at > now()`;
      const kv = new Map(kvRows.map((r) => [r.key, r.value]));
      const pr = await tx`select key, value from props`;
      const props = {}; pr.forEach((r) => { props[r.key] = r.value; });
      return { tableData, kv, props };
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
