-- Optional customer-authored design preference for the private Ornova account.
-- Existing profiles RLS policies keep reads and writes scoped to auth.uid().

alter table public.profiles
  add column if not exists design_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_design_note_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_design_note_length
      check (design_note is null or char_length(btrim(design_note)) between 1 and 500);
  end if;
end;
$$;

comment on column public.profiles.design_note is
  'Optional customer-authored design preference; private to the customer and authorized Ornova staff.';
