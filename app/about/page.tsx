import Link from "next/link";

export const metadata = {
  title: "درباره یاس | Ornova by Yas",
  description: "درباره‌ی نگاه یاس به طراحی دیجیتال جواهرات نقره در Ornova.",
};

export default function AboutPage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">Ornova by Yas / درباره</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">جواهر از یک تصویر، یک نشانه یا یک خاطره شروع می‌شود.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">Ornova فضای شخصی یاس برای طراحی دیجیتال جواهرات نقره است؛ جایی برای نزدیک‌شدن به فرم، آزمودن جزئیات و تبدیل یک ایده به طراحی قابل ساخت.</p></div></section>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24"><div><p className="text-sm text-sapphire">نگاه یاس</p><p className="mt-4 text-3xl font-semibold leading-[1.6] text-graphite">آرام، دقیق و نزدیک به آدم‌ها.</p></div><div className="space-y-6 text-base leading-8 text-graphite/70"><p>یاس در Ornova بین حساسیت هنری و تصمیم‌های فنی حرکت می‌کند. فرم باید احساس داشته باشد، اما هم‌زمان از نظر ضخامت، تعادل و امکان ساخت قابل بررسی باشد.</p><p>ابزارهایی مانند MatrixGold و ZBrush بخشی از این مسیرند؛ ابزارهایی برای آزمودن حجم، اصلاح فرم و رسیدن به طرحی که بتوان درباره‌ی آن روشن و صادقانه گفت‌وگو کرد.</p><p>هر قطعه قرار نیست برای همه باشد. مهم این است که برای صاحبش معنایی نزدیک داشته باشد و در فرایند طراحی، انتخاب‌ها و محدودیت‌ها شفاف بمانند.</p></div></section>
      <section className="border-y border-silver bg-ivory-muted"><div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 md:flex-row md:items-center md:justify-between md:py-20"><div><p className="text-sm text-sapphire">ادامه‌ی آشنایی</p><h2 className="mt-3 text-3xl font-semibold text-graphite">قطعه‌ای را از آرشیو ببینید یا ایده‌ای بیاورید.</h2></div><div className="flex flex-wrap gap-3"><Link href="/shop" className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">دیدن فروشگاه</Link><Link href="/custom-design" className="rounded-full border border-silver px-6 py-3 text-sm font-medium text-graphite hover:border-sapphire">طراحی اختصاصی</Link></div></div></section>
    </main>
  );
}
