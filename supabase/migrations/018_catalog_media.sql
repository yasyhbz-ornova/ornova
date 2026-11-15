-- Public catalog images have a separate bucket. Customer and studio files remain private.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ornova-catalog', 'ornova-catalog', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy catalog_media_insert_staff on storage.objects
for insert to authenticated with check (
  bucket_id = 'ornova-catalog'
  and (select public.is_ornova_staff())
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
);

commit;
