import type { CatalogProductInput } from "./product-input";
import type { GalleryRender } from "../constants/gallery-renders";
import { resolveCatalogSelection } from "../constants/catalog";

/** Start a review record from the exact supplied photo, without claiming it is sale-ready. */
export function draftCatalogFormFromPhoto(photo: GalleryRender): CatalogProductInput | null {
  const category = resolveCatalogSelection(photo.categoryId, null).category;
  if (!category) return null;
  return {
    slug: `ornova-gallery-${photo.number}`,
    revision: 0,
    name: photo.title,
    category_id: category.id,
    category_label: category.label,
    subtype_id: null,
    description: "",
    image_path: photo.src,
    stand_image_path: null,
    gallery: [{ src: photo.src, alt: photo.title }],
    details: [],
    packaging_gallery: [],
    turntable_video_path: null,
    image_fit: "contain",
    gallery_placement_verified: false,
    status: "review",
  };
}
