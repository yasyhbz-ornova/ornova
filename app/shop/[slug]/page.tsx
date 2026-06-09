import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/lib/constants/products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
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

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <Link href="/shop" className="text-sm text-sapphire">بازگشت به فروشگاه</Link>
      <section className="mt-8 grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div className="md:order-2">
          <p className="text-sm text-sapphire">{product.category}</p>
          <h1 className="mt-3 text-5xl font-semibold leading-tight text-graphite">{product.name}</h1>
          <p className="mt-6 max-w-xl text-lg leading-9 text-graphite/75">{product.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">درخواست قیمت</button>
            <button className="rounded-full border border-silver px-6 py-3 text-sm font-medium text-graphite">ثبت سفارش</button>
            <button className="rounded-full border border-silver px-6 py-3 text-sm font-medium text-graphite">پرسش درباره محصول</button>
          </div>
        </div>

        <div className="md:order-1">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[30px] border border-silver bg-navy p-8">
            <div className="absolute inset-x-10 bottom-12 h-28 rounded-full bg-graphite/35" />
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-silver/70" />
            <div className="absolute left-1/2 top-[38%] h-20 w-20 -translate-x-1/2 rounded-full bg-stone-lapis ring-4 ring-moon/80" />
            <div className="absolute right-8 top-8 text-sm text-ivory/60">Ornova product sheet</div>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-[28px] border border-silver bg-ivory-soft p-6">
        <h2 className="text-xl font-semibold text-graphite">جزئیات قطعه</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {product.details.map((detail) => (
            <div key={detail.label} className="rounded-[18px] border border-silver bg-ivory p-4">
              <p className="text-xs text-sapphire">{detail.label}</p>
              <p className="mt-2 text-sm leading-7 text-graphite/78">{detail.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
