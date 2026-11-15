-- Private customer/staff conversations and an append-only status history.
-- Staff access is granted only through the trusted JWT app_metadata claim:
-- { "ornova_role": "staff" }. Never use user-editable user_metadata for this.

create or replace function public.is_ornova_staff()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'ornova_role' = 'staff', false);
$$;

create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('customer', 'staff')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists inquiry_messages_thread_created_idx
  on public.inquiry_messages (inquiry_id, created_at, id);

create table if not exists public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  previous_status text check (previous_status is null or previous_status in ('received', 'reviewing', 'needs_info', 'quoted', 'approved', 'closed')),
  status text not null check (status in ('received', 'reviewing', 'needs_info', 'quoted', 'approved', 'closed')),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inquiry_events_thread_created_idx
  on public.inquiry_events (inquiry_id, created_at, id);

alter table public.inquiry_messages enable row level security;
alter table public.inquiry_events enable row level security;

-- Customer-created requests always begin in the received state.
drop policy if exists "inquiries_insert_own" on public.inquiries;
create policy "inquiries_insert_own" on public.inquiries
  for insert with check (auth.uid() = user_id and status = 'received');

-- A customer can never edit workflow status; only trusted staff can read all cases or update one.
drop policy if exists "inquiries_update_own" on public.inquiries;
drop policy if exists "inquiries_select_staff" on public.inquiries;
drop policy if exists "inquiries_update_staff" on public.inquiries;
create policy "inquiries_select_staff" on public.inquiries
  for select using (public.is_ornova_staff());
create policy "inquiries_update_staff" on public.inquiries
  for update using (public.is_ornova_staff()) with check (public.is_ornova_staff());

drop policy if exists "profiles_select_staff" on public.profiles;
create policy "profiles_select_staff" on public.profiles
  for select using (public.is_ornova_staff());

drop policy if exists "inquiry_items_select_staff" on public.inquiry_items;
create policy "inquiry_items_select_staff" on public.inquiry_items
  for select using (public.is_ornova_staff());

drop policy if exists "inquiry_files_select_staff" on public.inquiry_files;
create policy "inquiry_files_select_staff" on public.inquiry_files
  for select using (public.is_ornova_staff());

drop policy if exists "inquiry_messages_select_thread" on public.inquiry_messages;
create policy "inquiry_messages_select_thread" on public.inquiry_messages
  for select using (
    public.is_ornova_staff()
    or exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_messages.inquiry_id
        and inquiries.user_id = auth.uid()
    )
  );

drop policy if exists "inquiry_messages_insert_thread" on public.inquiry_messages;
create policy "inquiry_messages_insert_thread" on public.inquiry_messages
  for insert with check (
    author_user_id = auth.uid()
    and (
      (author_role = 'staff' and public.is_ornova_staff())
      or (
        author_role = 'customer'
        and exists (
          select 1 from public.inquiries
          where inquiries.id = inquiry_messages.inquiry_id
            and inquiries.user_id = auth.uid()
            and inquiries.status <> 'closed'
        )
      )
    )
  );

drop policy if exists "inquiry_events_select_thread" on public.inquiry_events;
create policy "inquiry_events_select_thread" on public.inquiry_events
  for select using (
    public.is_ornova_staff()
    or exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_events.inquiry_id
        and inquiries.user_id = auth.uid()
    )
  );

grant select, insert on public.inquiry_messages to authenticated;
grant select on public.inquiry_events to authenticated;
grant select on public.inquiries to authenticated;
revoke update on public.inquiries from authenticated;
grant update (status) on public.inquiries to authenticated;
grant select on public.profiles, public.inquiry_items, public.inquiry_files to authenticated;

drop policy if exists "private_files_select_staff" on storage.objects;
create policy "private_files_select_staff" on storage.objects
  for select using (bucket_id = 'ornova-private' and public.is_ornova_staff());

create or replace function public.touch_inquiry_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_touch_updated_at on public.inquiries;
create trigger inquiries_touch_updated_at
  before update on public.inquiries
  for each row execute function public.touch_inquiry_updated_at();

create or replace function public.record_inquiry_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.inquiry_events (inquiry_id, previous_status, status, actor_user_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.inquiry_events (inquiry_id, previous_status, status, actor_user_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- Give existing requests an honest starting point when this migration is first applied.
insert into public.inquiry_events (inquiry_id, previous_status, status, actor_user_id, created_at)
select inquiries.id, null, inquiries.status, null, inquiries.created_at
from public.inquiries
where not exists (
  select 1 from public.inquiry_events
  where inquiry_events.inquiry_id = inquiries.id
    and inquiry_events.previous_status is null
    and inquiry_events.created_at = inquiries.created_at
);

drop trigger if exists inquiries_record_status_event on public.inquiries;
create trigger inquiries_record_status_event
  after insert or update of status on public.inquiries
  for each row execute function public.record_inquiry_status_event();
