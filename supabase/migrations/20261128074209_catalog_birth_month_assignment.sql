alter table public.catalog_products
  add column birth_month_id text,
  add constraint catalog_birth_month_slot_valid check (
    birth_month_id is null or (
      category_id in ('bracelets', 'jewelry-sets', 'pendants')
      and birth_month_id in (
        'farvardin', 'ordibehesht', 'khordad', 'tir', 'mordad', 'shahrivar',
        'mehr', 'aban', 'azar', 'dey', 'bahman', 'esfand'
      )
    )
  );

create unique index catalog_published_birth_month_slot_idx
  on public.catalog_products (category_id, birth_month_id)
  where status = 'published' and birth_month_id is not null;

-- Keep the staff authorization, existing validation, and optimistic revision check.
create or replace function public.save_catalog_product(p_slug text,p_revision integer,p_product jsonb)
returns public.catalog_products language plpgsql security definer set search_path = '' as $$
declare v_row public.catalog_products; v_status text; v_path text; v_entry jsonb; v_field text;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'CATALOG_FORBIDDEN' using errcode='42501'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$' or p_revision is null or p_revision < 0 then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  if p_product is null or jsonb_typeof(p_product) <> 'object' or p_product - array['name','category_id','category_label','subtype_id','description','image_path','stand_image_path','gallery','details','packaging_gallery','turntable_video_path','image_fit','gallery_placement_verified','status','birth_month_id'] <> '{}'::jsonb then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  if p_product ? 'birth_month_id' and jsonb_typeof(p_product->'birth_month_id') not in ('string','null') then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  v_status := p_product->>'status';
  if v_status not in ('review','published','archived') or jsonb_typeof(p_product->'gallery') <> 'array' or jsonb_typeof(p_product->'details') <> 'array' or jsonb_typeof(p_product->'packaging_gallery') <> 'array' then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  foreach v_field in array array['image_path','stand_image_path','turntable_video_path'] loop
    v_path := p_product->>v_field;
    if v_path is not null and (char_length(v_path)>240 or v_path !~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|webm|mp4)$') then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  end loop;
  for v_entry in select value from jsonb_array_elements(p_product->'gallery') loop
    if jsonb_typeof(v_entry)<>'object' or jsonb_typeof(v_entry->'src')<>'string' or (v_entry->>'src') !~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$' or jsonb_typeof(v_entry->'alt')<>'string' or char_length(v_entry->>'alt') not between 1 and 200 or v_entry-array['src','alt','label','notice']<>'{}'::jsonb then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  end loop;
  for v_entry in select value from jsonb_array_elements(p_product->'packaging_gallery') loop
    if jsonb_typeof(v_entry)<>'object' or jsonb_typeof(v_entry->'src')<>'string' or (v_entry->>'src') !~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$' or jsonb_typeof(v_entry->'alt')<>'string' or char_length(v_entry->>'alt') not between 1 and 200 or v_entry-array['src','alt','label']<>'{}'::jsonb then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  end loop;
  for v_entry in select value from jsonb_array_elements(p_product->'details') loop
    if jsonb_typeof(v_entry)<>'object' or jsonb_typeof(v_entry->'label')<>'string' or char_length(v_entry->>'label') not between 1 and 80 or jsonb_typeof(v_entry->'value')<>'string' or char_length(v_entry->>'value') not between 1 and 240 or v_entry-array['label','value']<>'{}'::jsonb then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  end loop;
  if p_revision=0 then
    insert into public.catalog_products(slug,name,category_id,category_label,subtype_id,description,image_path,stand_image_path,gallery,details,packaging_gallery,turntable_video_path,image_fit,gallery_placement_verified,status,birth_month_id,created_by,updated_by)
    values(p_slug,p_product->>'name',p_product->>'category_id',p_product->>'category_label',p_product->>'subtype_id',p_product->>'description',p_product->>'image_path',p_product->>'stand_image_path',p_product->'gallery',p_product->'details',p_product->'packaging_gallery',p_product->>'turntable_video_path',p_product->>'image_fit',(p_product->>'gallery_placement_verified')::boolean,v_status,p_product->>'birth_month_id',auth.uid(),auth.uid())
    on conflict(slug) do nothing returning * into v_row;
  else
    update public.catalog_products set name=p_product->>'name',category_id=p_product->>'category_id',category_label=p_product->>'category_label',subtype_id=p_product->>'subtype_id',description=p_product->>'description',image_path=p_product->>'image_path',stand_image_path=p_product->>'stand_image_path',gallery=p_product->'gallery',details=p_product->'details',packaging_gallery=p_product->'packaging_gallery',turntable_video_path=p_product->>'turntable_video_path',image_fit=p_product->>'image_fit',gallery_placement_verified=(p_product->>'gallery_placement_verified')::boolean,status=v_status,
      birth_month_id=case
        when p_product ? 'birth_month_id' then p_product->>'birth_month_id'
        when category_id = p_product->>'category_id' then birth_month_id
        else null
      end,
      revision=revision+1,updated_at=now(),updated_by=auth.uid()
    where slug=p_slug and revision=p_revision returning * into v_row;
  end if;
  if v_row.slug is null then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  return v_row;
end;
$$;
revoke all on function public.save_catalog_product(text,integer,jsonb) from public,anon;
grant execute on function public.save_catalog_product(text,integer,jsonb) to authenticated;
