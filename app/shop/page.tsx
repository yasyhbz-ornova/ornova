import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { products } from "@/lib/constants/products";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";

export const metadata: Metadata = {
  title: "فروشگاه نقره | Ornova by Yas",
  description: "قطعات نقره Ornova با طراحی دیجیتال جواهر و امکان درخواست قیمت.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="max-w-2xl">
        <p className="text-sm text-sapphire">فروشگاه Ornova</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite md:text-5xl">کالکشن نقره</h1>
        <p className="mt-5 text-base leading-8 text-graphite/70">
          قطعاتی با طراحی دیجیتال جواهر، نگاه فنی و هنری، و امکان ارسال درخواست قیمت.
        </p>
      </div>

      <div className="mt-12 grid gap-7 md:grid-cols-3">
        {products.map((product) => (
          <article key={product.slug} className="group rounded-[30px] border border-silver bg-ivory-soft p-5 transition hover:border-sapphire">
            <Link href={`/shop/${product.slug}`}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-silver bg-navy">
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
            </div>
            <p className="mt-5 text-sm text-sapphire">{product.category}</p>
            <h2 className="mt-2 min-h-16 text-xl font-semibold leading-8 text-graphite">{product.name}</h2>
            </Link>
            <div className="mt-6 flex flex-wrap gap-3">
              <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="درخواست قیمت" />
              <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
