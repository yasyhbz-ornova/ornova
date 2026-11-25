import { OrnovaHome } from "@/components/ornova/OrnovaHome";
import { createPageMetadata } from "@/lib/seo/page-metadata";
import { getStudioImageMode } from "@/lib/studio/availability";
import { getPublishedProducts } from "@/lib/catalog/public-products";
import { isStudioId } from "@/lib/studio/conversation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = createPageMetadata({
  title: "جهان نقرهٔ یاس | Ornova by Yas",
  description: "جواهرات نقره با طراحی دیجیتال؛ قطعاتی برای خاطره‌ها و نشانه‌های شخصی.",
  canonical: "/",
  image: {
    url: "/images/ornova/lajvard-shab-03.png",
    alt: "انگشتر نقره «لاجورد شب» روی دست، در نور آرام و زمینه‌ی تیره",
  },
});

async function getStudioDraftOwner() {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    return error ? null : user?.id ?? null;
  } catch { return null; }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ galleryPanel?: string; draft?: string }> }) {
  const { galleryPanel, draft } = await searchParams;
  const studioContinuation = galleryPanel === "studio" && isStudioId(draft);
  const [galleryProducts, studioDraftOwner] = await Promise.all([
    getPublishedProducts(AbortSignal.timeout(4_000)).catch(() => {
      console.warn("ORNOVA gallery: public catalog unavailable, showing the archive.");
      return null;
    }),
    studioContinuation ? getStudioDraftOwner() : null,
  ]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ornova by Yas",
    url: "https://ornova.ir",
    description: "طراحی دیجیتال و قابل ساخت جواهرات نقره برای خاطره‌ها و نشانه‌های شخصی.",
  };

  return <><OrnovaHome imageMode={getStudioImageMode()} galleryProducts={galleryProducts ?? []} catalogUnavailable={galleryProducts === null} studioDraftOwner={studioDraftOwner} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></>;
}
