-- Structured customer preferences, not approved manufacturing specifications.
-- Apply after 005/008; existing unconfigured requests keep their original RPC.
begin;

create or replace function public.valid_product_preferences(p_value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_key text;
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) <> 'object' or p_value->'version' is distinct from '1'::jsonb then return false; end if;
  if exists (select 1 from jsonb_object_keys(p_value) k where k not in ('version', 'ring_size_eu', 'stone_note', 'dimensions_note', 'finish_note')) then return false; end if;
  if p_value ? 'ring_size_eu' then
    if jsonb_typeof(p_value->'ring_size_eu') <> 'number' then return false; end if;
    if (p_value->>'ring_size_eu')::numeric not between 20 and 100 or mod((p_value->>'ring_size_eu')::numeric * 2, 1) <> 0 then return false; end if;
  end if;
  foreach v_key in array array['stone_note','dimensions_note','finish_note'] loop
    if p_value ? v_key then
      if jsonb_typeof(p_value->v_key) <> 'string' or char_length(p_value->>v_key) > 120 then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.inquiry_items add column if not exists preferences jsonb;
alter table public.inquiry_items drop constraint if exists inquiry_items_preferences_valid;
alter table public.inquiry_items add constraint inquiry_items_preferences_valid check (
  public.valid_product_preferences(preferences)
  and (preferences is null or not (preferences ? 'ring_size_eu') or product_slug = 'lajvard-shab-ring')
);

create or replace function public.create_inquiry_with_preferences(
  p_customer_name text, p_message text, p_contact text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid inquiry items' using errcode = '22023'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'invalid inquiry items' using errcode = '22023'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'invalid inquiry item' using errcode = '22023'; end if;
    if not public.valid_product_preferences(v_item->'preferences') then raise exception 'invalid product preferences' using errcode = '22023'; end if;
    if (v_item->'preferences') ? 'ring_size_eu' and v_item->>'product_slug' <> 'lajvard-shab-ring' then raise exception 'ring size requires a ring' using errcode = '22023'; end if;
  end loop;
  -- This call retains the existing owner derivation, catalog/quantity/duplicate
  -- validation and profile update; the whole wrapper is one database transaction.
  v_id := public.create_inquiry_with_items(p_customer_name, p_message, p_contact, p_items);
  update public.inquiry_items target set preferences = source.value->'preferences'
  from jsonb_array_elements(p_items) source
  where target.inquiry_id = v_id and target.product_slug = source.value->>'product_slug';
  return v_id;
end;
$$;

revoke all on function public.create_inquiry_with_preferences(text,text,text,jsonb) from public, anon;
grant execute on function public.create_inquiry_with_preferences(text,text,text,jsonb) to authenticated;
-- No changes to RLS, existing ownership policies, file buckets or customer grants.
commit;
