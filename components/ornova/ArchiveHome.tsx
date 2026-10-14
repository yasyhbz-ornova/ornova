import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/constants/products";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";

function ArchiveVisual() {
  return (
    <div className="relative min-h-[420px] overflow-hidden bg-navy p-8 text-ivory md:min-h-[540px]">
      <div className="absolute inset-8 border border-ivory/20" />
      <div className="absolute left-[18%] top-[16%] h-20 w-20 rounded-full border border-moon/40" />
      <div className="archive-ring absolute bottom-[23%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full border-[16px] border-silver/70 shadow-[0_0_0_26px_rgb(201_201_196_/_0.08)]" />
      <div className="absolute bottom-[36%] left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-stone-lapis ring-8 ring-silver/20" />
      <div className="absolute bottom-8 right-8 left-8 flex items-end justify-between gap-4">
        <p className="text-xs leading-6 text-ivory/65">طراحی دیجیتال جواهر<br />فرم اولیه برای بررسی</p>
        <span className="text-4xl font-light text-ivory/70">01</span>
      </div>
    </div>
  );
}

function ArchiveProductCard({ product, index }: { product: (typeof products)[number]; index: number }) {
  return (
    <article className="group">
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="product-visual relative aspect-[4/5] overflow-hidden bg-navy"><Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /><div className="absolute bottom-5 right-5 text-xs text-ivory/55">0{index + 1} / ORNOVA</div></div>
        <p className="mt-5 text-xs text-sapphire">{product.category}</p>
        <h3 className="mt-2 text-base font-semibold leading-7 text-graphite">{product.name}</h3>
        <p className="mt-3 text-sm text-graphite/65">درخواست قیمت و بررسی امکان ساخت</p>
      </Link>
      <div className="mt-4"><RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} /></div>
    </article>
  );
}

export function ArchiveHome({ conceptMode = false }: { conceptMode?: boolean }) {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <ArchiveVisual />
          <div className="md:order-first">
            <p className="text-xs tracking-[0.18em] text-sapphire">{conceptMode ? "ARCHIVE / 01" : "آرشیو ماهتابی / 01"}</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-6xl">نقره‌ای برای خاطره‌هایی که نزدیک قلب می‌مانند</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">Ornova خانه‌ای آرام برای جواهرات نقره است؛ جایی که تصویرها، نشانه‌ها و خاطره‌های شخصی با طراحی دیجیتال به قطعاتی ظریف، قابل ساخت و ماندگار تبدیل می‌شوند.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/shop" className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">مشاهده فروشگاه</Link><Link href="/custom-design" className="rounded-full border border-silver px-6 py-3 text-sm font-medium text-graphite hover:border-sapphire">شروع طراحی اختصاصی</Link></div>
            <p className="mt-8 max-w-xs border-t border-silver pt-4 text-sm leading-7 text-graphite/60">{conceptMode ? "یک مسیر مفهومی برای ورود به آرشیو Ornova؛ بر پایه قطعه، نشانه و خاطره." : "قطعاتی که از دل تصویر، نشانه و خاطره به طراحی دیجیتال می‌رسند."}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16"><div className="grid gap-4 md:grid-cols-3"><Link href="/shop" className="border-t border-silver pt-5 transition-colors hover:border-sapphire"><p className="text-xs text-sapphire">مسیر اول / ۰۱</p><h2 className="mt-3 text-xl font-semibold text-graphite">دیدن و درخواست محصولات</h2><p className="mt-3 text-sm leading-7 text-graphite/65">قطعه‌ای را از آرشیو انتخاب کنید و درباره امکان ساخت آن گفت‌وگو کنیم.</p></Link><Link href="/custom-design" className="border-t border-silver pt-5 transition-colors hover:border-sapphire"><p className="text-xs text-sapphire">مسیر دوم / ۰۲</p><h2 className="mt-3 text-xl font-semibold text-graphite">سفارش طراحی اختصاصی</h2><p className="mt-3 text-sm leading-7 text-graphite/65">تصویر، نشانه یا خاطره‌تان را به استودیو طراحی Ornova بیاورید.</p></Link><Link href="/ring-builder" className="border-t border-silver pt-5 transition-colors hover:border-sapphire"><p className="text-xs text-sapphire">مسیر سوم / ۰۳</p><h2 className="mt-3 text-xl font-semibold text-graphite">ساخت کانسپت انگشتر</h2><p className="mt-3 text-sm leading-7 text-graphite/65">یک فرم اولیه بسازید تا برای بررسی فنی و هنری ارسال شود.</p></Link></div></section>

      <section className="border-y border-silver bg-ivory-muted"><div className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm text-sapphire">انتخاب‌های آرشیو</p><h2 className="mt-3 text-3xl font-semibold text-graphite">قطعاتی برای دیدن و درخواست‌دادن</h2></div><Link href="/shop" className="text-sm text-sapphire">دیدن همه قطعات</Link></div><div className="mt-10 grid gap-8 md:grid-cols-3">{products.map((product,index)=><ArchiveProductCard key={product.slug} product={product} index={index} />)}</div></div></section>

      <section className="border-t border-silver bg-ivory-soft"><div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 md:flex-row md:items-center md:justify-between md:py-20"><div><p className="text-sm text-sapphire">راهنمای Ornova</p><h2 className="mt-3 text-3xl font-semibold text-graphite">پیش از انتخاب، کمی بیشتر بدانیم.</h2><p className="mt-4 max-w-xl text-base leading-8 text-graphite/70">از ویژگی‌های نقره تا مراقبت از قطعات، راهنمایی کوتاه برای انتخابی آگاهانه و ماندگار.</p></div><Link href="/guide" className="inline-flex w-fit rounded-full border border-silver px-6 py-3 text-sm font-medium text-graphite hover:border-sapphire">ورود به راهنما</Link></div></section>
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:py-20"><div><p className="text-sm text-sapphire">ادامه مسیر</p><h2 className="mt-3 text-3xl font-semibold text-graphite">از یک نشانه شروع کنیم؟</h2><p className="mt-4 max-w-xl text-base leading-8 text-graphite/70">اگر تصویر، ایده یا خاطره‌ای برای تبدیل‌شدن به جواهر دارید، مسیر طراحی اختصاصی را ببینید.</p></div><Link href="/custom-design" className="inline-flex w-fit rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">ورود به استودیو طراحی</Link></section>
    </main>
  );
}
