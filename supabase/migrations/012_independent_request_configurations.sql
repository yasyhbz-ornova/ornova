-- Apply after 011. Preserve all existing functions and stored request snapshots.
begin;

create or replace function public.create_inquiry_with_configurations(
  p_customer_name text, p_message text, p_contact text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_item jsonb;
  v_slug text;
  v_quantity integer;
  v_preferences jsonb;
  v_normalized jsonb;
  v_items jsonb := '[]'::jsonb;
  v_field text;
  v_text text;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 80
    or p_message is null or char_length(btrim(p_message)) not between 1 and 5000
    or p_contact is null or char_length(btrim(p_contact)) not between 1 and 320 then
    raise exception 'invalid inquiry fields' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid inquiry items' using errcode = '22023'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'invalid inquiry items' using errcode = '22023'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'invalid inquiry item' using errcode = '22023'; end if;
    v_slug := v_item->>'product_slug';
    if v_slug is null or v_slug not in ('lajvard-shab-ring','silent-vase-pin','sepid-brooch') then raise exception 'invalid product' using errcode = '22023'; end if;
    if jsonb_typeof(v_item->'quantity') is distinct from 'number' then raise exception 'invalid quantity' using errcode = '22023'; end if;
    if (v_item->>'quantity')::numeric not between 1 and 20 or mod((v_item->>'quantity')::numeric,1) <> 0 then raise exception 'invalid quantity' using errcode = '22023'; end if;
    v_quantity := (v_item->>'quantity')::numeric::integer;
    v_preferences := v_item->'preferences';
    if not public.valid_product_preferences(v_preferences) then raise exception 'invalid product preferences' using errcode = '22023'; end if;
    if v_preferences ? 'ring_size_eu' and v_slug <> 'lajvard-shab-ring' then raise exception 'ring size requires a ring' using errcode = '22023'; end if;
    -- Match the application's normalized identity; notes and key order cannot
    -- disguise identical configurations. Client line IDs are never authority.
    v_normalized := jsonb_build_object('version',1);
    if v_preferences ? 'ring_size_eu' then v_normalized := v_normalized || jsonb_build_object('ring_size_eu',v_preferences->'ring_size_eu'); end if;
    foreach v_field in array array['stone_note','dimensions_note','finish_note'] loop
      v_text := nullif(btrim(replace(replace(v_preferences->>v_field,E'\r\n',E'\n'),E'\r',E'\n'),E' \t\n\r\f'), '');
      if v_text is not null then v_normalized := v_normalized || jsonb_build_object(v_field,v_text); end if;
    end loop;
    if v_normalized = '{"version":1}'::jsonb then v_normalized := null; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('product_slug',v_slug,'quantity',v_quantity) || case when v_normalized is null then '{}'::jsonb else jsonb_build_object('preferences',v_normalized) end);
  end loop;
  if exists (select 1 from jsonb_array_elements(v_items) item group by item->>'product_slug',coalesce(item->'preferences','{}'::jsonb) having count(*) > 1) then
    raise exception 'duplicate inquiry configuration' using errcode = '22023';
  end if;

  insert into public.profiles(id,display_name) values(v_user_id,btrim(p_customer_name))
    on conflict(id) do update set display_name=excluded.display_name,updated_at=now();
  insert into public.inquiries(user_id,customer_name,status,message,contact)
    values(v_user_id,btrim(p_customer_name),'received',btrim(p_message),btrim(p_contact)) returning id into v_id;
  insert into public.inquiry_items(inquiry_id,product_slug,product_name,quantity,preferences)
    select v_id,item->>'product_slug',case item->>'product_slug'
      when 'lajvard-shab-ring' then 'انگشتر نقره «لاجورد شب»'
      when 'silent-vase-pin' then 'سنجاق سینه نقره «گلدان خاموش»'
      when 'sepid-brooch' then 'بروچ نقره «سپید»' end,
      (item->>'quantity')::integer,item->'preferences'
    from jsonb_array_elements(v_items) item;
  return v_id;
end;
$$;

revoke all on function public.create_inquiry_with_configurations(text,text,text,jsonb) from public,anon;
grant execute on function public.create_inquiry_with_configurations(text,text,text,jsonb) to authenticated;
-- RLS, ownership policies, private storage and direct customer grants unchanged.
commit;
