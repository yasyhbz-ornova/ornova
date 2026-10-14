import Link from "next/link";

export const metadata = {
  title: "حساب Ornova | Ornova by Yas",
  robots: { index: false, follow: false },
};

const futureAreas = [
  ["سفارش‌های من", "درخواست‌ها و وضعیت بررسی آن‌ها"],
  ["ایده‌های آپلود شده", "تصویرها و توضیح‌های خصوصی شما"],
  ["پیش‌فاکتورها", "پس از بررسی و تایید Ornova"],
  ["پیام‌ها", "گفت‌وگوی مستقیم درباره طراحی"],
  ["فایل‌ها و تصاویر", "در فضای خصوصی حساب شما"],
  ["وضعیت تولید", "از بررسی فنی تا آماده‌سازی"],
];

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-sapphire">حساب Ornova</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite md:text-5xl">فضای شخصی شما در مسیر طراحی</h1>
      <p className="mt-6 max-w-3xl text-base leading-8 text-graphite/70">پس از ورود، درخواست‌ها، فایل‌های خصوصی، پیش‌فاکتورها و وضعیت طراحی در یک فضای امن و آرام در دسترس شما قرار می‌گیرند.</p>
      <Link href="/login" className="mt-7 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">ورود به حساب</Link>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {futureAreas.map(([title, description]) => (
          <div key={title} className="rounded-[24px] border border-silver bg-ivory-soft p-6">
            <p className="text-sm font-medium text-sapphire">{title}</p>
            <p className="mt-4 text-sm leading-7 text-graphite/70">{description}</p>
            <span className="mt-6 inline-flex rounded-full border border-silver px-3 py-1 text-xs text-graphite/55">پس از ورود</span>
          </div>
        ))}
      </section>

      <section className="mt-14 border-t border-silver pt-8">
        <p className="max-w-2xl text-sm leading-7 text-graphite/60">این صفحه فعلاً یک پیش‌نمایش صادقانه از حساب مشتری است. هیچ سفارش، وضعیت تولید یا فایل واقعی تا زمان اتصال auth و Supabase نمایش داده نمی‌شود.</p>
      </section>
    </div>
  );
}
