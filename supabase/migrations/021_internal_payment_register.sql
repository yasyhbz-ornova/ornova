-- Internal staff-confirmed payment records against an accepted quote.
-- This is an audit register, not a payment gateway or official tax invoice.
begin;

create table public.inquiry_payment_records (
  id uuid primary key,
  inquiry_id uuid not null references public.inquiry_quote_acceptances(inquiry_id),
  amount_rial numeric(19,0) not null check (amount_rial > 0),
  reference text not null unique check (char_length(btrim(reference)) between 1 and 120),
  paid_at timestamptz not null,
  note text check (note is null or char_length(note) <= 500),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default clock_timestamp()
);
create index inquiry_payment_records_recent_idx on public.inquiry_payment_records(inquiry_id,recorded_at desc,id desc);
alter table public.inquiry_payment_records enable row level security;
revoke all on public.inquiry_payment_records from public,anon,authenticated;
grant select on public.inquiry_payment_records to authenticated;
create policy inquiry_payment_staff_read on public.inquiry_payment_records for select to authenticated
  using ((select public.is_ornova_staff()));

create table public.inquiry_payment_reversals (
  record_id uuid primary key references public.inquiry_payment_records(id),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  reversed_by uuid not null references auth.users(id),
  reversed_at timestamptz not null default clock_timestamp()
);
alter table public.inquiry_payment_reversals enable row level security;
revoke all on public.inquiry_payment_reversals from public,anon,authenticated;
grant select on public.inquiry_payment_reversals to authenticated;
create policy inquiry_payment_reversals_staff_read on public.inquiry_payment_reversals for select to authenticated
  using ((select public.is_ornova_staff()));

create function public.protect_inquiry_payment_record() returns trigger
language plpgsql security definer set search_path = '' as $$
begin raise exception 'PAYMENT_IMMUTABLE'; end;
$$;
revoke all on function public.protect_inquiry_payment_record() from public,anon,authenticated;
create trigger protect_inquiry_payment_records before update or delete on public.inquiry_payment_records
for each row execute function public.protect_inquiry_payment_record();
create trigger protect_inquiry_payment_reversals before update or delete on public.inquiry_payment_reversals
for each row execute function public.protect_inquiry_payment_record();

create function public.record_inquiry_payment(p_id uuid,p_inquiry_id uuid,p_amount_rial text,p_reference text,p_paid_at timestamptz,p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_acceptance public.inquiry_quote_acceptances; v_existing public.inquiry_payment_records; v_total numeric; v_amount numeric; v_reference text; v_note text;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'PAYMENT_FORBIDDEN' using errcode='42501'; end if;
  if p_id is null or p_inquiry_id is null or p_amount_rial is null or p_amount_rial !~ '^[1-9][0-9]{0,18}$'
    or p_reference is null or char_length(btrim(p_reference)) not between 1 and 120
    or p_paid_at is null or p_note is not null and char_length(p_note) > 500 then
    raise exception 'PAYMENT_INVALID' using errcode='22023'; end if;
  v_amount := p_amount_rial::numeric;
  v_reference := btrim(p_reference);
  v_note := nullif(btrim(p_note),'');
  select * into v_acceptance from public.inquiry_quote_acceptances where inquiry_id=p_inquiry_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_existing from public.inquiry_payment_records where id=p_id;
  if found then
    if v_existing.inquiry_id <> p_inquiry_id or v_existing.amount_rial <> v_amount
      or v_existing.reference <> v_reference or v_existing.paid_at <> p_paid_at
      or v_existing.note is distinct from v_note then raise exception 'PAYMENT_CONFLICT' using errcode='40001'; end if;
    if exists (select 1 from public.inquiry_payment_reversals where record_id=p_id) then
      raise exception 'PAYMENT_CONFLICT' using errcode='40001'; end if;
    return jsonb_build_object('id',v_existing.id,'created',false);
  end if;
  select coalesce(sum(r.amount_rial),0) into v_total from public.inquiry_payment_records r
    where r.inquiry_id=p_inquiry_id and not exists (select 1 from public.inquiry_payment_reversals x where x.record_id=r.id);
  if v_total + v_amount > v_acceptance.accepted_total_rial then raise exception 'PAYMENT_OVERPAY' using errcode='22023'; end if;
  insert into public.inquiry_payment_records(id,inquiry_id,amount_rial,reference,paid_at,note,recorded_by)
    values(p_id,p_inquiry_id,v_amount,v_reference,p_paid_at,v_note,auth.uid());
  return jsonb_build_object('id',p_id,'created',true);
end;
$$;
revoke all on function public.record_inquiry_payment(uuid,uuid,text,text,timestamptz,text) from public,anon;
grant execute on function public.record_inquiry_payment(uuid,uuid,text,text,timestamptz,text) to authenticated;

create function public.reverse_inquiry_payment(p_record_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_inquiry uuid; v_record public.inquiry_payment_records; v_reversal public.inquiry_payment_reversals; v_reason text;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'PAYMENT_FORBIDDEN' using errcode='42501'; end if;
  if p_record_id is null or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'PAYMENT_INVALID' using errcode='22023'; end if;
  v_reason := btrim(p_reason);
  select inquiry_id into v_inquiry from public.inquiry_payment_records where id=p_record_id;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode='P0002'; end if;
  perform 1 from public.inquiry_quote_acceptances where inquiry_id=v_inquiry for update;
  select * into v_record from public.inquiry_payment_records where id=p_record_id for update;
  if not found or v_record.inquiry_id <> v_inquiry then raise exception 'PAYMENT_CONFLICT' using errcode='40001'; end if;
  select * into v_reversal from public.inquiry_payment_reversals where record_id=p_record_id;
  if found then
    if v_reversal.reason <> v_reason then raise exception 'PAYMENT_CONFLICT' using errcode='40001'; end if;
    return jsonb_build_object('id',p_record_id,'reversed',true,'created',false);
  end if;
  insert into public.inquiry_payment_reversals(record_id,reason,reversed_by) values(p_record_id,v_reason,auth.uid());
  return jsonb_build_object('id',p_record_id,'reversed',true,'created',true);
end;
$$;
revoke all on function public.reverse_inquiry_payment(uuid,text) from public,anon;
grant execute on function public.reverse_inquiry_payment(uuid,text) to authenticated;

create view public.staff_inquiry_payments with (security_invoker=true) as
select r.id,r.inquiry_id,r.amount_rial::text as amount_rial,r.reference,r.paid_at,r.note,r.recorded_by,r.recorded_at,
  x.reason as reversal_reason,x.reversed_by,x.reversed_at
from public.inquiry_payment_records r left join public.inquiry_payment_reversals x on x.record_id=r.id;
revoke all on public.staff_inquiry_payments from public,anon;
grant select on public.staff_inquiry_payments to authenticated;
commit;
