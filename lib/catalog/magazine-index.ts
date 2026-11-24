import { catalogCategories, filterCatalogProducts } from "../constants/catalog";
import { findGalleryBirthMonth } from "../constants/collections";
import { trayVisibleShowcaseEntries } from "../constants/gallery-room-samples";
import type { Product } from "../constants/products";

export type MagazineFilters = { query: string; category: string; collection: string };
export const emptyMagazineFilters: MagazineFilters = { query: "", category: "", collection: "" };

export function buildMagazineIndex(products: readonly Product[]) {
  const entries = trayVisibleShowcaseEntries(products);
  return catalogCategories.flatMap((category) => (entries[category.id] ?? []).map(({ product, sample }) => {
    const image = product?.standImage ?? sample?.trayImage;
    const archive = product ? undefined : sample;
    const id = product?.slug ?? archive?.number;
    if (!image || !id) return null;
    const month = sample && findGalleryBirthMonth(sample);
    const fibonacci = Boolean(sample && (month?.flowerImage?.number === sample.number || sample.title.includes("فیبوناچی")));
    return {
      id,
      name: product?.name ?? archive?.title ?? "",
      categoryId: category.id,
      category: category.label,
      subtypeId: product?.subtypeId,
      description: [product?.description, month?.name, month && "ماه‌های تولد", fibonacci && "فیبوناچی"].filter(Boolean).join(" "),
      collections: [month && "birth-months", fibonacci && "fibonacci-birth-month"].filter(Boolean),
      image,
      product,
      archive,
    };
  })).filter((work) => work !== null);
}

export function findMagazineWorks(index: ReturnType<typeof buildMagazineIndex>, filters: MagazineFilters) {
  return filterCatalogProducts(index, filters.category || undefined, undefined, filters.query)
    .filter((work) => !filters.collection || work.collections.includes(filters.collection));
}
