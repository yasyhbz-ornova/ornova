-- A reviewed crop of an original stand photograph can join its category's room rotation.
-- Coordinates are source pixels and are bound to the exact catalog stand image path.
begin;

create function public.valid_catalog_room_placement(p_placement jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_value jsonb; v_iw integer; v_ih integer; v_x integer; v_y integer; v_w integer; v_h integer;
begin
  if p_placement is null then return true; end if;
  if pg_catalog.jsonb_typeof(p_placement) <> 'object'
    or p_placement - array['src','image','bounds'] <> '{}'::jsonb
    or not (p_placement ? 'src' and p_placement ? 'image' and p_placement ? 'bounds')
    or pg_catalog.jsonb_typeof(p_placement->'src') <> 'string'
    or pg_catalog.char_length(p_placement->>'src') > 240
    or (p_placement->>'src') !~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$'
    or pg_catalog.jsonb_typeof(p_placement->'image') <> 'array'
    or pg_catalog.jsonb_array_length(p_placement->'image') <> 2
    or pg_catalog.jsonb_typeof(p_placement->'bounds') <> 'array'
    or pg_catalog.jsonb_array_length(p_placement->'bounds') <> 4 then return false; end if;
  for v_value in select value from pg_catalog.jsonb_array_elements(p_placement->'image')
    union all select value from pg_catalog.jsonb_array_elements(p_placement->'bounds') loop
    if pg_catalog.jsonb_typeof(v_value) <> 'number' or v_value::text !~ '^[0-9]{1,5}$' then return false; end if;
  end loop;
  v_iw := (p_placement->'image'->>0)::integer; v_ih := (p_placement->'image'->>1)::integer;
  v_x := (p_placement->'bounds'->>0)::integer; v_y := (p_placement->'bounds'->>1)::integer;
  v_w := (p_placement->'bounds'->>2)::integer; v_h := (p_placement->'bounds'->>3)::integer;
  return v_iw between 100 and 6000 and v_ih between 100 and 6000
    and v_x >= 0 and v_y >= 0 and v_w >= 50 and v_h >= 50
    and v_x + v_w <= v_iw and v_y + v_h <= v_ih;
exception when others then return false;
end;
$$;

alter table public.catalog_products add column room_placement jsonb;
alter table public.catalog_products add constraint catalog_room_placement_valid
  check (public.valid_catalog_room_placement(room_placement)
    and (room_placement is null or (room_placement->>'src' = stand_image_path
      and category_id in ('rings','brooches-pins','earrings','jewelry-sets','pendants','bracelets'))));
create unique index catalog_room_placement_src_unique_idx on public.catalog_products ((room_placement->>'src')) where room_placement is not null;

create function public.reset_catalog_room_placement() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stand_image_path is distinct from old.stand_image_path
    or new.category_id is distinct from old.category_id then new.room_placement := null; end if;
  return new;
end;
$$;
create trigger reset_catalog_room_placement_before_image_change
before update of stand_image_path,category_id on public.catalog_products
for each row execute function public.reset_catalog_room_placement();

create function public.save_catalog_room_placement(p_slug text,p_revision integer,p_placement jsonb)
returns public.catalog_products language plpgsql security definer set search_path = '' as $$
declare v_row public.catalog_products;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'CATALOG_FORBIDDEN' using errcode='42501'; end if;
  if p_slug is null or p_revision is null or p_revision < 1
    or not public.valid_catalog_room_placement(p_placement) then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  update public.catalog_products set room_placement=p_placement,revision=revision+1,updated_at=now(),updated_by=auth.uid()
    where slug=p_slug and revision=p_revision
      and (p_placement is null or (stand_image_path=p_placement->>'src'
        and gallery_placement_verified
        and category_id in ('rings','brooches-pins','earrings','jewelry-sets','pendants','bracelets')))
    returning * into v_row;
  if v_row.slug is null then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  return v_row;
end;
$$;
revoke all on function public.valid_catalog_room_placement(jsonb), public.reset_catalog_room_placement(), public.save_catalog_room_placement(text,integer,jsonb) from public,anon;
grant execute on function public.save_catalog_room_placement(text,integer,jsonb) to authenticated;
commit;
