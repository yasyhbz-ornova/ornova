-- Internal native results only. No customer view or permission to publish a quote.
create table public.inquiry_pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  revision integer not null check(revision between 1 and 10000),
  source_key text not null check(source_key ~ '^[a-zA-Z0-9_-]{1,80}$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(inquiry_id,revision)
);
create index pricing_calculations_owner_idx on public.inquiry_pricing_calculations(owner_id);
alter table public.inquiry_pricing_calculations enable row level security;
revoke all on public.inquiry_pricing_calculations from public,anon,authenticated,service_role;
grant select on public.inquiry_pricing_calculations to authenticated;
create policy pricing_calculations_staff_read on public.inquiry_pricing_calculations for select to authenticated
  using ((select auth.uid()) is not null and (select public.is_ornova_staff()));

create function public.pricing_record_money(value jsonb,positive boolean default false) returns boolean
language sql immutable set search_path='' as $$
select coalesce(case when jsonb_typeof(value)='string' and value #>> '{}' ~ '^(0|[1-9][0-9]{0,18})$'
  then (value #>> '{}')::numeric between (case when positive then 1 else 0 end) and 9223372036854775807 else false end,false);
$$;
revoke all on function public.pricing_record_money(jsonb,boolean) from public,anon,authenticated,service_role;

create function public.validate_pricing_calculation(p jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare v_input jsonb; result jsonb; keys text[]; key text; amount text; method text;
begin
  keys=array['schema_version','request_id','method','policy_version','input','algorithm_version','result'];
  if jsonb_typeof(p) is distinct from 'object' or not(p ?& keys) or p-keys<>'{}' or octet_length(p::text)>65536 then raise exception 'CALC_INVALID';end if;
  if p->'schema_version'<>'1'::jsonb or jsonb_typeof(p->'request_id')<>'string' or (p->>'request_id')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'CALC_INVALID';end if;
  if jsonb_typeof(p->'policy_version')<>'string' or (p->>'policy_version')!~'^[a-zA-Z0-9_.-]{1,80}$' then raise exception 'CALC_INVALID';end if;
  method=p->>'method';v_input=p->'input';result=p->'result';
  if method='cost-plus' then
    if p->'algorithm_version' is distinct from '"pcs-standard-48c17189-v1"'::jsonb then raise exception 'CALC_INVALID';end if;
    keys=array['true_cost_rial','mandatory_buffer_rial','profit_method','profit_bp','rounding','rounding_step_rial','tax_bp','override_pre_tax_rial','override_reason'];
    if jsonb_typeof(v_input) is distinct from 'object' or not(v_input ?& keys) or v_input-keys<>'{}' then raise exception 'CALC_INVALID';end if;
    foreach key in array array['true_cost_rial','mandatory_buffer_rial','rounding_step_rial'] loop
      if not public.pricing_record_money(v_input->key,key='true_cost_rial') then raise exception 'CALC_INVALID';end if;
    end loop;
    if jsonb_typeof(v_input->'profit_method') is distinct from 'string' or jsonb_typeof(v_input->'rounding') is distinct from 'string' or v_input->>'profit_method' not in ('margin','markup') or v_input->>'rounding' not in ('none','nearest','up','down') then raise exception 'CALC_INVALID';end if;
    foreach key in array array['profit_bp','tax_bp'] loop
      amount=v_input->>key;
      if jsonb_typeof(v_input->key) is distinct from 'number' or amount!~'^(0|[1-9][0-9]{0,9})$' then raise exception 'CALC_INVALID';end if;
      if amount::numeric > (case when key='tax_bp' then 10000 when v_input->>'profit_method'='margin' then 9999 else 2147473647 end) then raise exception 'CALC_INVALID';end if;
    end loop;
    if v_input->>'rounding'<>'none' and v_input->>'rounding_step_rial'='0' then raise exception 'CALC_INVALID';end if;
    if v_input->'override_pre_tax_rial'<>'null'::jsonb and not public.pricing_record_money(v_input->'override_pre_tax_rial',true) then raise exception 'CALC_INVALID';end if;
    if v_input->'override_reason'<>'null'::jsonb and (jsonb_typeof(v_input->'override_reason')<>'string' or char_length(btrim(v_input->>'override_reason')) not between 1 and 500) then raise exception 'CALC_INVALID';end if;
    keys=array['cost_floor_rial','target_rial','pre_tax_rial','tax_rial','total_rial','effective_margin_bp','warnings'];
    if jsonb_typeof(result) is distinct from 'object' or not(result ?& keys) or result-keys<>'{}' then raise exception 'CALC_INVALID';end if;
    foreach key in array array['cost_floor_rial','target_rial'] loop
      if not public.pricing_record_money(result->key) then raise exception 'CALC_INVALID';end if;
    end loop;
    if jsonb_typeof(result->'effective_margin_bp') is distinct from 'number' or (result->>'effective_margin_bp')!~'^(0|[1-9][0-9]{0,4})$' or (result->>'effective_margin_bp')::numeric>10000 then raise exception 'CALC_INVALID';end if;
    if jsonb_typeof(result->'warnings') is distinct from 'array' or jsonb_array_length(result->'warnings')>2 then raise exception 'CALC_INVALID';end if;
    for amount in select jsonb_array_elements_text(result->'warnings') loop
      if amount is null or amount not in ('MANDATORY_BUFFER_ZERO','FINAL_BELOW_TARGET') then raise exception 'CALC_INVALID';end if;
    end loop;
  elsif method='gram-sale' then
    if p->'algorithm_version' is distinct from '"pcs-gram-explicit-fees-v1"'::jsonb then raise exception 'CALC_INVALID';end if;
    keys=array['weight_mg','rate_per_gram_rial','under_2g_fee_rial','under_4g_fee_rial','stone_total_rial','stone_count','setting_per_stone_rial','packaging_rial','logistics_rial','design_rial'];
    if jsonb_typeof(v_input) is distinct from 'object' or not(v_input ?& keys) or v_input-keys<>'{}' then raise exception 'CALC_INVALID';end if;
    foreach key in array keys loop
      if key='stone_count' then
        if jsonb_typeof(v_input->key) is distinct from 'number' or (v_input->>key)!~'^(0|[1-9][0-9]{0,9})$' or (v_input->>key)::numeric>2147483647 then raise exception 'CALC_INVALID';end if;
      elsif not public.pricing_record_money(v_input->key,key in ('weight_mg','rate_per_gram_rial')) then raise exception 'CALC_INVALID';end if;
    end loop;
    keys=array['base_rial','light_piece_rial','setting_rial','pre_tax_rial','tax_rial','total_rial','warnings'];
    if jsonb_typeof(result) is distinct from 'object' or not(result ?& keys) or result-keys<>'{}' then raise exception 'CALC_INVALID';end if;
    foreach key in array array['base_rial','light_piece_rial','setting_rial'] loop
      if not public.pricing_record_money(result->key) then raise exception 'CALC_INVALID';end if;
    end loop;
    if result->'warnings'<>'["GRAM_SALE_HAS_NO_TAX_POLICY"]'::jsonb or result->'tax_rial'<>'"0"'::jsonb then raise exception 'CALC_INVALID';end if;
  else raise exception 'CALC_INVALID';end if;
  foreach key in array array['pre_tax_rial','tax_rial','total_rial'] loop
    if not public.pricing_record_money(result->key,key='total_rial') then raise exception 'CALC_INVALID';end if;
  end loop;
  if (result->>'pre_tax_rial')::numeric+(result->>'tax_rial')::numeric<>(result->>'total_rial')::numeric then raise exception 'CALC_INVALID';end if;
  return p;
exception when data_exception then raise exception 'CALC_INVALID';
end;$$;
revoke all on function public.validate_pricing_calculation(jsonb) from public,anon,authenticated,service_role;

create function public.save_inquiry_pricing_calculation(p_inquiry_id uuid,p_expected_owner_id uuid,p_actor_id uuid,p_source_key text,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized jsonb; request uuid; owner uuid; state text; existing public.inquiry_pricing_calculations; stored public.inquiry_pricing_calculations; next_revision integer;
begin
  if auth.role() is distinct from 'service_role' or not exists(select 1 from auth.users where id=p_actor_id and raw_app_meta_data->>'ornova_role'='staff') then raise exception 'CALC_FORBIDDEN';end if;
  if p_source_key is null or p_source_key!~'^[a-zA-Z0-9_-]{1,80}$' then raise exception 'CALC_INVALID';end if;
  normalized=public.validate_pricing_calculation(p_snapshot);request=(normalized->>'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('ornova-calculation:'||request::text,0));
  select user_id,status into owner,state from public.inquiries where id=p_inquiry_id for update;
  if not found then raise exception 'CALC_NOT_FOUND';end if;
  if p_expected_owner_id is distinct from owner then raise exception 'CALC_CONFLICT';end if;
  select * into existing from public.inquiry_pricing_calculations where request_id=request;
  if found then
    if existing.inquiry_id<>p_inquiry_id or existing.owner_id<>owner or existing.source_key<>p_source_key or existing.snapshot<>normalized then raise exception 'CALC_CONFLICT';end if;
    return jsonb_build_object('created',false,'record',to_jsonb(existing)-array['owner_id','request_id']);
  end if;
  if state='closed' then raise exception 'CALC_CLOSED';end if;
  select coalesce(max(revision),0)+1 into next_revision from public.inquiry_pricing_calculations where inquiry_id=p_inquiry_id;
  if next_revision>10000 then raise exception 'CALC_CONFLICT';end if;
  insert into public.inquiry_pricing_calculations(inquiry_id,owner_id,request_id,revision,source_key,snapshot,created_by)
    values(p_inquiry_id,owner,request,next_revision,p_source_key,normalized,p_actor_id) returning * into stored;
  return jsonb_build_object('created',true,'record',to_jsonb(stored)-array['owner_id','request_id']);
end;$$;
revoke all on function public.save_inquiry_pricing_calculation(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_inquiry_pricing_calculation(uuid,uuid,uuid,text,jsonb) to service_role;

create function public.protect_priced_inquiry_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is distinct from old.user_id and exists(select 1 from public.inquiry_pricing_calculations where inquiry_id=old.id) then raise exception 'CALC_OWNER_IMMUTABLE';end if;
  return new;
end;$$;
revoke all on function public.protect_priced_inquiry_owner() from public,anon,authenticated,service_role;
create trigger protect_priced_inquiry_owner before update of user_id on public.inquiries for each row execute function public.protect_priced_inquiry_owner();
