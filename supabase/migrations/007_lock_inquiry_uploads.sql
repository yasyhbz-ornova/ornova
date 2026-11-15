-- Enforce the private upload constraints at Storage and row level, not only in
-- the Next.js route. Keep this bucket private and scoped to an existing request.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
where id = 'ornova-private';

-- Request items are written by create_inquiry_with_items() in one transaction.
-- Do not let a customer append or forge item rows after submission via REST.
drop policy if exists "inquiry_items_insert_own" on public.inquiry_items;
revoke insert on public.inquiry_items from anon, authenticated;

-- A Storage API upload must be nested under the uploader's existing inquiry.
drop policy if exists "private_files_insert_own" on storage.objects;
create policy "private_files_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ornova-private'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.inquiries
      where inquiries.id::text = (storage.foldername(name))[2]
        and inquiries.user_id = (select auth.uid())
    )
  );

-- A metadata row is valid only when the matching private object exists and its
-- Storage-reported MIME type and byte size agree with the row being inserted.
drop policy if exists "inquiry_files_insert_own" on public.inquiry_files;
create policy "inquiry_files_insert_own" on public.inquiry_files
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.inquiries
      where inquiries.id = inquiry_files.inquiry_id
        and inquiries.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from storage.objects
      where storage.objects.bucket_id = 'ornova-private'
        and storage.objects.name = inquiry_files.storage_path
        and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
        and storage.objects.metadata ->> 'mimetype' = inquiry_files.content_type
        and storage.objects.metadata ->> 'size' = inquiry_files.size_bytes::text
    )
  );
