-- Keep customer-owned inquiry reads and thread access index-backed as the
-- private archive grows. The leading columns also cover the related foreign
-- keys used by account, admin, message, event, and file queries.
create index if not exists inquiries_user_created_idx
  on public.inquiries (user_id, created_at desc, id desc);
create index if not exists inquiry_items_inquiry_id_idx
  on public.inquiry_items (inquiry_id);
create index if not exists inquiry_files_inquiry_id_idx
  on public.inquiry_files (inquiry_id);
create index if not exists inquiry_messages_author_user_id_idx
  on public.inquiry_messages (author_user_id);
create index if not exists inquiry_events_actor_user_id_idx
  on public.inquiry_events (actor_user_id);

-- These security-definer functions already qualify table and auth references.
-- An empty search path further prevents object shadowing by caller-controlled
-- schemas while preserving access to PostgreSQL built-ins in pg_catalog.
alter function public.record_inquiry_status_event() set search_path = '';
alter function public.create_inquiry_with_items(text, text, text, jsonb) set search_path = '';

-- RLS helpers/constants are wrapped in scalar SELECTs so PostgreSQL can cache
-- them per statement rather than re-evaluating them for each candidate row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "inquiries_select_own" on public.inquiries;
create policy "inquiries_select_own" on public.inquiries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "inquiries_insert_own" on public.inquiries;
create policy "inquiries_insert_own" on public.inquiries
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'received');

drop policy if exists "inquiries_select_staff" on public.inquiries;
create policy "inquiries_select_staff" on public.inquiries
  for select to authenticated using ((select public.is_ornova_staff()));

drop policy if exists "inquiries_update_staff" on public.inquiries;
create policy "inquiries_update_staff" on public.inquiries
  for update to authenticated
  using ((select public.is_ornova_staff()))
  with check ((select public.is_ornova_staff()));

drop policy if exists "inquiry_items_select_own" on public.inquiry_items;
create policy "inquiry_items_select_own" on public.inquiry_items
  for select to authenticated using (
    exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_items.inquiry_id
        and inquiries.user_id = (select auth.uid())
    )
  );

drop policy if exists "inquiry_items_select_staff" on public.inquiry_items;
create policy "inquiry_items_select_staff" on public.inquiry_items
  for select to authenticated using ((select public.is_ornova_staff()));

drop policy if exists "inquiry_files_select_own" on public.inquiry_files;
create policy "inquiry_files_select_own" on public.inquiry_files
  for select to authenticated using (
    exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_files.inquiry_id
        and inquiries.user_id = (select auth.uid())
    )
  );

drop policy if exists "inquiry_files_select_staff" on public.inquiry_files;
create policy "inquiry_files_select_staff" on public.inquiry_files
  for select to authenticated using ((select public.is_ornova_staff()));

drop policy if exists "inquiry_messages_select_thread" on public.inquiry_messages;
create policy "inquiry_messages_select_thread" on public.inquiry_messages
  for select to authenticated using (
    (select public.is_ornova_staff())
    or exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_messages.inquiry_id
        and inquiries.user_id = (select auth.uid())
    )
  );

drop policy if exists "inquiry_messages_insert_thread" on public.inquiry_messages;
create policy "inquiry_messages_insert_thread" on public.inquiry_messages
  for insert to authenticated with check (
    author_user_id = (select auth.uid())
    and (
      (author_role = 'staff' and (select public.is_ornova_staff()))
      or (
        author_role = 'customer'
        and exists (
          select 1 from public.inquiries
          where inquiries.id = inquiry_messages.inquiry_id
            and inquiries.user_id = (select auth.uid())
            and inquiries.status <> 'closed'
        )
      )
    )
  );

drop policy if exists "inquiry_events_select_thread" on public.inquiry_events;
create policy "inquiry_events_select_thread" on public.inquiry_events
  for select to authenticated using (
    (select public.is_ornova_staff())
    or exists (
      select 1 from public.inquiries
      where inquiries.id = inquiry_events.inquiry_id
        and inquiries.user_id = (select auth.uid())
    )
  );

drop policy if exists "private_files_select_own" on storage.objects;
create policy "private_files_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'ornova-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "private_files_select_staff" on storage.objects;
create policy "private_files_select_staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'ornova-private'
    and (select public.is_ornova_staff())
  );

revoke all on function public.is_ornova_staff() from public, anon;
grant execute on function public.is_ornova_staff() to authenticated;
