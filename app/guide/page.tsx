import Link from "next/link";

const guideLinks = [
  { href: "/size-guide", label: "راهنمای سایز", text: "انتخاب سایز اروپایی انگشتر پیش از ثبت درخواست." },
  { href: "/silver-care", label: "نگهداری نقره", text: "راهنمای مراقبت از قطعات نقره Ornova." },
  { href: "/faq", label: "پرسش‌های رایج", text: "پاسخ کوتاه به سوال‌های رایج درباره سفارش و طراحی." },
];

export default function GuidePage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-sapphire">راهنمای Ornova</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">راهنمای خرید و سفارش</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-graphite/70">
        مسیرهای اصلی راهنما برای انتخاب دقیق‌تر، نگهداری بهتر و ثبت درخواست روشن‌تر در این بخش قرار می‌گیرند.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {guideLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-[26px] border border-silver bg-ivory-soft p-6 transition hover:border-sapphire">
            <h2 className="text-xl font-semibold text-graphite">{item.label}</h2>
            <p className="mt-4 text-sm leading-7 text-graphite/70">{item.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
