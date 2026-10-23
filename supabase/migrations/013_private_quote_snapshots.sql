-- Reviewed quote snapshots, not an online calculator or a payment workflow.
create table public.inquiry_quote_sources (
  id uuid primary key default gen_random_uuid(), document_id uuid not null unique default gen_random_uuid(), source_key text not null,
  source_quote_no text not null, source_order_no text not null,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  unique(source_key,source_quote_no)
);
create table public.inquiry_quote_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.inquiry_quote_sources(id) on delete cascade,
  document_id uuid not null,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_quote_no text not null, source_order_no text not null,
  source_revision integer not null check(source_revision between 1 and 10000),
  payload jsonb not null, published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(source_id,source_revision)
);
create index inquiry_quotes_owner_inquiry_idx on public.inquiry_quote_snapshots(owner_id,inquiry_id,published_at desc);
create index inquiry_quote_sources_inquiry_idx on public.inquiry_quote_sources(inquiry_id);
create table public.inquiry_quote_withdrawals (
  snapshot_id uuid primary key references public.inquiry_quote_snapshots(id) on delete cascade,
  withdrawn_at timestamptz not null default now()
);
create table public.inquiry_quote_withdrawal_reasons (
  snapshot_id uuid primary key references public.inquiry_quote_withdrawals(snapshot_id) on delete cascade,
  reason text not null check(char_length(reason) between 1 and 500),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.inquiry_quote_sources enable row level security;
alter table public.inquiry_quote_snapshots enable row level security;
alter table public.inquiry_quote_withdrawals enable row level security;
alter table public.inquiry_quote_withdrawal_reasons enable row level security;
revoke all on public.inquiry_quote_sources,public.inquiry_quote_snapshots,public.inquiry_quote_withdrawals,public.inquiry_quote_withdrawal_reasons from public,anon,authenticated;
grant select on public.inquiry_quote_sources,public.inquiry_quote_withdrawals,public.inquiry_quote_withdrawal_reasons to authenticated;
grant select(id,document_id,inquiry_id,source_quote_no,source_order_no,source_revision,payload,published_at) on public.inquiry_quote_snapshots to authenticated;
create policy quote_sources_staff on public.inquiry_quote_sources for select to authenticated using((select public.is_ornova_staff()));
create policy quote_snapshots_read on public.inquiry_quote_snapshots for select to authenticated using(
  (select public.is_ornova_staff()) or (owner_id=(select auth.uid()) and exists(select 1 from public.inquiries i where i.id=inquiry_id and i.user_id=(select auth.uid())))
);
create policy quote_withdrawals_read on public.inquiry_quote_withdrawals for select to authenticated using(exists(select 1 from public.inquiry_quote_snapshots q where q.id=snapshot_id));
create policy quote_reasons_staff on public.inquiry_quote_withdrawal_reasons for select to authenticated using((select public.is_ornova_staff()));

create function public.normalize_inquiry_quote(p jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  row jsonb; normalized_lines jsonb='[]'; result jsonb; issued timestamptz; until_at timestamptz;
  total numeric=0; discount numeric; tax numeric; max_rial constant numeric=9223372036854775807;
  amount text; revision integer;
begin
  if jsonb_typeof(p) is distinct from 'object' or not (p ?& array['version','source_quote_no','source_order_no','source_revision','issued_at','valid_until','lines','discount_rial','tax_rial','total_rial'])
    or p-array['version','source_quote_no','source_order_no','source_revision','issued_at','valid_until','lines','discount_rial','tax_rial','total_rial'] <> '{}' then raise exception 'QUOTE_INVALID';end if;
  if p->'version'<>'1'::jsonb or jsonb_typeof(p->'source_revision')<>'number' or (p->>'source_revision')!~'^[1-9][0-9]{0,4}$' then raise exception 'QUOTE_INVALID';end if;
  revision=(p->>'source_revision')::integer;if revision>10000 then raise exception 'QUOTE_INVALID';end if;
  foreach amount in array array['source_quote_no','source_order_no'] loop
    if jsonb_typeof(p->amount)<>'string' or char_length(btrim(p->>amount)) not between 1 and 80 or p->>amount ~* '[<>]|(javascript|data)\s*:' then raise exception 'QUOTE_INVALID';end if;
  end loop;
  foreach amount in array array['issued_at','valid_until'] loop
    if jsonb_typeof(p->amount)<>'string' or (p->>amount)!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$' then raise exception 'QUOTE_INVALID';end if;
  end loop;
  issued=(p->>'issued_at')::timestamptz;until_at=(p->>'valid_until')::timestamptz;
  if until_at<=issued then raise exception 'QUOTE_INVALID';end if;
  if jsonb_typeof(p->'lines')<>'array' or jsonb_array_length(p->'lines') not between 1 and 50 then raise exception 'QUOTE_INVALID';end if;
  for row in select value from jsonb_array_elements(p->'lines') loop
    if jsonb_typeof(row)<>'object' or not(row ?& array['description','quantity','amount_rial']) or row-array['description','quantity','amount_rial']<>'{}' then raise exception 'QUOTE_INVALID';end if;
    if jsonb_typeof(row->'description')<>'string' or char_length(btrim(row->>'description')) not between 1 and 240 or row->>'description' ~* '[<>]|(javascript|data)\s*:' then raise exception 'QUOTE_INVALID';end if;
    if jsonb_typeof(row->'quantity')<>'number' or (row->>'quantity')!~'^[1-9][0-9]{0,3}$' or (row->>'quantity')::integer>1000 then raise exception 'QUOTE_INVALID';end if;
    if jsonb_typeof(row->'amount_rial')<>'string' or (row->>'amount_rial')!~'^(0|[1-9][0-9]{0,18})$' or (row->>'amount_rial')::numeric>max_rial then raise exception 'QUOTE_INVALID';end if;
    total=total+(row->>'amount_rial')::numeric;if total>max_rial then raise exception 'QUOTE_INVALID';end if;
    normalized_lines=normalized_lines||jsonb_build_array(jsonb_build_object('description',btrim(row->>'description'),'quantity',row->'quantity','amount_rial',row->>'amount_rial'));
  end loop;
  foreach amount in array array['discount_rial','tax_rial','total_rial'] loop
    if jsonb_typeof(p->amount)<>'string' or (p->>amount)!~'^(0|[1-9][0-9]{0,18})$' or (p->>amount)::numeric>max_rial then raise exception 'QUOTE_INVALID';end if;
  end loop;
  discount=(p->>'discount_rial')::numeric;tax=(p->>'tax_rial')::numeric;
  if discount>total or total-discount+tax not between 1 and max_rial or total-discount+tax<>(p->>'total_rial')::numeric then raise exception 'QUOTE_INVALID';end if;
  result=p||jsonb_build_object('source_quote_no',btrim(p->>'source_quote_no'),'source_order_no',btrim(p->>'source_order_no'),'lines',normalized_lines,
    'issued_at',to_char(issued at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'valid_until',to_char(until_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  return result;
exception when data_exception then raise exception 'QUOTE_INVALID';
end;$$;
revoke all on function public.normalize_inquiry_quote(jsonb) from public,anon,authenticated;

create function public.publish_inquiry_quote(p_inquiry_id uuid,p_source_key text,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  normalized jsonb; source public.inquiry_quote_sources; existing public.inquiry_quote_snapshots;
  owner uuid; state text; quote_id uuid; revision integer;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'QUOTE_FORBIDDEN';end if;
  if p_source_key is null or p_source_key!~'^[a-zA-Z0-9_-]{1,80}$' then raise exception 'QUOTE_INVALID';end if;
  normalized=public.normalize_inquiry_quote(p_snapshot);revision=(normalized->>'source_revision')::integer;
  perform pg_advisory_xact_lock(hashtextextended(p_source_key||':'||(normalized->>'source_quote_no'),0));
  select * into source from public.inquiry_quote_sources where source_key=p_source_key and source_quote_no=normalized->>'source_quote_no';
  select user_id,status into owner,state from public.inquiries where id=p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND';end if;
  if source.id is not null and (source.inquiry_id<>p_inquiry_id or source.owner_id<>owner or source.source_order_no<>normalized->>'source_order_no') then raise exception 'QUOTE_CONFLICT';end if;
  select * into existing from public.inquiry_quote_snapshots where source_id=source.id and source_revision=revision;
  if found then
    if existing.payload<>normalized then raise exception 'QUOTE_CONFLICT';end if;
    return jsonb_build_object('id',existing.id,'created',false);
  end if;
  if state='closed' then raise exception 'QUOTE_CLOSED';end if;
  if (normalized->>'issued_at')::timestamptz>clock_timestamp() or (normalized->>'valid_until')::timestamptz<=clock_timestamp() then raise exception 'QUOTE_INVALID';end if;
  if exists(select 1 from public.inquiry_quote_snapshots where source_id=source.id and source_revision>=revision) then raise exception 'QUOTE_CONFLICT';end if;
  if source.id is null then
    insert into public.inquiry_quote_sources(source_key,source_quote_no,source_order_no,inquiry_id,owner_id)
      values(p_source_key,normalized->>'source_quote_no',normalized->>'source_order_no',p_inquiry_id,owner) returning * into source;
  end if;
  insert into public.inquiry_quote_snapshots(source_id,document_id,inquiry_id,owner_id,source_quote_no,source_order_no,source_revision,payload,created_by)
    values(source.id,source.document_id,p_inquiry_id,owner,normalized->>'source_quote_no',normalized->>'source_order_no',revision,normalized,auth.uid()) returning id into quote_id;
  return jsonb_build_object('id',quote_id,'created',true);
end;$$;
revoke all on function public.publish_inquiry_quote(uuid,text,jsonb) from public,anon;
grant execute on function public.publish_inquiry_quote(uuid,text,jsonb) to authenticated;

create function public.withdraw_inquiry_quote(p_inquiry_id uuid,p_snapshot_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'QUOTE_FORBIDDEN';end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'QUOTE_INVALID';end if;
  perform 1 from public.inquiry_quote_snapshots where id=p_snapshot_id and inquiry_id=p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND';end if;
  if not exists(select 1 from public.inquiry_quote_withdrawals where snapshot_id=p_snapshot_id) then
    insert into public.inquiry_quote_withdrawals(snapshot_id) values(p_snapshot_id);
    insert into public.inquiry_quote_withdrawal_reasons(snapshot_id,reason,created_by) values(p_snapshot_id,btrim(p_reason),auth.uid());
  end if;
  return jsonb_build_object('id',p_snapshot_id,'withdrawn',true);
end;$$;
revoke all on function public.withdraw_inquiry_quote(uuid,uuid,text) from public,anon;
grant execute on function public.withdraw_inquiry_quote(uuid,uuid,text) to authenticated;

create function public.protect_quoted_inquiry_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is distinct from old.user_id and exists(select 1 from public.inquiry_quote_sources where inquiry_id=old.id) then raise exception 'QUOTE_OWNER_IMMUTABLE';end if;
  return new;
end;$$;
revoke all on function public.protect_quoted_inquiry_owner() from public,anon,authenticated;
create trigger protect_quoted_inquiry_owner before update of user_id on public.inquiries for each row execute function public.protect_quoted_inquiry_owner();

create view public.customer_inquiry_quotes with(security_invoker=true) as
select q.id,q.document_id,q.inquiry_id,q.source_quote_no,q.source_order_no,q.source_revision,q.payload,q.published_at,w.withdrawn_at
from public.inquiry_quote_snapshots q left join public.inquiry_quote_withdrawals w on w.snapshot_id=q.id;
revoke all on public.customer_inquiry_quotes from public,anon;
grant select on public.customer_inquiry_quotes to authenticated;
