import Link from "next/link";

export const metadata = {
  title: "راهنمای سایز انگشتر | Ornova by Yas",
  description: "راهنمای ساده برای انتخاب سایز اروپایی انگشتر پیش از ارسال درخواست به Ornova.",
};

const steps = [
  ["۱", "یک انگشتر مناسب انتخاب کنید", "انگشتری را بردارید که در همان انگشت راحت است و لق نمی‌زند."],
  ["۲", "قطر داخلی را اندازه بگیرید", "با خط‌کش، فاصله‌ی داخل حلقه را از یک لبه تا لبه‌ی مقابل، بر حسب میلی‌متر بخوانید."],
  ["۳", "عدد را برای بررسی ارسال کنید", "سایز اروپایی انگشتر یا اندازه‌ی به‌دست‌آمده را در توضیحات درخواست بنویسید تا Ornova بررسی نهایی را انجام دهد."],
];

export default function SizeGuidePage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">راهنمای Ornova / سایز</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">سایز اروپایی انگشتر را با آرامش انتخاب کنید.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">این راهنما برای یک اندازه‌گیری اولیه است. پیش از طراحی یا ساخت، سایز نهایی با توجه به فرم انگشتر و امکان‌سنجی فنی بررسی می‌شود.</p></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="grid gap-6 md:grid-cols-3">{steps.map(([number, title, text]) => <article key={number} className="border-t border-silver pt-5"><p className="text-3xl font-light text-sapphire">{number}</p><h2 className="mt-5 text-xl font-semibold text-graphite">{title}</h2><p className="mt-4 text-sm leading-7 text-graphite/70">{text}</p></article>)}</div></section>
      <section className="mx-auto max-w-4xl px-5 pb-16 md:pb-24"><div className="border border-silver bg-ivory-muted p-6 md:p-8"><p className="text-sm font-medium text-sapphire">نکته‌ی مهم</p><p className="mt-4 text-base leading-8 text-graphite/75">اندازه‌گیری با نخ یا نوار کاغذی ممکن است خطای بیشتری داشته باشد. اگر بین دو اندازه مردد هستید، هر دو عدد و توضیح کوتاه‌تان را در درخواست بنویسید؛ تصمیم نهایی پس از بررسی Ornova انجام می‌شود.</p><Link href="/contact" className="mt-6 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">ارسال درخواست بررسی</Link></div></section>
    </main>
  );
}
