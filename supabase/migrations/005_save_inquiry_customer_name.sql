-- Save the name explicitly provided with an inquiry to the owner's profile,
-- while creating the inquiry and its items in the same transaction.
-- Preserve any existing phone value on the profile.

alter table public.inquiries
  add column if not exists customer_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inquiries_customer_name_length'
      and conrelid = 'public.inquiries'::regclass
  ) then
    alter table public.inquiries
      add constraint inquiries_customer_name_length
      check (customer_name is null or char_length(btrim(customer_name)) between 1 and 80);
  end if;
end;
$$;

drop function if exists public.create_inquiry_with_items(text, text, jsonb);

create or replace function public.create_inquiry_with_items(
  p_customer_name text,
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

  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 80
     or p_message is null or char_length(btrim(p_message)) not between 1 and 5000
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

  insert into public.profiles (id, display_name)
  values (v_user_id, btrim(p_customer_name))
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  insert into public.inquiries (user_id, customer_name, status, message, contact)
  values (v_user_id, btrim(p_customer_name), 'received', btrim(p_message), btrim(p_contact))
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

revoke all on function public.create_inquiry_with_items(text, text, text, jsonb) from public, anon;
grant execute on function public.create_inquiry_with_items(text, text, text, jsonb) to authenticated;
