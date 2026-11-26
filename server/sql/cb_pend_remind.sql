CREATE OR REPLACE FUNCTION public.cb_pend_remind(dry_run boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
declare
  pend jsonb;
  x jsonb; c jsonb;
  lines text[] := '{}';
  msg text;
  tok text := (select value from props where key = 'LINE_MSG_TOKEN');
  targets text[];
  u text;
  days int;
  k int;
  pname text;
  n_items int := 0;
  r record;
begin
  begin pend := coalesce((select value from settings where key = '酷柏待對應'), '[]')::jsonb; exception when others then pend := '[]'::jsonb; end;
  if jsonb_typeof(pend) <> 'array' then pend := '[]'::jsonb; end if;

  for x in select * from jsonb_array_elements(pend) loop
    n_items := n_items + 1;
    days := case when coalesce(x->>'at','') <> '' then greatest(0, ((now() at time zone 'Asia/Taipei')::date - left(x->>'at',10)::date)) else null end;
    lines := lines || (coalesce(x->>'code','?') || '｜' || coalesce(x->>'title','') || case when coalesce(x->>'spec','') <> '' then '(' || (x->>'spec') || ')' else '' end
              || ' ×' || coalesce(x->>'qty','1') || case when days is null then '' when days = 0 then '・今天' else '・已等 ' || days || ' 天' end);
    if jsonb_array_length(coalesce(x->'cand','[]'::jsonb)) = 0 then
      lines := lines || ('   → COS 找不到對應商品(客訂專區或店裡沒上架)。已在後台手動處理或不用入帳,回「' || coalesce(x->>'code','?') || '刪」');
    else
      k := 0;
      for c in select * from jsonb_array_elements(x->'cand') loop
        k := k + 1;
        select name into pname from products where id = c->>0;
        lines := lines || ('   → 回「' || (x->>'code') || k || '」入帳到 ' || (c->>0) || ' ' || coalesce(pname,'') || case when coalesce(c->>1,'') <> '' then '(' || (c->>1) || ')' else '' end);
      end loop;
      lines := lines || ('   → 都不是回「' || (x->>'code') || '0」;已手動處理回「' || (x->>'code') || '刪」');
    end if;
  end loop;

  -- 酷柏到貨多出來、沒有客人在等,還沒決定要不要上架的
  for r in select order_id, product_name, spec, qty from stock_in where created_by = '酷柏到貨' and arrival_status = '待到貨' order by order_id loop
    if n_items >= 0 and not ('__held' = any(lines)) then lines := lines || '__held'::text; end if;
    lines := lines || ('・' || r.order_id || ' ' || r.product_name || case when coalesce(r.spec,'') <> '' then '(' || r.spec || ')' else '' end || ' ×' || r.qty);
    n_items := n_items + 1;
  end loop;

  if n_items = 0 then return 'nothing'; end if;
  msg := '⏰ 酷柏到貨還有沒處理完的(每天 10:00、17:00 提醒,處理完就不會再提醒)' || E'\n\n' || array_to_string(lines, E'\n');
  msg := replace(msg, '__held', E'\n📦 多出來、沒有客人在等的貨(還沒上架):確認要上架回「上架 全部」,只上架其中幾筆回「上架 K0012 K0015」(用上面的編號);不要的到「庫存表」刪除');
  msg := left(msg, 4900);

  select array_agg(distinct t) into targets from (
    select trim(value) t from settings where key = '到貨管理員LINE'
    union all select trim(unnest(regexp_split_to_array(coalesce((select value from settings where key = '酷柏通知對象'), ''), '[,，、\s]+')))
  ) z where t ~ '^U[0-9A-Za-z]{4,40}$';

  if dry_run or tok is null or targets is null then return msg; end if;
  foreach u in array targets loop
    perform net.http_post(
      url := 'https://api.line.me/v2/bot/message/push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok),
      body := jsonb_build_object('to', u, 'messages', jsonb_build_array(jsonb_build_object('type', 'text', 'text', msg))));
  end loop;
  insert into audit_log(at, account, action, target, detail)
    values (to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'), '系統', '酷柏待處理提醒', array_length(targets,1) || ' 人', left(replace(msg, E'\n', ' / '), 500));
  return msg;
end;
$function$
