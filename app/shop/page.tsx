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
    <div className="shop-archive mx-auto max-w-6xl px-5 py-16">
      <div className="shop-archive-heading">
        <p className="ritual-label">آرشیو قطعات / Ornova by Yas</p>
        <h1>چیزهایی برای نزدیک ماندن.</h1>
        <p>قطعات نقره‌ای Ornova با طراحی دیجیتال جواهر؛ هرکدام یک فرم، یک نشانه و یک امکان برای همراه‌شدن.</p>
      </div>

      <div className="mt-12 grid gap-7 md:grid-cols-3">
        {products.map((product) => (
          <article key={product.slug} className="shop-archive-card group">
            <Link href={`/shop/${product.slug}`}>
            <div className="shop-archive-image relative aspect-[4/5] overflow-hidden border border-silver bg-navy">
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
            </div>
            <p className="mt-5 text-xs text-sapphire">{product.category}</p>
            <h2 className="mt-2 min-h-16 text-lg font-semibold leading-8 text-graphite">{product.name}</h2>
            </Link>
            <div className="mt-5 flex flex-wrap gap-3">
              <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="درخواست قیمت" />
              <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
