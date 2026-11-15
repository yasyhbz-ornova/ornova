import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/constants/products";

const worlds = [
  { number: "۰۱", title: "ریشه", text: "نشانه‌هایی که از جایی دور، نزدیک مانده‌اند.", image: "/images/ornova/goldan-khamoosh-01.jpg" },
  { number: "۰۲", title: "خانه", text: "چیزهایی که بودنشان، فضا را آرام‌تر می‌کند.", image: "/images/ornova/lajvard-shab-02.png" },
  { number: "۰۳", title: "همراه", text: "قطعه‌ای که با زندگی روزمره حرکت می‌کند.", image: "/images/ornova/sepid-brooch-01.png" },
  { number: "۰۴", title: "فردا", text: "فرمی تازه برای چیزی که هنوز نام ندارد.", image: "/images/ornova/lajvard-shab-04.png" },
];

export function TraceArchiveConcept() {
  return (
    <main className="trace-concept bg-ivory">
      <section className="trace-hero border-b border-silver">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 md:grid-cols-[0.82fr_1.18fr] md:items-end md:pb-24 md:pt-16">
          <div className="trace-hero-copy md:order-first">
            <p className="text-xs tracking-[0.24em] text-sapphire">آرشیو زندهٔ مهر / ۰۱</p>
            <h1 className="mt-7 max-w-2xl text-4xl font-semibold leading-[1.45] text-graphite md:text-6xl">بعضی چیزها، همیشه با ما می‌مانند.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-graphite/70">هر قطعه در Ornova از یک رد شروع می‌شود؛ از تصویر، نشانه یا حسی که آرام‌آرام به فرمی نقره‌ای و قابل ساخت تبدیل می‌شود.</p>
            <Link href="/shop" className="mt-8 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">دیدن قطعات آرشیو</Link>
          </div>
          <div className="trace-hero-stage relative min-h-[430px] overflow-hidden bg-navy md:min-h-[590px]" aria-label="تصویر آرشیو زنده مهر">
            <Image src="/images/ornova/lajvard-shab-03.png" alt="جزئیات نقره و سنگ لاجورد در قطعهٔ لاجورد شب" fill priority sizes="(max-width: 768px) 100vw, 60vw" className="trace-hero-image object-cover" />
            <div className="trace-hero-scrim absolute inset-0" />
            <div className="trace-hero-line absolute left-[10%] right-[10%] top-[20%] h-px bg-moon/30" />
            <div className="trace-hero-line trace-hero-line--vertical absolute bottom-[12%] left-[72%] top-[8%] w-px bg-moon/25" />
            <div className="absolute right-7 top-7 text-xs leading-6 text-ivory/60">رد<br />مکث<br />لایه<br />پیوند</div>
            <div className="absolute bottom-7 right-7 left-7 flex items-end justify-between text-xs text-ivory/60"><span>فرم / معنا / جزئیات</span><span className="tracking-[0.18em]">ORNOVA</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr]">
          <div><p className="text-xs tracking-[0.22em] text-sapphire">چه چیزی برایمان می‌ماند؟</p><h2 className="mt-4 text-3xl font-semibold leading-[1.5] text-graphite">ورود از رابطه، نه فقط از دسته‌بندی.</h2></div>
          <div className="grid gap-px overflow-hidden border border-silver bg-silver md:grid-cols-2">{worlds.map((world) => <div key={world.number} className="trace-world group relative min-h-[230px] overflow-hidden bg-ivory-soft p-6 md:p-8"><Image src={world.image} alt="" fill sizes="(max-width: 768px) 100vw, 25vw" className="trace-world-image object-cover opacity-0 transition duration-700 group-hover:scale-105 group-hover:opacity-30" /><div className="relative"><p className="text-xs text-sapphire">{world.number}</p><h3 className="mt-8 text-xl font-semibold text-graphite">{world.title}</h3><p className="mt-3 max-w-xs text-sm leading-7 text-graphite/65">{world.text}</p></div><span className="trace-connection absolute bottom-7 left-7 h-px w-16 bg-sapphire/40" /></div>)}</div>
        </div>
      </section>

      <section className="border-y border-silver bg-ivory-muted"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><div className="flex items-end justify-between gap-6"><div><p className="text-xs tracking-[0.22em] text-sapphire">وقتی معنا، شکل پیدا می‌کند</p><h2 className="mt-4 text-3xl font-semibold text-graphite">آثار منتخب آرشیو</h2></div><Link href="/shop" className="text-sm text-sapphire">دیدن همه</Link></div><div className="mt-10 grid gap-8 md:grid-cols-3">{products.map((product, index) => <Link key={product.slug} href={`/shop/${product.slug}`} className="trace-product group"><div className="relative aspect-[4/5] overflow-hidden bg-navy"><Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" /><span className="absolute bottom-5 right-5 text-xs text-ivory/70">۰{index + 1}</span></div><p className="mt-4 text-xs text-sapphire">{product.category}</p><h3 className="mt-2 text-base font-semibold leading-7 text-graphite">{product.name}</h3></Link>)}</div></div></section>

      <section className="trace-process mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-24"><div className="trace-process-image relative min-h-[330px] overflow-hidden bg-navy p-7 text-ivory"><Image src="/images/ornova/goldan-khamoosh-02.jpg" alt="جزئیات یک قطعهٔ نقره برای معرفی مسیر طراحی" fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover opacity-75" /><div className="absolute inset-7 border border-ivory/30" /><div className="absolute bottom-7 right-7 text-sm leading-7 text-ivory/85">از مشاهده<br />تا طراحی دیجیتال<br />و امکان ساخت</div></div><div><p className="text-xs tracking-[0.22em] text-sapphire">ساختن یک رد</p><h2 className="mt-4 text-3xl font-semibold leading-[1.5] text-graphite">از یک احساس، تا یک فرم.</h2><p className="mt-5 text-base leading-8 text-graphite/70">در استودیو Ornova، ایده پیش از رسیدن به قطعه از مسیر طراحی دیجیتال، بررسی فرم و امکان‌سنجی فنی عبور می‌کند.</p><Link href="/custom-design" className="mt-7 inline-flex rounded-full border border-silver px-6 py-3 text-sm text-graphite transition-colors hover:border-sapphire hover:text-sapphire">ورود به استودیو طراحی</Link></div></section>
    </main>
  );
}
