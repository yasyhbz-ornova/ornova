import { OrnovaHome } from "@/components/ornova/OrnovaHome";
import { createPageMetadata } from "@/lib/seo/page-metadata";
import { getStudioImageMode } from "@/lib/studio/availability";
import { getPublishedProducts } from "@/lib/catalog/public-products";

export const metadata = createPageMetadata({
  title: "جهان نقرهٔ یاس | Ornova by Yas",
  description: "جواهرات نقره با طراحی دیجیتال؛ قطعاتی برای خاطره‌ها و نشانه‌های شخصی.",
  canonical: "/",
  image: {
    url: "/images/ornova/lajvard-shab-03.png",
    alt: "انگشتر نقره «لاجورد شب» روی دست، در نور آرام و زمینه‌ی تیره",
  },
});

export default async function Home() {
  const galleryProducts = await getPublishedProducts();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ornova by Yas",
    url: "https://ornova.ir",
    description: "طراحی دیجیتال و قابل ساخت جواهرات نقره برای خاطره‌ها و نشانه‌های شخصی.",
  };

  return <><OrnovaHome imageMode={getStudioImageMode()} galleryProducts={galleryProducts} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></>;
}
