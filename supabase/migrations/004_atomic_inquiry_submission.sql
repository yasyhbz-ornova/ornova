-- Create an inquiry and all selected product lines in a single transaction.
-- The function is callable only by authenticated users and derives ownership from auth.uid().

create or replace function public.create_inquiry_with_items(
  p_message text,
  p_contact text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_inquiry_id uuid;
  v_item_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_message is null or char_length(btrim(p_message)) not between 1 and 5000
     or p_contact is null or char_length(btrim(p_contact)) not between 1 and 320 then
    raise exception 'invalid inquiry fields' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid inquiry items' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'invalid inquiry items' using errcode = '22023';
  end if;

  select count(*) into v_item_count
  from jsonb_to_recordset(p_items) as item(product_slug text, quantity integer);

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_slug text, quantity integer)
    group by item.product_slug
    having count(*) > 1
  ) then
    raise exception 'invalid or duplicate inquiry item' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_slug text, quantity integer)
    where item.product_slug is null
       or item.quantity is null or item.quantity not between 1 and 20
       or item.product_slug not in ('lajvard-shab-ring', 'silent-vase-pin', 'sepid-brooch')
  ) then
    raise exception 'invalid inquiry item' using errcode = '22023';
  end if;

  insert into public.inquiries (user_id, status, message, contact)
  values (v_user_id, 'received', btrim(p_message), btrim(p_contact))
  returning id into v_inquiry_id;

  if v_item_count > 0 then
    insert into public.inquiry_items (inquiry_id, product_slug, product_name, quantity)
    select v_inquiry_id, item.product_slug,
      case item.product_slug
        when 'lajvard-shab-ring' then 'انگشتر نقره «لاجورد شب»'
        when 'silent-vase-pin' then 'سنجاق سینه نقره «گلدان خاموش»'
        when 'sepid-brooch' then 'بروچ نقره «سپید»'
      end,
      item.quantity
    from jsonb_to_recordset(p_items) as item(product_slug text, quantity integer);
  end if;

  return v_inquiry_id;
end;
$$;

revoke all on function public.create_inquiry_with_items(text, text, jsonb) from public, anon;
grant execute on function public.create_inquiry_with_items(text, text, jsonb) to authenticated;
