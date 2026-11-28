import type { CatalogProductInput } from "./product-input";

/** Keep database-only columns out of the strict catalog write contract. */
export function toCatalogForm(row: CatalogProductInput): CatalogProductInput {
  return {
    slug: row.slug, revision: row.revision, name: row.name, category_id: row.category_id,
    category_label: row.category_label, subtype_id: row.subtype_id, birth_month_id: row.birth_month_id, description: row.description,
    image_path: row.image_path, stand_image_path: row.stand_image_path,
    gallery: row.gallery.map((item) => ({ ...item })), details: row.details.map((item) => ({ ...item })),
    packaging_gallery: row.packaging_gallery.map((item) => ({ ...item })),
    turntable_video_path: row.turntable_video_path, image_fit: row.image_fit,
    gallery_placement_verified: row.gallery_placement_verified, status: row.status,
  };
}
