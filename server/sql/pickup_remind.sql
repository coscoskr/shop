CREATE OR REPLACE FUNCTION public.pickup_remind(dry_run boolean DEFAULT false)
 RETURNS TABLE(ship_id text, name text, arrived text, has_line boolean, sent boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
declare
  r record;
  today date := (now() at time zone 'Asia/Taipei')::date;
  msg text := E'嗨~你的商品已經到門市囉\n明天是最後取件日\n\n怕您漏看訊息了，想說跟您提醒一下!!\n再麻煩幫我取貨唷~謝謝❤️';
  tok text := (select value from props where key = 'LINE_MSG_TOKEN');
begin
  for r in
    with arr as (
      select a.target as sid, max(a.at) as at
      from audit_log a
      where a.action = '物流狀態' and a.at >= to_char(today - 14, 'YYYY-MM-DD')
        and (a.detail like '2073%' or a.detail like '2063%' or a.detail like '3018%')
      group by a.target
    )
    select arr.sid, arr.at, s.name, coalesce(s.line_id, '') as lid
    from arr join shipments s on s.ship_id = arr.sid
    where left(arr.at, 10)::date + 5 = today            -- 到店當天算第 1 天,第 7 天是最後取件日;提醒在前一天
      and s.status <> '已退回'
      and not exists (select 1 from audit_log b where b.target = arr.sid and b.action = '物流狀態' and b.at > arr.at
                      and left(b.detail, 4) in ('2067','3022','2074','2076','3020','3025','3019'))
      and not exists (select 1 from audit_log c where c.target = arr.sid and c.action = '取件提醒')
  loop
    ship_id := r.sid; name := r.name; arrived := r.at; has_line := r.lid <> ''; sent := false;
    if not dry_run then
      if r.lid <> '' and tok is not null then
        perform net.http_post(
          url := 'https://api.line.me/v2/bot/message/push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok),
          body := jsonb_build_object('to', r.lid, 'messages', jsonb_build_array(jsonb_build_object('type', 'text', 'text', msg))));
        sent := true;
      end if;
      insert into audit_log(at, account, action, target, detail)
      values (to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'), '系統', '取件提醒', r.sid,
              case when sent then '包裹 ' || left(r.at, 10) || ' 到店,明天最後取件日,已 LINE 提醒客人 ' || coalesce(r.name, '')
                   else '包裹 ' || left(r.at, 10) || ' 到店,明天最後取件日;客人 ' || coalesce(r.name, '') || ' 沒有綁 LINE,無法提醒' end);
    end if;
    return next;
  end loop;
end $function$
