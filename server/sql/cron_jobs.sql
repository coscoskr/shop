-- pg_cron 排程(時間是 UTC;台灣時間 = UTC+8)。2026-11-26 從線上資料庫匯出。
-- 重新建立排程:select cron.schedule('名稱', '排程', '指令');  同名會覆蓋。
select cron.schedule('daily-revenue-push',     '0 14 * * *',  $$
  select net.http_post(
    url := 'https://wgmbabfkuditzeiozfvz.supabase.co/functions/v1/daily-revenue',
    headers := jsonb_build_object('Content-Type','application/json','X-API-Key',(select decrypted_secret from vault.decrypted_secrets where name='daily_report_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$);                                                                       -- 每天 22:00 業績推播
select cron.schedule('close-expired-products', '* * * * *',   'select public.close_expired_products()'); -- 每分鐘:關團時間到自動下架
select cron.schedule('pickup-last-day-remind', '3 4 * * *',   'select public.pickup_remind()');          -- 每天 12:03 取件提醒
select cron.schedule('coolbau-pending-remind', '7 2,9 * * *', 'select public.cb_pend_remind()');         -- 每天 10:07、17:07 酷柏待處理提醒
