# 資料庫裡的程式(Postgres 函式、排程)

這些不是 Edge Function `api` 的一部分,而是直接存在 Supabase 資料庫裡、由 pg_cron 排程執行。
這個資料夾的檔案和線上資料庫**逐字相同**(2026-11-26 匯出,用 md5 比對過)。

| 檔案 | 用途 |
|---|---|
| `cb_pend_remind.sql` | 每天 10:07、17:07 用 LINE 提醒到貨管理員＋確認人員:酷柏待對應品項、多出來待上架的貨 |
| `pickup_remind.sql` | 每天 12:03 提醒客人明天是最後取件日 |
| `close_expired_products.sql` | 每分鐘把關團時間到的商品自動下架 |
| `cron_jobs.sql` | 以上排程的設定 |

## 修改流程
1. 改這裡的 `.sql` 檔,開 PR 合併進 main。
2. 合併後把檔案內容整段在 Supabase SQL 執行(`CREATE OR REPLACE FUNCTION` 會直接取代線上版本)。
3. 預覽不發送:`select public.cb_pend_remind(true);`
4. 確認線上和 GitHub 一致:
   `select md5(pg_get_functiondef('public.cb_pend_remind(boolean)'::regprocedure));` 要等於 `md5sum < server/sql/cb_pend_remind.sql`。

**不要只改線上資料庫不改這裡**,否則下次有人照 GitHub 部署會把線上的修改蓋掉。
