import Link from "next/link";

export const metadata = {
  title: "ویژگی‌های نقره | Ornova by Yas",
  description: "نگاهی کوتاه به ویژگی‌های نقره در انتخاب جواهرات Ornova.",
};

const properties = [
  ["درخشش آرام", "سطح نقره نور را نرم و نزدیک بازتاب می‌دهد؛ برای همین در کنار نور طبیعی، جزئیات فرم بهتر دیده می‌شوند."],
  ["امکان شکل‌گیری دقیق", "نقره در طراحی جواهر امکان رسیدن به فرم‌های ظریف و جزئیات کنترل‌شده را فراهم می‌کند؛ هر قطعه همچنان باید از نظر ساخت بررسی شود."],
  ["تغییر طبیعی سطح", "نقره با گذر زمان ممکن است تغییر سطح یا تیرگی پیدا کند. این تغییر به محیط، تماس و شیوه‌ی نگهداری وابسته است."],
  ["قابل همراهی", "وزن، ابعاد و تعادل قطعه در طراحی مهم‌اند تا جواهر در استفاده‌ی روزمره یا موقعیت مشخص، حس مناسبی داشته باشد."],
];

export default function SilverPropertiesPage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">راهنمای Ornova / نقره</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">نقره فقط یک رنگ نیست؛ رفتار یک ماده است.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">در Ornova، انتخاب نقره با فرم، سنگ، وزن و شیوه‌ی استفاده‌ی هر قطعه همراه است. چند نکته‌ی کوتاه برای نگاه دقیق‌تر:</p></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="grid gap-x-10 gap-y-12 md:grid-cols-2">{properties.map(([title, text], index) => <article key={title} className="border-t border-silver pt-5"><p className="text-xs text-sapphire">۰{index + 1}</p><h2 className="mt-4 text-xl font-semibold text-graphite">{title}</h2><p className="mt-4 max-w-xl text-sm leading-8 text-graphite/70">{text}</p></article>)}</div></section>
      <section className="mx-auto max-w-4xl px-5 pb-16 md:pb-24"><div className="border border-silver bg-ivory-muted p-6 md:p-8"><p className="text-sm font-medium text-sapphire">انتخاب آگاهانه</p><p className="mt-4 text-base leading-8 text-graphite/75">اگر درباره‌ی جنس، سنگ یا امکان تغییر یک قطعه پرسشی دارید، آن را در درخواست‌تان بنویسید تا جزئیات مناسب همان طراحی بررسی شود.</p><Link href="/shop" className="mt-6 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">دیدن قطعات نقره</Link></div></section>
    </main>
  );
}
