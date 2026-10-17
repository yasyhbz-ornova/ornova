import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/lib/constants/products";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Ornova by Yas`,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: { title: product.name, description: product.description, images: [product.image] },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `https://ornova.ir${product.image}`,
    category: product.category,
    brand: { "@type": "Brand", name: "Ornova by Yas" },
    url: `https://ornova.ir/shop/${product.slug}`,
  };

  return (
    <div className="product-sheet mx-auto max-w-6xl px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Link href="/shop" className="product-back text-sm text-sapphire">بازگشت به آرشیو</Link>
      <section className="mt-9 grid gap-12 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div className="md:order-2">
          <p className="ritual-label">{product.category} / پروندهٔ قطعه</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-graphite md:text-5xl">{product.name}</h1>
          <p className="mt-6 max-w-xl text-lg leading-9 text-graphite/75">{product.description}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="درخواست قیمت" />
            <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} />
            <Link href="/contact" className="product-question">پرسش درباره محصول</Link>
          </div>
        </div>

        <div className="md:order-1">
          <div className="product-sheet-image relative aspect-[4/5] overflow-hidden border border-silver bg-navy">
            <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
          </div>
        </div>
      </section>

      <section className="product-details mt-14 border-t border-silver pt-8">
        <h2 className="text-xl font-semibold text-graphite">جزئیات قطعه</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {product.details.map((detail) => (
            <div key={detail.label} className="product-detail-item border-b border-silver/70 pb-4">
              <p className="text-xs text-sapphire">{detail.label}</p>
              <p className="mt-2 text-sm leading-7 text-graphite/78">{detail.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
