import { notFound, redirect } from "next/navigation";
import { products } from "@/lib/constants/products";
import { getPublishedProducts } from "@/lib/catalog/public-products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await getPublishedProducts()).find((item) => item.slug === slug);

  if (!product) notFound();

  const isGalleryReady = product.publicationStatus === "published"
    && product.galleryPlacementVerified === true
    && Boolean(product.standImage);

  if (!isGalleryReady) redirect("/?galleryPanel=magazine");

  redirect(`/?galleryPanel=product&product=${encodeURIComponent(product.slug)}`);
}
