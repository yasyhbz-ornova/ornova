import { GalleryShowcaseConcept } from "@/components/ornova/GalleryShowcaseConcept";
import { getPublishedProducts } from "@/lib/catalog/public-products";
import { products as legacyProducts } from "@/lib/constants/products";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "پیش‌نمایش تعاملی گالری | Ornova by Yas",
  description: "آزمایش ویترین شش‌طبقه و میز نمایش آثار اُرنوا.",
  robots: { index: false, follow: false },
};

export default async function GalleryInteractiveConceptPage() {
  const catalog = await getPublishedProducts()
    .then((products) => ({ products, catalogUnavailable: false }))
    .catch(() => ({ products: legacyProducts, catalogUnavailable: true }));
  return <GalleryShowcaseConcept {...catalog} />;
}
