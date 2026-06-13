import Link from "next/link";
import { products } from "@/lib/constants/products";

export default function Home() {
  return (
    <div>
      <section className="border-b border-silver/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.08fr_0.92fr] md:items-center md:py-24">
          <div>
            <p className="text-sm font-medium text-sapphire">Ornova by Yas</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.35] text-graphite md:text-6xl">
              نقره‌ای برای خاطره‌هایی که نزدیک قلب می‌مانند
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-graphite/75 md:text-lg">
              Ornova خانه‌ای آرام برای جواهرات نقره است؛ جایی که تصویرها، نشانه‌ها و خاطره‌های شخصی با طراحی دیجیتال به قطعاتی ظریف، قابل ساخت و ماندگار تبدیل می‌شوند.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-full bg-sapphire px-6 py-3 text-center text-sm font-medium text-ivory" href="/shop">
                فروشگاه
              </Link>
              <Link className="rounded-full border border-silver px-6 py-3 text-center text-sm font-medium text-graphite hover:border-sapphire" href="/custom-design">
                طراحی اختصاصی
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-silver bg-navy p-6 text-ivory">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-ivory/20 bg-ivory/10">
              <div className="absolute left-10 top-10 h-36 w-36 rounded-full border border-moon/45" />
              <div className="absolute bottom-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full border-[18px] border-silver/60" />
              <div className="absolute bottom-28 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border border-ivory/40 bg-stone-lapis shadow-lg" />
              <div className="absolute bottom-6 right-6">
                <p className="text-sm text-ivory/65">طراحی دیجیتال جواهر</p>
                <h2 className="mt-2 text-2xl font-semibold">آتلیه نقره Ornova</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-3">
        {[
          ["فروشگاه", "قطعات نقره با طراحی قابل ساخت و نگاه آرام.", "/shop"],
          ["طراحی اختصاصی", "آغاز طراحی از تصویر، نشانه یا روایت شخصی.", "/custom-design"],
          ["طراحی انگشتر", "ساخت پیش‌نمایش بصری برای بررسی Ornova.", "/ring-builder"],
        ].map(([title, text, href]) => (
          <Link key={href} href={href} className="rounded-[26px] border border-silver bg-ivory-soft p-7 transition hover:border-sapphire">
            <div className="mb-6 h-24 rounded-[22px] border border-silver bg-silver-muted" />
            <h2 className="text-xl font-semibold text-graphite">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-graphite/70">{text}</p>
          </Link>
        ))}
      </section>

      <section className="border-y border-silver/70 bg-ivory-muted">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-sapphire">کالکشن Ornova</p>
              <h2 className="mt-3 text-3xl font-semibold text-graphite">قطعات منتخب نقره</h2>
            </div>
            <Link href="/shop" className="text-sm text-sapphire">ورود به فروشگاه</Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-5">
            {products.map((product) => (
              <Link key={product.slug} href={`/shop/${product.slug}`} className="group rounded-[24px] border border-silver bg-ivory p-4">
                <ProductVisual />
                <p className="mt-5 text-xs text-sapphire">{product.category}</p>
                <h3 className="mt-2 min-h-14 text-base font-semibold leading-7 text-graphite">{product.name}</h3>
                <p className="mt-3 text-sm font-medium text-graphite">درخواست قیمت</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-silver bg-ivory-soft p-8">
          <p className="text-sm text-sapphire">Ornova by Yas</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-graphite">طراحی نقره با نگاه یاس</h2>
          <p className="mt-5 text-base leading-8 text-graphite/70">
            Ornova بر پایه طراحی دیجیتال جواهر شکل گرفته است؛ جایی برای تبدیل خاطره، نشانه و سلیقه شخصی به قطعات نقره قابل ساخت، ظریف و آرام.
          </p>
        </div>
        <div className="rounded-[28px] border border-silver bg-ivory-muted p-8">
          <p className="text-sm text-sapphire">راهنمای Ornova</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-graphite">قبل از ثبت درخواست</h2>
          <p className="mt-5 text-base leading-8 text-graphite/70">
            راهنمای سایز، نگهداری نقره و پرسش‌های رایج در یک مسیر ساده جمع شده‌اند.
          </p>
          <Link href="/guide" className="mt-7 inline-flex rounded-full bg-sapphire px-5 py-3 text-sm font-medium text-ivory">
            ورود به راهنما
          </Link>
        </div>
      </section>
    </div>
  );
}

function ProductVisual() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-silver bg-navy">
      <div className="absolute inset-x-5 bottom-6 h-20 rounded-full bg-graphite/35" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[10px] border-silver/70" />
      <div className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 rounded-full bg-moon" />
    </div>
  );
}
