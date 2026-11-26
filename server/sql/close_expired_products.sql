CREATE OR REPLACE FUNCTION public.close_expired_products()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
  for r in
    update public.products set on_sale = 'N'
    where on_sale = 'Y' and close_date ~ '^\d{4}-\d{2}-\d{2}( \d{1,2}:\d{2})?$'
      and (case when close_date ~ ' ' then close_date || ':00' else close_date || ' 14:00:00' end)::timestamp at time zone 'Asia/Taipei' <= now()
    returning id, name, close_date
  loop
    insert into public.audit_log(at, account, action, target, detail)
    values (to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'), '系統', '關團自動下架', r.id || ' ' || r.name,
            '關團時間 ' || case when r.close_date ~ ' ' then r.close_date else r.close_date || ' 14:00' end);
  end loop;
end $function$
