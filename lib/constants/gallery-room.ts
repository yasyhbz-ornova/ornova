import type { CatalogCategoryId } from "./catalog";

/** Coordinates belong to entry-six-empty-niches-v1.png (1672 × 941).
 * Display dimensions are compositional, not fabrication measurements.
 * Alpha bounds keep the visible base on the shelf, regardless of PNG padding.
 */
export const galleryRoomStands = [
  { id: "ring-display", categoryId: "rings", label: "انگشتر", x: 14.9, y: 49.8, shelf: 53.2, width: 6.8, asset: "02-ring-empty.webp", image: [1604, 981], bounds: [74, 95, 1456, 765] },
  { id: "brooch-display", categoryId: "brooches-pins", label: "سنجاق‌سینه", x: 24.9, y: 45, shelf: 53.2, width: 6.0, asset: "01-brooch-empty.webp", image: [1005, 1565], bounds: [71, 121, 869, 1328] },
  { id: "ear-display", categoryId: "earrings", label: "گوشواره", x: 34.1, y: 46.3, shelf: 53.2, width: 5.0, asset: "06-earrings-empty.webp", image: [1013, 1553], bounds: [71, 123, 868, 1318] },
  { id: "set-display", categoryId: "jewelry-sets", label: "نیم‌ست", x: 65.3, y: 45.8, shelf: 53.2, width: 5.2, asset: "05-half-set-empty.webp", image: [1016, 1548], bounds: [67, 123, 883, 1320] },
  { id: "pendant-display", categoryId: "pendants", label: "آویز گردنبند", x: 74.1, y: 46.3, shelf: 53.2, width: 5.3, asset: "03-fibonacci-empty.webp", image: [1032, 1524], bounds: [76, 125, 888, 1284] },
  { id: "bracelet-display", categoryId: "bracelets", label: "دستبند", x: 84.0, y: 49.1, shelf: 53.2, width: 7.2, asset: "04-bracelet-empty.webp", image: [1475, 1067], bounds: [64, 122, 1347, 836] },
] as const satisfies readonly {
  id: string; categoryId: CatalogCategoryId; label: string;
  x: number; y: number; shelf: number; width: number; asset: string;
  image: readonly [number, number]; bounds: readonly [number, number, number, number];
}[];

export type GalleryRoomStand = (typeof galleryRoomStands)[number];
