-- Optional private delivery/contact address fields for the authenticated profile.
-- Existing profiles RLS policies continue to scope all access to the owning user.

alter table public.profiles
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists address_line text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_province_length' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_province_length check (province is null or char_length(btrim(province)) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_city_length' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_city_length check (city is null or char_length(btrim(city)) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_postal_code_length' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_postal_code_length check (postal_code is null or char_length(btrim(postal_code)) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_address_line_length' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_address_line_length check (address_line is null or char_length(btrim(address_line)) <= 500);
  end if;
end;
$$;

comment on column public.profiles.province is 'Optional customer delivery address; private to the profile owner.';
comment on column public.profiles.city is 'Optional customer delivery address; private to the profile owner.';
comment on column public.profiles.postal_code is 'Optional customer postal code; private to the profile owner.';
comment on column public.profiles.address_line is 'Optional customer street address; private to the profile owner.';
