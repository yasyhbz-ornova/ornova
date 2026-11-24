-- The owner identified the bare brooch in gallery photo 07 as the same work.
-- Replace only the original catalog entry. Existing inquiry snapshots keep their original values.
begin;

update public.catalog_products
set name = 'سنجاق‌سینهٔ نواری مشبک',
    description = 'سنجاق‌سینهٔ نواری با نقش مشبک و سطح صیقلی نقره.',
    image_path = '/images/ornova/gallery/final-renders/07-7d31d155.webp',
    stand_image_path = '/images/ornova/gallery/tray-cutouts/07-7d31d155.webp',
    gallery = '[{"src":"/images/ornova/gallery/final-renders/07-7d31d155.webp","alt":"سنجاق‌سینهٔ نواری مشبک روی مخمل آبی"}]'::jsonb,
    room_placement = null,
    revision = revision + 1,
    updated_at = now()
where slug = 'sepid-brooch'
  and status = 'published'
  and revision = 1
  and gallery_placement_verified
  and image_path = '/images/ornova/sepid-brooch-01.png'
  and stand_image_path = '/images/ornova/gallery/products/sepid-brooch-stand-cutout-preview-v1.webp';

commit;
