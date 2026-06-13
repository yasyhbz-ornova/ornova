import Link from "next/link";
import { products } from "@/lib/constants/products";

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
          <Link key={product.slug} href={`/shop/${product.slug}`} className="group rounded-[30px] border border-silver bg-ivory-soft p-5 transition hover:border-sapphire">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-silver bg-navy">
              <div className="absolute inset-5 rounded-[22px] border border-ivory/10" />
              <div className="absolute inset-x-8 bottom-9 h-24 rounded-full bg-graphite/35 blur-sm" />
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-[13px] border-silver/75" />
              <div className="absolute left-1/2 top-[38%] h-12 w-12 -translate-x-1/2 rounded-full bg-moon ring-4 ring-silver/25" />
              <div className="absolute right-7 top-7 h-14 w-14 rounded-full border border-moon/30" />
            </div>
            <p className="mt-5 text-sm text-sapphire">{product.category}</p>
            <h2 className="mt-2 min-h-16 text-xl font-semibold leading-8 text-graphite">{product.name}</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-sapphire px-4 py-2 text-sm text-ivory">درخواست قیمت</span>
              <span className="rounded-full border border-silver px-4 py-2 text-sm text-graphite">افزودن به سبد درخواست</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
