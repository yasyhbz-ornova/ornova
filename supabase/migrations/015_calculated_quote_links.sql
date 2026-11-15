-- Provenance is private. Customer QuoteSnapshot v1 and its view stay unchanged.
create table public.inquiry_quote_calculations (
  snapshot_id uuid primary key references public.inquiry_quote_snapshots(id) on delete cascade,
  calculation_id uuid not null references public.inquiry_pricing_calculations(id) on delete cascade,
  tax_basis text not null check(tax_basis in ('saved','staff-entered'))
);
create index quote_calculations_calculation_idx on public.inquiry_quote_calculations(calculation_id);
alter table public.inquiry_quote_calculations enable row level security;
revoke all on public.inquiry_quote_calculations from public,anon,authenticated,service_role;
grant select on public.inquiry_quote_calculations to authenticated;
create policy quote_calculations_staff_read on public.inquiry_quote_calculations for select to authenticated
  using ((select auth.uid()) is not null and (select public.is_ornova_staff()));

create function public.publish_calculated_inquiry_quote(p_inquiry_id uuid,p_source_key text,p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  keys text[]=array['calculation_id','source_quote_no','source_order_no','source_revision','issued_at','valid_until','description','quantity','tax_rial'];
  key text; calculation public.inquiry_pricing_calculations; linked uuid;
  owner uuid; projected jsonb; result jsonb; amount text; tax text; total numeric;
  tax_basis text; calculation_uuid uuid;
begin
  if auth.uid() is null or not public.is_ornova_staff() or not exists(
    select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'ornova_role'='staff'
  ) then raise exception 'QUOTE_FORBIDDEN';end if;
  if p_source_key is null or p_source_key!~'^[a-zA-Z0-9_-]{1,80}$' or jsonb_typeof(p_request) is distinct from 'object'
    or not(p_request ?& keys) or p_request-keys<>'{}' or octet_length(p_request::text)>65536 then raise exception 'QUOTE_INVALID';end if;
  foreach key in array array['calculation_id','source_quote_no','source_order_no','issued_at','valid_until','description'] loop
    if jsonb_typeof(p_request->key) is distinct from 'string' then raise exception 'QUOTE_INVALID';end if;
  end loop;
  if (p_request->>'calculation_id')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_request->'source_revision') is distinct from 'number'
    or jsonb_typeof(p_request->'quantity') is distinct from 'number' then raise exception 'QUOTE_INVALID';end if;
  calculation_uuid=(p_request->>'calculation_id')::uuid;
  select * into calculation from public.inquiry_pricing_calculations where id=calculation_uuid;
  if not found then raise exception 'QUOTE_NOT_FOUND';end if;
  if calculation.inquiry_id<>p_inquiry_id or calculation.source_key<>p_source_key then raise exception 'QUOTE_CONFLICT';end if;
  -- Immutable stored native record, not a caller-provided snapshot or amount.
  perform public.validate_pricing_calculation(calculation.snapshot);
  amount=calculation.snapshot->'result'->>'pre_tax_rial';
  if calculation.snapshot->>'method'='cost-plus' then
    if p_request->'tax_rial' is distinct from 'null'::jsonb then raise exception 'QUOTE_INVALID';end if;
    tax=calculation.snapshot->'result'->>'tax_rial';tax_basis='saved';
  else
    if not public.pricing_record_money(p_request->'tax_rial') then raise exception 'QUOTE_INVALID';end if;
    tax=p_request->>'tax_rial';tax_basis='staff-entered';
  end if;
  total=amount::numeric+tax::numeric;
  if total not between 1 and 9223372036854775807 then raise exception 'QUOTE_INVALID';end if;
  projected=public.normalize_inquiry_quote(jsonb_build_object(
    'version',1,'source_quote_no',p_request->'source_quote_no','source_order_no',p_request->'source_order_no',
    'source_revision',p_request->'source_revision','issued_at',p_request->'issued_at','valid_until',p_request->'valid_until',
    'lines',jsonb_build_array(jsonb_build_object('description',p_request->'description','quantity',p_request->'quantity','amount_rial',amount)),
    'discount_rial','0','tax_rial',tax,'total_rial',total::text));
  -- Same order as the manual publisher: source advisory lock, then inquiry row.
  perform pg_advisory_xact_lock(hashtextextended(p_source_key||':'||(projected->>'source_quote_no'),0));
  select user_id into owner from public.inquiries where id=p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND';end if;
  if owner<>calculation.owner_id then raise exception 'QUOTE_CONFLICT';end if;
  result=public.publish_inquiry_quote(p_inquiry_id,p_source_key,projected);
  select calculation_id into linked from public.inquiry_quote_calculations where snapshot_id=(result->>'id')::uuid;
  if found then
    if linked<>calculation.id then raise exception 'QUOTE_CONFLICT';end if;
  else
    -- A pre-existing unlinked manual quote is never retroactively attributed.
    if result->'created' is distinct from 'true'::jsonb then raise exception 'QUOTE_CONFLICT';end if;
    insert into public.inquiry_quote_calculations(snapshot_id,calculation_id,tax_basis)
      values((result->>'id')::uuid,calculation.id,tax_basis);
  end if;
  return result||jsonb_build_object('calculation_id',calculation.id,'calculation_revision',calculation.revision,'payload',projected);
exception when data_exception then raise exception 'QUOTE_INVALID';
end;$$;
revoke all on function public.publish_calculated_inquiry_quote(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.publish_calculated_inquiry_quote(uuid,text,jsonb) to authenticated;
