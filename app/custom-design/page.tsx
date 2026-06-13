import Link from "next/link";

const steps = [
  "آپلود ایده",
  "بررسی Ornova",
  "طراحی دیجیتال",
  "رندر اولیه",
  "ارسال پیش‌فاکتور",
];

export default function CustomDesignPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-sapphire">طراحی اختصاصی جواهرات نقره</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">استودیو طراحی اختصاصی Ornova</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-graphite/70">
        این فضا برای تبدیل ایده، تصویر، نشانه یا روایت شخصی به طراحی دیجیتال جواهر و طراحی قابل ساخت آماده شده است.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-silver bg-ivory-soft p-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-silver bg-navy">
            <div className="absolute inset-8 rounded-[22px] border border-ivory/20 bg-ivory/10" />
            <div className="absolute bottom-10 right-10 h-20 w-28 rounded-[18px] border border-silver bg-moon/80" />
            <div className="absolute left-10 top-10 h-16 w-16 rounded-full bg-stone-lapis" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-graphite">ایده یا تصویر دارم</h2>
          <p className="mt-3 text-sm leading-7 text-graphite/70">
            تصویر الهام، اسکچ، اسکرین‌شات، مرجع فیلم، مودبرد یا توضیح خود را برای بررسی اولیه آماده کنید.
          </p>
          <button className="mt-6 rounded-full bg-sapphire px-5 py-3 text-sm font-medium text-ivory">آپلود ایده</button>
        </div>

        <section className="rounded-[30px] border border-silver bg-ivory-muted p-6">
          <h2 className="text-2xl font-semibold text-graphite">مسیر سفارش اختصاصی</h2>
          <p className="mt-3 text-sm leading-7 text-graphite/70">
            این مسیر برای سفارش‌هایی است که از ایده، تصویر یا توضیح شخصی آغاز می‌شوند و پس از بررسی Ornova به طراحی دیجیتال می‌رسند.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[18px] border border-silver bg-ivory p-4">
                <p className="text-xs text-sapphire">مرحله {index + 1}</p>
                <p className="mt-2 text-sm text-graphite/78">{step}</p>
              </div>
            ))}
          </div>
          <Link href="/ring-builder" className="mt-7 inline-flex rounded-full border border-silver px-5 py-3 text-sm font-medium text-graphite hover:border-sapphire">
            طراحی انگشتر جداگانه
          </Link>
        </section>
      </div>
    </div>
  );
}
