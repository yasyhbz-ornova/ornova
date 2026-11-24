-- Restore two confirmed details omitted by the initial catalog import.
-- Source: docs/ORNOVA_VIRTUAL_GALLERY_DESIGN.md, "داده‌ی قابل‌نمایش برای سه محصول واقعیِ فعلی".
begin;

with confirmed(slug, image_path, stand_image_path, detail) as (
  values
    (
      'lajvard-shab-ring',
      '/images/ornova/lajvard-shab-01.jpg',
      '/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp',
      '{"label":"رنگ سنگ","value":"آبی شبانه"}'::jsonb
    ),
    (
      'silent-vase-pin',
      '/images/ornova/goldan-khamoosh-01.jpg',
      '/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp',
      '{"label":"سنگ","value":"بدون سنگ"}'::jsonb
    )
)
update public.catalog_products as product
set details = product.details || jsonb_build_array(confirmed.detail),
    revision = product.revision + 1,
    updated_at = now()
from confirmed
where product.slug = confirmed.slug
  and product.status = 'published'
  and product.gallery_placement_verified
  and product.revision = 1
  and product.image_path = confirmed.image_path
  and product.stand_image_path = confirmed.stand_image_path
  and product.details = '[{"label":"جنس","value":"نقره"}]'::jsonb;

commit;
