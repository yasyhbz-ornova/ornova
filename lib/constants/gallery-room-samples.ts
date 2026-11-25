import type { CatalogCategoryId } from "./catalog";
import type { Product } from "./products";
import { findGalleryProduct, isPublicGalleryProduct, isWithheldGalleryPhoto } from "../catalog/gallery-product-link";
import { visibleGalleryRenders, type GalleryRender } from "./gallery-renders";
import { galleryTrayCutout, galleryTrayWorkImage } from "./gallery-tray-cutouts";

/** Measured blue stand silhouettes in the owner's final photographs (source pixels).
 * The original renders stay intact; the scene masks them to the matching empty stand.
 * These coordinates describe display composition, not physical sizes.
 */
const measuredBounds: Record<string, readonly [number, number, number, number]> = {
  "01": [50, 84, 561, 861], "02": [50, 84, 561, 863], "03": [50, 84, 569, 859],
  "04": [50, 238, 894, 440], "05": [50, 100, 907, 451],
  "07": [50, 84, 563, 863],
  "08": [50, 84, 569, 819], "09": [50, 84, 569, 817],
  "10": [50, 84, 567, 865], "11": [50, 84, 567, 865], "12": [50, 84, 569, 865],
  "13": [50, 84, 571, 867], "14": [50, 84, 577, 867],
  "15": [50, 80, 909, 457], "16": [48, 88, 625, 965], "17": [48, 88, 625, 965],
  "18": [50, 84, 569, 863], "19": [50, 243, 894, 434], "20": [50, 84, 893, 553],
  "21": [50, 84, 573, 861], "22": [50, 84, 573, 859],
  "23": [50, 84, 569, 821], "24": [50, 84, 567, 821], "25": [50, 84, 569, 821],
  "26": [50, 84, 569, 821], "27": [50, 84, 569, 819], "28": [50, 84, 569, 821],
  "29": [50, 84, 569, 821], "30": [50, 84, 569, 819], "31": [50, 84, 569, 819],
  "32": [50, 84, 599, 861], "33": [50, 84, 577, 867], "34": [50, 84, 579, 869],
  "35": [50, 84, 581, 869], "36": [50, 84, 579, 867], "37": [50, 84, 581, 869],
  "38": [50, 84, 579, 869], "39": [50, 84, 579, 869], "40": [50, 84, 581, 869],
  "41": [50, 84, 577, 867], "42": [50, 84, 579, 869],
  "43": [50, 84, 895, 549], "44": [50, 84, 893, 549], "45": [50, 84, 895, 551],
  "46": [50, 84, 897, 553], "47": [50, 84, 895, 553], "48": [50, 84, 895, 551],
  "49": [50, 84, 895, 553], "50": [50, 84, 897, 551], "51": [50, 84, 895, 549],
  "52": [50, 84, 895, 551], "53": [50, 84, 895, 553],
};

const firstWork: Partial<Record<CatalogCategoryId, string>> = {
  rings: "05", "brooches-pins": "07", earrings: "03",
  "jewelry-sets": "40", pendants: "08", bracelets: "45",
};

export const galleryRoomSamples = visibleGalleryRenders
  .filter((render) => measuredBounds[render.number])
  .map((render) => {
    const cutout = galleryTrayCutout(render);
    return {
      number: render.number,
      title: render.title,
      categoryId: render.categoryId as CatalogCategoryId,
      src: render.src,
      ...(cutout && { trayImage: cutout.src }),
      image: [render.width, render.height] as const,
      bounds: measuredBounds[render.number],
    };
  });

export type GalleryRoomSample = (typeof galleryRoomSamples)[number] & { productSlug?: string };

export const galleryRoomSamplesByCategory = Object.fromEntries(
  (["rings", "brooches-pins", "earrings", "jewelry-sets", "pendants", "bracelets"] as const).map((categoryId) => [
    categoryId,
    galleryRoomSamples.filter((sample) => sample.categoryId === categoryId && !isWithheldGalleryPhoto(sample.src))
      .sort((a, b) => Number(b.number === firstWork[categoryId]) - Number(a.number === firstWork[categoryId])),
  ]),
) as Record<(typeof galleryRoomSamples)[number]["categoryId"], typeof galleryRoomSamples>;

