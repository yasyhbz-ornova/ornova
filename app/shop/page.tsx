import Link from "next/link";
import { products } from "@/lib/constants/products";

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="max-w-2xl">
        <p className="text-sm text-sapphire">فروشگاه Ornova</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">جواهرات نقره</h1>
        <p className="mt-5 text-base leading-8 text-graphite/70">
          مجموعه‌ای کوچک از قطعات نقره با طراحی دیجیتال، آماده برای انتخاب و ارسال درخواست.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {products.map((product) => (
          <Link key={product.slug} href={`/shop/${product.slug}`} className="rounded-[24px] border border-silver bg-ivory-soft p-5 transition hover:border-sapphire">
            <div className="aspect-square rounded-[20px] border border-silver bg-silver-muted" />
            <p className="mt-5 text-sm text-sapphire">{product.category}</p>
            <h2 className="mt-2 text-lg font-semibold text-graphite">{product.name}</h2>
            <p className="mt-3 text-sm font-medium text-graphite">درخواست قیمت</p>
            <span className="mt-4 inline-flex rounded-full border border-silver px-4 py-2 text-sm text-graphite">
              افزودن به سبد درخواست
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
