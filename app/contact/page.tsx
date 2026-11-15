import { redirect } from "next/navigation";
import { getPublishedProducts } from "@/lib/catalog/public-products";
import { createPageMetadata } from "@/lib/seo/page-metadata";
import { REQUEST_LINE_ID_PATTERN } from "@/lib/commerce/request-basket";

export const metadata = createPageMetadata({
  title: "ارتباط با Ornova | Ornova by Yas",
  description: "برای سفارش طراحی اختصاصی یا پرسش درباره قطعات نقره Ornova با ما در ارتباط باشید.",
  canonical: "/contact",
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string; selection?: string | string[]; from?: string; intent?: string; withoutDraft?: string }> }) {
  const { product: productSlug, selection, from, intent, withoutDraft } = await searchParams;
  const candidate = typeof productSlug === "string" ? (await getPublishedProducts()).find((item) => item.slug === productSlug) : undefined;
  const product = candidate?.publicationStatus === "published" && candidate.galleryPlacementVerified === true && candidate.standImage ? candidate : undefined;
  const selectionValue = typeof selection === "string" ? selection : undefined;
  const productSelectionKey = !product || selection === undefined
    ? undefined
    : selectionValue === product.slug || (selectionValue && REQUEST_LINE_ID_PATTERN.test(selectionValue))
      ? selectionValue
      : "invalid-selection";
  const sourceContext = from === "custom-design" || from === "ring-builder" ? from : undefined;
  const requestBasketContext = from === "request-basket";
  const productIntent = product && (intent === "price" || intent === "question") ? intent : undefined;
  const params = new URLSearchParams({ galleryPanel: "contact" });
  if (product) params.set("product", product.slug);
  if (productSelectionKey) params.set("selection", productSelectionKey);
  if (sourceContext) params.set("from", sourceContext);
  else if (requestBasketContext) params.set("from", "request-basket");
  if (productIntent) params.set("intent", productIntent);
  if (sourceContext === "ring-builder" && withoutDraft === "1") params.set("withoutDraft", "1");
  redirect(`/?${params.toString()}`);
}