/** Keep the approved photo sequence first; add only measured, reviewed catalog stand photos. */
export function roomSamplesWithCatalog(products: readonly Product[]): Record<string, GalleryRoomSample[]> {
  const result: Record<string, GalleryRoomSample[]> = Object.fromEntries(
    Object.entries(galleryRoomSamplesByCategory).map(([category, samples]) => [category, [...samples]]),
  );
  for (const product of [...products].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const placement = product.roomPlacement;
    const samples = result[product.categoryId];
    if (!samples || !isPublicGalleryProduct(product) || !placement
      || !product.standImage || placement.src !== product.standImage || samples.some((sample) => sample.src === placement.src)) continue;
    samples.push({ number: `catalog:${product.slug}`, title: product.name, categoryId: product.categoryId,
      src: placement.src, image: placement.image, bounds: placement.bounds, productSlug: product.slug });
  }
  return result;
}

type GalleryShowcaseEntry =
  | { product: Product; sample?: GalleryRoomSample }
  | { product: null; sample: GalleryRoomSample };

type GalleryShowcaseEntries = Partial<Record<CatalogCategoryId, GalleryShowcaseEntry[]>>;
export type GalleryShowcasePhoto = Pick<GalleryRender, "number" | "src" | "categoryId">;

export function showcaseEntryTrayImage({ product, sample }: GalleryShowcaseEntry) {
  return product?.standImage ? galleryTrayWorkImage(product.standImage) : sample?.trayImage;
}

export function galleryShowcaseEntries(products: readonly Product[]): GalleryShowcaseEntries {
  const entries: Partial<Record<CatalogCategoryId, GalleryShowcaseEntry[]>> = {};
  const archive: Partial<Record<CatalogCategoryId, GalleryShowcaseEntry[]>> = {};
  const selectedPhotos = new Map<string, GalleryRoomSample>();
  for (const samples of Object.values(roomSamplesWithCatalog(products))) {
    for (const sample of samples) {
      const linked = findGalleryProduct(products, sample);
      if (linked) {
        if (!selectedPhotos.has(linked.slug)) selectedPhotos.set(linked.slug, sample);
      } else if (!sample.productSlug) {
        (archive[sample.categoryId] ??= []).push({ product: null, sample });
      }
    }
  }
  for (const product of products.filter((item) => item.publicationStatus === "published").sort((a, b) => a.slug.localeCompare(b.slug))) {
    const sample = selectedPhotos.get(product.slug);
    (entries[product.categoryId] ??= []).push(sample ? { product, sample } : { product });
  }
  for (const category of Object.keys(archive) as CatalogCategoryId[]) {
    (entries[category] ??= []).push(...(archive[category] ?? []));
  }
  return entries;
}

export function findGalleryShowcasePhoto(entries: GalleryShowcaseEntries, photo: GalleryShowcasePhoto) {
  if (isWithheldGalleryPhoto(photo.src)) return null;
  const sample = galleryRoomSamples.find((source) =>
    source.number === photo.number && source.src === photo.src && source.categoryId === photo.categoryId,
  );
  if (!sample) return null;
  const items = entries[sample.categoryId] ?? [];
  const linked = findGalleryProduct(items.flatMap(({ product }) => product ? [product] : []), sample);
  const index = items.findIndex((item) => item.sample?.src === sample.src || (linked && item.product?.slug === linked.slug));
  return index < 0 ? null : { categoryId: sample.categoryId, index };
}

export function trayVisibleShowcaseEntries(products: readonly Product[]) {
  const entries = galleryShowcaseEntries(products);
  for (const category of Object.keys(entries) as CatalogCategoryId[]) {
    entries[category] = entries[category]?.filter(({ product }) =>
      !product || isPublicGalleryProduct(product),
    );
  }
  return entries;
}
