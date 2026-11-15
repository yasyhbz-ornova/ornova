begin;

create table public.studio_generations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  idea text not null check (char_length(btrim(idea)) between 3 and 1500),
  state text not null default 'generating' check (state in ('generating', 'ready', 'failed')),
  storage_path text,
  mime text check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  created_at timestamptz not null default now(),
  check ((state = 'ready' and storage_path is not null and mime is not null)
    or (state <> 'ready' and storage_path is null and mime is null)),
  check (storage_path is null or storage_path like user_id::text || '/' || id::text || '.%')
);
create index studio_generations_owner_created_idx on public.studio_generations(user_id, created_at desc);
alter table public.studio_generations enable row level security;
revoke all on public.studio_generations from public, anon, authenticated;
grant select on public.studio_generations to authenticated;
grant all on public.studio_generations to service_role;
create policy studio_generations_read on public.studio_generations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_ornova_staff()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('ornova-designs', 'ornova-designs', false, 10485760, array['image/png','image/jpeg','image/webp']);
-- Only the trusted server writes generated files. Customer credentials have no write policy.
create policy studio_images_read on storage.objects for select to authenticated using (
  bucket_id = 'ornova-designs' and exists (
    select 1 from public.studio_generations g where g.storage_path = name and g.state = 'ready'
      and (g.user_id = (select auth.uid()) or (select public.is_ornova_staff()))
  )
);

create function public.reserve_studio_generation(p_user_id uuid, p_request_id uuid, p_idea text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.studio_generations; inserted public.studio_generations;
begin
  if p_user_id is null or p_request_id is null or p_idea is null or char_length(btrim(p_idea)) not between 3 and 1500 then
    raise exception 'STUDIO_CONFLICT';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into existing from public.studio_generations where id = p_request_id;
  if found then
    if existing.user_id <> p_user_id or existing.idea <> btrim(p_idea) then raise exception 'STUDIO_CONFLICT'; end if;
    return jsonb_build_object('record', to_jsonb(existing), 'fresh', false);
  end if;
  if (select count(*) from public.studio_generations where user_id = p_user_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'STUDIO_QUOTA';
  end if;
  if exists (select 1 from public.studio_generations where user_id = p_user_id and state = 'generating' and created_at > now() - interval '3 minutes') then
    raise exception 'STUDIO_BUSY';
  end if;
  insert into public.studio_generations(id, user_id, idea) values (p_request_id, p_user_id, btrim(p_idea)) returning * into inserted;
  return jsonb_build_object('record', to_jsonb(inserted), 'fresh', true);
end;
$$;
revoke all on function public.reserve_studio_generation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_studio_generation(uuid, uuid, text) to service_role;

commit;
