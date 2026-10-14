-- ORNOVA core schema. Apply through Supabase migrations only.
-- Customer files remain private; do not create a public bucket.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'received' check (status in ('received', 'reviewing', 'needs_info', 'quoted', 'approved', 'closed')),
  message text not null,
  contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inquiry_files (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;
alter table public.inquiry_files enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "inquiries_select_own" on public.inquiries for select using (auth.uid() = user_id);
create policy "inquiries_insert_own" on public.inquiries for insert with check (auth.uid() = user_id);
create policy "inquiries_update_own" on public.inquiries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "inquiry_items_select_own" on public.inquiry_items for select using (
  exists (select 1 from public.inquiries where inquiries.id = inquiry_items.inquiry_id and inquiries.user_id = auth.uid())
);
create policy "inquiry_items_insert_own" on public.inquiry_items for insert with check (
  exists (select 1 from public.inquiries where inquiries.id = inquiry_items.inquiry_id and inquiries.user_id = auth.uid())
);

create policy "inquiry_files_select_own" on public.inquiry_files for select using (
  exists (select 1 from public.inquiries where inquiries.id = inquiry_files.inquiry_id and inquiries.user_id = auth.uid())
);
create policy "inquiry_files_insert_own" on public.inquiry_files for insert with check (
  exists (select 1 from public.inquiries where inquiries.id = inquiry_files.inquiry_id and inquiries.user_id = auth.uid())
);

-- Private customer storage. Files are readable only by their owner through signed access.
insert into storage.buckets (id, name, public) values ('ornova-private', 'ornova-private', false)
on conflict (id) do update set public = false;

create policy "private_files_select_own" on storage.objects for select using (
  bucket_id = 'ornova-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "private_files_insert_own" on storage.objects for insert with check (
  bucket_id = 'ornova-private' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "private_files_delete_own" on storage.objects for delete using (
  bucket_id = 'ornova-private' and (storage.foldername(name))[1] = auth.uid()::text
);
