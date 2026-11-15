-- A customer's explicit acceptance binds one inquiry to one immutable quote snapshot.
-- It is a financial acceptance record, not an invoice or a payment receipt.
create table public.inquiry_quote_acceptances (
  inquiry_id uuid primary key references public.inquiries(id),
  snapshot_id uuid not null unique references public.inquiry_quote_snapshots(id),
  owner_id uuid not null references auth.users(id),
  accepted_payload jsonb not null,
  accepted_total_rial numeric(19,0) not null check (accepted_total_rial > 0),
  accepted_at timestamptz not null default clock_timestamp()
);
create index inquiry_quote_acceptances_recent_idx on public.inquiry_quote_acceptances(accepted_at desc,snapshot_id desc);
alter table public.inquiry_quote_acceptances enable row level security;
revoke all on public.inquiry_quote_acceptances from public, anon, authenticated;
grant select(snapshot_id,accepted_at,accepted_payload) on public.inquiry_quote_acceptances to authenticated;
create policy quote_acceptances_read on public.inquiry_quote_acceptances for select to authenticated using (
  (select public.is_ornova_staff()) or
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.inquiries i where i.id = inquiry_id and i.user_id = (select auth.uid())
  ))
);

create function public.protect_quote_acceptance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'QUOTE_ACCEPTED';
end;$$;
revoke all on function public.protect_quote_acceptance() from public, anon, authenticated;
create trigger protect_quote_acceptance before update or delete on public.inquiry_quote_acceptances
for each row execute function public.protect_quote_acceptance();

-- Both publisher and withdrawal are serialized with acceptance on the inquiry row.
create function public.reject_quote_change_after_acceptance() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_inquiry uuid;
begin
  if tg_table_name = 'inquiry_quote_snapshots' then
    target_inquiry := new.inquiry_id;
  else
    select q.inquiry_id into target_inquiry from public.inquiry_quote_snapshots q where q.id = new.snapshot_id;
  end if;
  perform 1 from public.inquiries where id = target_inquiry for update;
  if exists (select 1 from public.inquiry_quote_acceptances a where a.inquiry_id = target_inquiry) then
    raise exception 'QUOTE_ACCEPTED';
  end if;
  return new;
end;$$;
revoke all on function public.reject_quote_change_after_acceptance() from public, anon, authenticated;
create trigger reject_published_quote_after_acceptance before insert on public.inquiry_quote_snapshots
for each row execute function public.reject_quote_change_after_acceptance();
create trigger reject_withdrawn_quote_after_acceptance before insert on public.inquiry_quote_withdrawals
for each row execute function public.reject_quote_change_after_acceptance();

create or replace function public.withdraw_inquiry_quote(p_inquiry_id uuid,p_snapshot_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'QUOTE_FORBIDDEN'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'QUOTE_INVALID'; end if;
  perform 1 from public.inquiries where id = p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  perform 1 from public.inquiry_quote_snapshots where id = p_snapshot_id and inquiry_id = p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if exists (select 1 from public.inquiry_quote_acceptances where inquiry_id = p_inquiry_id) then raise exception 'QUOTE_ACCEPTED'; end if;
  if not exists (select 1 from public.inquiry_quote_withdrawals where snapshot_id = p_snapshot_id) then
    insert into public.inquiry_quote_withdrawals(snapshot_id) values(p_snapshot_id);
    insert into public.inquiry_quote_withdrawal_reasons(snapshot_id,reason,created_by) values(p_snapshot_id,btrim(p_reason),auth.uid());
  end if;
  return jsonb_build_object('id',p_snapshot_id,'withdrawn',true);
end;$$;

create function public.accept_inquiry_quote(p_inquiry_id uuid,p_snapshot_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid; state text; q public.inquiry_quote_snapshots; existing public.inquiry_quote_acceptances;
begin
  if auth.uid() is null then raise exception 'QUOTE_FORBIDDEN'; end if;
  select user_id,status into owner,state from public.inquiries where id = p_inquiry_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if owner <> auth.uid() then raise exception 'QUOTE_FORBIDDEN'; end if;
  select * into existing from public.inquiry_quote_acceptances where inquiry_id = p_inquiry_id;
  if found then
    if existing.snapshot_id <> p_snapshot_id then raise exception 'QUOTE_ACCEPTED'; end if;
    return jsonb_build_object('id',existing.snapshot_id,'accepted_at',existing.accepted_at,'created',false);
  end if;
  if state = 'closed' then raise exception 'QUOTE_CLOSED'; end if;
  select * into q from public.inquiry_quote_snapshots where id = p_snapshot_id and inquiry_id = p_inquiry_id and owner_id = owner for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if exists (select 1 from public.inquiry_quote_withdrawals w where w.snapshot_id = q.id) then raise exception 'QUOTE_CONFLICT'; end if;
  if exists (select 1 from public.inquiry_quote_snapshots newer where newer.source_id = q.source_id and newer.source_revision > q.source_revision) then raise exception 'QUOTE_CONFLICT'; end if;
  if (q.payload->>'valid_until')::timestamptz <= clock_timestamp() then raise exception 'QUOTE_EXPIRED'; end if;
  insert into public.inquiry_quote_acceptances(inquiry_id,snapshot_id,owner_id,accepted_payload,accepted_total_rial)
    values(p_inquiry_id,q.id,owner,q.payload,(q.payload->>'total_rial')::numeric)
    returning * into existing;
  return jsonb_build_object('id',existing.snapshot_id,'accepted_at',existing.accepted_at,'created',true);
end;$$;
revoke all on function public.accept_inquiry_quote(uuid,uuid) from public, anon;
grant execute on function public.accept_inquiry_quote(uuid,uuid) to authenticated;

create or replace view public.customer_inquiry_quotes with (security_invoker = true) as
select q.id,q.document_id,q.inquiry_id,q.source_quote_no,q.source_order_no,q.source_revision,q.payload,q.published_at,w.withdrawn_at,a.accepted_at,a.accepted_payload->>'total_rial' as accepted_total_rial
from public.inquiry_quote_snapshots q
left join public.inquiry_quote_withdrawals w on w.snapshot_id = q.id
left join public.inquiry_quote_acceptances a on a.snapshot_id = q.id;
