const tabs = ["سفارش‌های من", "ایده‌های آپلود شده", "پیش‌فاکتورها", "پیام‌ها", "فایل‌ها و تصاویر", "وضعیت تولید"];
const timeline = [
  "دریافت شد",
  "در حال بررسی",
  "نیازمند توضیح بیشتر",
  "پذیرفته شد",
  "پیش‌فاکتور ارسال شد",
  "در انتظار تایید مشتری",
  "طراحی دیجیتال",
  "رندر اولیه",
  "اصلاحات",
  "آماده تولید",
  "در حال تولید",
  "آماده تحویل",
  "تکمیل شد",
];

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-sapphire">آتلیه شخصی Ornova</p>
      <h1 className="mt-3 text-4xl font-semibold text-graphite">پنل سفارش من</h1>

      <div className="mt-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button key={tab} className="rounded-full border border-silver bg-ivory-soft px-4 py-2 text-sm text-graphite/75">
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[30px] border border-silver bg-ivory-soft p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-silver bg-navy">
            <div className="absolute bottom-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border-[10px] border-silver/70" />
            <div className="absolute left-1/2 top-16 h-16 w-16 -translate-x-1/2 rounded-full bg-stone-lapis ring-4 ring-moon" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-graphite">انگشتر «خاطره لاجورد»</h2>
          <dl className="mt-5 grid gap-3 text-sm text-graphite/75">
            <div className="flex justify-between rounded-[16px] border border-silver bg-ivory p-3">
              <dt>وضعیت فعلی</dt>
              <dd>در حال بررسی</dd>
            </div>
            <div className="flex justify-between rounded-[16px] border border-silver bg-ivory p-3">
              <dt>تاریخ ثبت</dt>
              <dd>۱۴۰۵/۰۳/۱۹</dd>
            </div>
            <div className="flex justify-between rounded-[16px] border border-silver bg-ivory p-3">
              <dt>مرحله بعدی</dt>
              <dd>ارسال پیش‌فاکتور</dd>
            </div>
          </dl>
          <button className="mt-6 rounded-full bg-sapphire px-5 py-3 text-sm font-medium text-ivory">مشاهده جزئیات</button>
        </div>

        <div className="rounded-[30px] border border-silver bg-ivory-muted p-6">
          <h2 className="text-2xl font-semibold text-graphite">وضعیت تولید</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {timeline.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-[16px] border border-silver bg-ivory p-3 text-sm text-graphite/75">
                <span className={`h-3 w-3 rounded-full ${index < 2 ? "bg-sapphire" : "bg-silver"}`} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
