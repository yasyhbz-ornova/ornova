-- Catalog is the authority for public publication and new request snapshots.
-- Apply after 016. Existing inquiry_items remain immutable name snapshots.
begin;

create table public.catalog_products (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category_id text not null check (category_id in ('rings','earrings','necklaces','pendants','chains','bracelets','bangles','anklets','body-jewelry','brooches-pins','charms','hair-accessories','formal-accessories','utility-accessories','keepsakes','jewelry-sets')),
  category_label text not null check (char_length(btrim(category_label)) between 1 and 100),
  subtype_id text check (subtype_id is null or subtype_id ~ '^[a-z][a-z0-9-]{1,60}$'),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  image_path text,
  stand_image_path text,
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 12),
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array' and jsonb_array_length(details) <= 20),
  packaging_gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(packaging_gallery) = 'array' and jsonb_array_length(packaging_gallery) <= 8),
  turntable_video_path text,
  image_fit text not null default 'contain' check (image_fit in ('contain','cover')),
  gallery_placement_verified boolean not null default false,
  status text not null default 'review' check (status in ('review','published','archived')),
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_publication_ready check (status <> 'published' or (gallery_placement_verified and image_path is not null and stand_image_path is not null and jsonb_array_length(gallery) > 0)),
  constraint catalog_image_local check (image_path is null or image_path ~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$'),
  constraint catalog_stand_local check (stand_image_path is null or stand_image_path ~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$'),
  constraint catalog_video_local check (turntable_video_path is null or turntable_video_path ~ '^/images/ornova/[a-zA-Z0-9/_-]+\.(webm|mp4)$')
);
create index catalog_published_category_idx on public.catalog_products (category_id,slug) where status = 'published';
alter table public.catalog_products enable row level security;
create policy catalog_public_select on public.catalog_products for select to anon,authenticated using (status = 'published');
create policy catalog_staff_select on public.catalog_products for select to authenticated using ((select public.is_ornova_staff()));
revoke all on public.catalog_products from public,anon,authenticated;
grant select on public.catalog_products to anon,authenticated;

insert into public.catalog_products (slug,name,category_id,category_label,description,image_path,stand_image_path,gallery,details,gallery_placement_verified,status) values
('lajvard-shab-ring','انگشتر نقره «لاجورد شب»','rings','انگشتر','انگشتری با قاب نقره و رنگ آبی شبانه؛ طراحی‌ای آرام برای خاطره‌ای نزدیک.','/images/ornova/lajvard-shab-01.jpg','/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp','[{"src":"/images/ornova/lajvard-shab-01.jpg","alt":"انگشتر لاجورد شب روی دست"}]'::jsonb,'[{"label":"جنس","value":"نقره"}]'::jsonb,true,'published'),
('silent-vase-pin','سنجاق سینه نقره «گلدان خاموش»','brooches-pins','سنجاق سینه','سنجاقی ظریف با حجم آرام و نقره‌ای.','/images/ornova/goldan-khamoosh-01.jpg','/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp','[{"src":"/images/ornova/goldan-khamoosh-01.jpg","alt":"سنجاق سینه گلدان خاموش"}]'::jsonb,'[{"label":"جنس","value":"نقره"}]'::jsonb,true,'published'),
('sepid-brooch','بروچ نقره «سپید»','brooches-pins','بروچ','بروچی روشن و مینیمال از نقره.','/images/ornova/sepid-brooch-01.png','/images/ornova/gallery/products/sepid-brooch-stand-cutout-preview-v1.webp','[{"src":"/images/ornova/sepid-brooch-01.png","alt":"بروچ سپید"}]'::jsonb,'[{"label":"جنس","value":"نقره"}]'::jsonb,true,'published');

-- Optimistic revision and trusted app_metadata are checked inside the write transaction.
create function public.save_catalog_product(p_slug text,p_revision integer,p_product jsonb)
returns public.catalog_products language plpgsql security definer set search_path = '' as $$
declare v_row public.catalog_products; v_status text; v_path text; v_entry jsonb; v_field text;
begin
  if auth.uid() is null or not public.is_ornova_staff() then raise exception 'CATALOG_FORBIDDEN' using errcode='42501'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$' or p_revision is null or p_revision < 0 then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
  if p_product is null or jsonb_typeof(p_product) <> 'object' or p_product - array['name','category_id','category_label','subtype_id','description','image_path','stand_image_path','gallery','details','packaging_gallery','turntable_video_path','image_fit','gallery_placement_verified','status'] <> '{}'::jsonb then raise exception 'CATALOG_INVALID' using errcode='22023'; end if;
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
    insert into public.catalog_products(slug,name,category_id,category_label,subtype_id,description,image_path,stand_image_path,gallery,details,packaging_gallery,turntable_video_path,image_fit,gallery_placement_verified,status,created_by,updated_by)
    values(p_slug,p_product->>'name',p_product->>'category_id',p_product->>'category_label',p_product->>'subtype_id',p_product->>'description',p_product->>'image_path',p_product->>'stand_image_path',p_product->'gallery',p_product->'details',p_product->'packaging_gallery',p_product->>'turntable_video_path',p_product->>'image_fit',(p_product->>'gallery_placement_verified')::boolean,v_status,auth.uid(),auth.uid())
    on conflict(slug) do nothing returning * into v_row;
  else
    update public.catalog_products set name=p_product->>'name',category_id=p_product->>'category_id',category_label=p_product->>'category_label',subtype_id=p_product->>'subtype_id',description=p_product->>'description',image_path=p_product->>'image_path',stand_image_path=p_product->>'stand_image_path',gallery=p_product->'gallery',details=p_product->'details',packaging_gallery=p_product->'packaging_gallery',turntable_video_path=p_product->>'turntable_video_path',image_fit=p_product->>'image_fit',gallery_placement_verified=(p_product->>'gallery_placement_verified')::boolean,status=v_status,revision=revision+1,updated_at=now(),updated_by=auth.uid()
    where slug=p_slug and revision=p_revision returning * into v_row;
  end if;
  if v_row.slug is null then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  return v_row;
end;
$$;
revoke all on function public.save_catalog_product(text,integer,jsonb) from public,anon;
grant execute on function public.save_catalog_product(text,integer,jsonb) to authenticated;

-- The old constraint listed one ring slug; the replacement checks the current category.
alter table public.inquiry_items drop constraint if exists inquiry_items_preferences_valid;
alter table public.inquiry_items add constraint inquiry_items_preferences_valid check (public.valid_product_preferences(preferences));
create function public.catalog_inquiry_item_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_category text;
begin
  if new.preferences ? 'ring_size_eu' then
    select category_id into v_category from public.catalog_products where slug=new.product_slug;
    if v_category is distinct from 'rings' then raise exception 'ring size requires a ring' using errcode='22023'; end if;
  end if;
  return new;
end;
$$;
create trigger catalog_inquiry_item_guard before insert or update on public.inquiry_items for each row execute function public.catalog_inquiry_item_guard();

-- All three public entrypoints now preserve configured preferences and use one
-- transactional catalog lookup. Row locks prevent unpublishing mid-request.
create or replace function public.create_inquiry_with_configurations(p_customer_name text,p_message text,p_contact text,p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid:=auth.uid(); v_id uuid; v_item jsonb; v_slug text; v_quantity integer; v_prefs jsonb; v_norm jsonb; v_items jsonb:='[]'::jsonb; v_field text; v_text text; v_product public.catalog_products;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 80 or p_message is null or char_length(btrim(p_message)) not between 1 and 5000 or p_contact is null or char_length(btrim(p_contact)) not between 1 and 320 then raise exception 'invalid inquiry fields' using errcode='22023'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>50 then raise exception 'invalid inquiry items' using errcode='22023'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception 'invalid inquiry item' using errcode='22023'; end if;
    v_slug:=v_item->>'product_slug';
    select * into v_product from public.catalog_products where slug=v_slug and status='published' for share;
    if v_product.slug is null then raise exception 'invalid product' using errcode='22023'; end if;
    if jsonb_typeof(v_item->'quantity') is distinct from 'number' or (v_item->>'quantity') !~ '^([1-9]|1[0-9]|20)$' then raise exception 'invalid quantity' using errcode='22023'; end if;
    v_quantity:=(v_item->>'quantity')::integer;
    v_prefs:=v_item->'preferences';
    if not public.valid_product_preferences(v_prefs) then raise exception 'invalid product preferences' using errcode='22023'; end if;
    if v_prefs ? 'ring_size_eu' and v_product.category_id <> 'rings' then raise exception 'ring size requires a ring' using errcode='22023'; end if;
    v_norm:=jsonb_build_object('version',1);
    if v_prefs ? 'ring_size_eu' then v_norm:=v_norm||jsonb_build_object('ring_size_eu',v_prefs->'ring_size_eu'); end if;
    foreach v_field in array array['stone_note','dimensions_note','finish_note'] loop
      v_text:=nullif(btrim(replace(replace(v_prefs->>v_field,E'\r\n',E'\n'),E'\r',E'\n'),E' \t\n\r\f'),'');
      if v_text is not null then v_norm:=v_norm||jsonb_build_object(v_field,v_text); end if;
    end loop;
    if v_norm='{"version":1}'::jsonb then v_norm:=null; end if;
    v_items:=v_items||jsonb_build_array(jsonb_build_object('product_slug',v_slug,'product_name',v_product.name,'quantity',v_quantity)||case when v_norm is null then '{}'::jsonb else jsonb_build_object('preferences',v_norm) end);
  end loop;
  if exists(select 1 from jsonb_array_elements(v_items) item group by item->>'product_slug',coalesce(item->'preferences','{}'::jsonb) having count(*)>1) then raise exception 'duplicate inquiry configuration' using errcode='22023'; end if;
  insert into public.profiles(id,display_name) values(v_user_id,btrim(p_customer_name)) on conflict(id) do update set display_name=excluded.display_name,updated_at=now();
  insert into public.inquiries(user_id,customer_name,status,message,contact) values(v_user_id,btrim(p_customer_name),'received',btrim(p_message),btrim(p_contact)) returning id into v_id;
  insert into public.inquiry_items(inquiry_id,product_slug,product_name,quantity,preferences)
    select v_id,item->>'product_slug',item->>'product_name',(item->>'quantity')::integer,item->'preferences' from jsonb_array_elements(v_items) item;
  return v_id;
end;
$$;
create or replace function public.create_inquiry_with_items(p_customer_name text,p_message text,p_contact text,p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
begin return public.create_inquiry_with_configurations(p_customer_name,p_message,p_contact,p_items); end;
$$;
create or replace function public.create_inquiry_with_preferences(p_customer_name text,p_message text,p_contact text,p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
begin return public.create_inquiry_with_configurations(p_customer_name,p_message,p_contact,p_items); end;
$$;
revoke all on function public.create_inquiry_with_items(text,text,text,jsonb) from public,anon;
revoke all on function public.create_inquiry_with_preferences(text,text,text,jsonb) from public,anon;
revoke all on function public.create_inquiry_with_configurations(text,text,text,jsonb) from public,anon;
grant execute on function public.create_inquiry_with_items(text,text,text,jsonb),public.create_inquiry_with_preferences(text,text,text,jsonb),public.create_inquiry_with_configurations(text,text,text,jsonb) to authenticated;
commit;
