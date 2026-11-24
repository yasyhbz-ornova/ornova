import type { CatalogProductInput } from "./product-input";
import type { GalleryRender } from "../constants/gallery-renders";
import { resolveCatalogSelection } from "../constants/catalog";
import { galleryTrayCutout } from "../constants/gallery-tray-cutouts";

type PhotoOwner = Pick<CatalogProductInput, "slug" | "name" | "image_path" | "stand_image_path" | "gallery">;

export function reviewCatalogPhotos(photos: readonly GalleryRender[], works: readonly PhotoOwner[]) {
  const readyByNumber = new Map(photos.filter((photo) => photo.status === "ready").map((photo) => [photo.number, photo.src]));
  const canonicalPaths = new Map<string, string>();
  for (const photo of photos) {
    const canonical = photo.duplicateOf && readyByNumber.get(photo.duplicateOf);
    if (photo.status === "duplicate" && canonical) canonicalPaths.set(photo.src, canonical);
    const cutout = photo.status === "ready" && galleryTrayCutout(photo);
    if (cutout) canonicalPaths.set(cutout.src, photo.src);
  }
  const claims = new Map<string, { slug: string; name: string }[]>();
  for (const work of works) {
    const paths = new Set([work.image_path, work.stand_image_path, ...work.gallery.map(({ src }) => src)]);
    for (const path of paths) {
      if (!path) continue;
      const canonical = canonicalPaths.get(path) ?? path;
      const owners = claims.get(canonical) ?? [];
      if (!owners.some(({ slug }) => slug === work.slug)) owners.push({ slug: work.slug, name: work.name });
      claims.set(canonical, owners);
    }
  }
  const available: GalleryRender[] = [];
  const assigned: { photo: GalleryRender; owners: { slug: string; name: string }[] }[] = [];
  const excluded: GalleryRender[] = [];
  for (const photo of photos) {
    const owners = claims.get(photo.src);
    if (photo.status !== "ready" || !photo.categoryId) excluded.push(photo);
    else if (owners) assigned.push({ photo, owners });
    else available.push(photo);
  }
  return { available, assigned, excluded };
}

export function appendCatalogPhotoView(form: CatalogProductInput, photo: GalleryRender): CatalogProductInput | null {
  if (photo.status !== "ready" || !form.slug.trim() || photo.categoryId !== form.category_id
    || form.gallery.length >= 12 || form.gallery.some(({ src }) => src === photo.src)) return null;
  return { ...form, gallery: [...form.gallery, { src: photo.src, alt: photo.title }] };
}

/** Start a review record from the exact supplied photo, without claiming it is sale-ready. */
export function draftCatalogFormFromPhoto(photo: GalleryRender): CatalogProductInput | null {
  if (photo.status !== "ready") return null;
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
    stand_image_path: galleryTrayCutout(photo)?.src ?? null,
    gallery: [{ src: photo.src, alt: photo.title }],
    details: [],
    packaging_gallery: [],
    turntable_video_path: null,
    image_fit: "contain",
    gallery_placement_verified: false,
    status: "review",
  };
}
