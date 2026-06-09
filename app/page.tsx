import Link from "next/link";
import { products } from "@/lib/constants/products";

const paths = [
  {
    href: "/shop",
    title: "فروشگاه",
    text: "انتخاب قطعات آماده نقره با فرم‌های آرام و قابل استفاده روزانه.",
  },
  {
    href: "/custom-design",
    title: "طراحی اختصاصی",
    text: "تبدیل نشانه‌ها، تصویرها و خاطره‌های شخصی به طرح قابل ساخت.",
  },
  {
    href: "/ring-builder",
    title: "طراحی انگشتر",
    text: "شروع طراحی انگشتر با انتخاب فرم، حس کلی و سایز اروپایی انگشتر.",
  },
];

const guides = [
  { href: "/size-guide", title: "راهنمای سایز", text: "اندازه‌گیری دقیق‌تر برای انتخاب انگشتر." },
  { href: "/silver-care", title: "نگهداری نقره", text: "روش‌های ساده مراقبت از درخشش نقره." },
  { href: "/silver-properties", title: "ویژگی‌های نقره", text: "آشنایی کوتاه با جنس و رفتار نقره." },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-silver/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-24">
          <div>
            <p className="text-sm text-sapphire">Ornova by Yas</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.35] text-graphite md:text-6xl">
              نقره‌ای برای خاطره‌هایی که نزدیک قلب می‌مانند
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-graphite/75 md:text-lg">
              Ornova خانه‌ای آرام برای جواهرات نقره است؛ جایی که تصویرها، نشانه‌ها و خاطره‌های شخصی با طراحی دیجیتال به قطعاتی ظریف، قابل ساخت و ماندگار تبدیل می‌شوند.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-full bg-sapphire px-6 py-3 text-center text-sm font-medium text-ivory" href="/shop">
                مشاهده فروشگاه
              </Link>
              <Link className="rounded-full border border-silver px-6 py-3 text-center text-sm font-medium text-graphite hover:border-sapphire" href="/custom-design">
                شروع طراحی اختصاصی
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-silver bg-navy p-8 text-ivory shadow-sm">
            <div className="aspect-[4/5] rounded-[22px] border border-ivory/20 bg-ivory/10 p-6">
              <div className="flex h-full flex-col justify-end">
                <p className="text-sm text-ivory/65">پیش‌نمایش مجموعه</p>
                <h2 className="mt-3 text-2xl font-semibold">نقره، نشانه، خاطره</h2>
                <p className="mt-4 text-sm leading-7 text-ivory/75">
                  فضایی آرام برای انتخاب یا آغاز طراحی قطعه‌ای که به سلیقه و روایت شما نزدیک است.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {paths.map((path) => (
            <Link key={path.href} href={path.href} className="rounded-[24px] border border-silver bg-ivory-soft p-6 transition hover:border-sapphire">
              <h2 className="text-xl font-semibold text-graphite">{path.title}</h2>
              <p className="mt-4 text-sm leading-7 text-graphite/70">{path.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-silver/70 bg-ivory-muted">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm text-sapphire">انتخاب‌های آغازین</p>
              <h2 className="mt-3 text-3xl font-semibold text-graphite">محصولات منتخب</h2>
            </div>
            <Link href="/shop" className="text-sm text-sapphire">مشاهده همه</Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {products.map((product) => (
              <Link key={product.slug} href={`/shop/${product.slug}`} className="rounded-[24px] border border-silver bg-ivory p-5">
                <div className="aspect-square rounded-[20px] border border-silver bg-silver-muted" />
                <p className="mt-5 text-sm text-sapphire">{product.category}</p>
                <h3 className="mt-2 text-lg font-semibold text-graphite">{product.name}</h3>
                <p className="mt-3 text-sm font-medium text-graphite">درخواست قیمت</p>
                <span className="mt-4 inline-flex rounded-full border border-silver px-4 py-2 text-sm text-graphite">
                  افزودن به سبد درخواست
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-2">
        <PreviewPanel title="طراحی اختصاصی" href="/custom-design" text="برای قطعه‌ای که از تصویر، نشانه یا خاطره شخصی شما آغاز می‌شود." />
        <PreviewPanel title="طراحی انگشتر" href="/ring-builder" text="انتخاب مسیر اولیه طراحی انگشتر با تمرکز بر فرم، حس و سایز اروپایی انگشتر." />
      </section>

      <section className="border-y border-silver/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div className="rounded-[28px] border border-silver bg-ivory-soft p-8">
            <p className="text-sm text-sapphire">درباره یاس</p>
            <h2 className="mt-3 text-3xl font-semibold text-graphite">طراحی نقره با نگاه آرام و دقیق</h2>
          </div>
          <p className="text-base leading-8 text-graphite/75">
            یاس قطعات Ornova را با رویکرد طراحی دیجیتال و توجه به نسبت، سطح و نشانه‌های شخصی شکل می‌دهد؛ هر محصول برای ساخت دقیق و استفاده ماندگار آماده می‌شود.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.href} href={guide.href} className="rounded-[22px] border border-silver p-6 transition hover:border-sapphire">
              <h2 className="text-lg font-semibold">{guide.title}</h2>
              <p className="mt-3 text-sm leading-7 text-graphite/70">{guide.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PreviewPanel({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-[28px] border border-silver bg-ivory-soft p-8 transition hover:border-sapphire">
      <p className="text-sm text-sapphire">پیش‌نمایش</p>
      <h2 className="mt-3 text-3xl font-semibold text-graphite">{title}</h2>
      <p className="mt-5 text-sm leading-7 text-graphite/70">{text}</p>
    </Link>
  );
}
