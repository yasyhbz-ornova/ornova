import type { CatalogCategoryId } from "./catalog";
import type { Product } from "./products";
import { galleryRenders } from "./gallery-renders";

/** Measured blue stand silhouettes in the owner's final photographs (source pixels).
 * The original renders stay intact; the scene masks them to the matching empty stand.
 * These coordinates describe display composition, not physical sizes.
 */
const measuredBounds: Record<string, readonly [number, number, number, number]> = {
  "01": [50, 84, 561, 861], "02": [50, 84, 561, 863], "03": [50, 84, 569, 859],
  "04": [50, 84, 893, 439], "05": [50, 100, 907, 451],
  "07": [50, 84, 563, 863],
  "08": [50, 84, 569, 819], "09": [50, 84, 569, 817],
  "10": [50, 84, 567, 865], "11": [50, 84, 567, 865], "12": [50, 84, 569, 865],
  "13": [50, 84, 571, 867], "14": [50, 84, 577, 867],
  "15": [50, 80, 909, 457], "16": [48, 88, 625, 965], "17": [48, 88, 625, 965],
  "18": [50, 84, 569, 863], "19": [50, 86, 893, 431], "20": [50, 84, 893, 553],
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
  rings: "05", "brooches-pins": "01", earrings: "03",
  "jewelry-sets": "40", pendants: "08", bracelets: "45",
};

export const galleryRoomSamples = galleryRenders
  // The owner's original 04 and 19 ring photos end inside the jewelry itself.
  // Keep their files intact, but do not rotate cropped pieces into the room display.
  .filter((render) => render.status === "ready" && render.categoryId && measuredBounds[render.number]
    && !(render.categoryId === "rings" && (render.number === "04" || render.number === "19")))
  .map((render) => ({
    number: render.number,
    title: render.title,
    categoryId: render.categoryId as CatalogCategoryId,
    src: render.src,
    image: [render.width, render.height] as const,
    bounds: measuredBounds[render.number],
  }));

export type GalleryRoomSample = (typeof galleryRoomSamples)[number] & { productSlug?: string };

export const galleryRoomSamplesByCategory = Object.fromEntries(
  (["rings", "brooches-pins", "earrings", "jewelry-sets", "pendants", "bracelets"] as const).map((categoryId) => [
    categoryId,
    galleryRoomSamples.filter((sample) => sample.categoryId === categoryId)
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
    if (!samples || product.publicationStatus !== "published" || !product.galleryPlacementVerified || !placement
      || !product.standImage || placement.src !== product.standImage || samples.some((sample) => sample.src === placement.src)) continue;
    samples.push({ number: `catalog:${product.slug}`, title: product.name, categoryId: product.categoryId,
      src: placement.src, image: placement.image, bounds: placement.bounds, productSlug: product.slug });
  }
  return result;
}
