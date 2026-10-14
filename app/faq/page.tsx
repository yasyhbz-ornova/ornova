import Link from "next/link";

export const metadata = {
  title: "پرسش‌های رایج | Ornova by Yas",
  description: "پاسخ کوتاه به پرسش‌های رایج درباره‌ی محصولات و طراحی اختصاصی Ornova.",
};

const questions = [
  ["آیا قطعات آماده‌ی خرید فوری هستند؟", "خیر. Ornova بر پایه‌ی درخواست و بررسی امکان ساخت پیش می‌رود. برای هر قطعه، پس از دریافت درخواست، جزئیات و امکان ساخت بررسی می‌شود."],
  ["فرایند طراحی قطعات چگونه است؟", "قطعات با workflow طراحی دیجیتال و نگاه فنی و هنری شکل می‌گیرند و پیش از ساخت، بررسی تولیدپذیری می‌شوند."],
  ["چطور درباره‌ی قیمت یک قطعه بپرسم؟", "قطعه را به سبد درخواست اضافه کنید و از مسیر ارسال درخواست، نام قطعه و توضیح کوتاه‌تان را بفرستید. قیمت پس از بررسی جزئیات اعلام می‌شود."],
  ["آیا می‌توانم ایده یا تصویر خودم را ارسال کنم؟", "بله. در استودیو طراحی اختصاصی می‌توانید ایده یا تصویر مرجع‌تان را توضیح دهید تا مسیر بررسی و طراحی مشخص شود."],
  ["زمان آماده‌سازی چطور مشخص می‌شود؟", "زمان به فرم قطعه، جزئیات طراحی و امکان ساخت بستگی دارد و پس از بررسی Ornova با شما هماهنگ می‌شود."],
  ["آیا سایز انگشتر قابل تغییر است؟", "سایز اروپایی انگشتر را در درخواست بنویسید. فرم نهایی، اندازه و امکان تغییر پس از بررسی فنی مشخص می‌شود."],
];

export default function FaqPage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">راهنمای Ornova / پرسش‌های رایج</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">پیش از شروع گفت‌وگو، پاسخ چند سؤال را ببینید.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">اگر پاسخ موردنظر شما اینجا نیست، جزئیات قطعه یا ایده‌تان را بفرستید تا Ornova دقیق‌تر راهنمایی کند.</p></div></section>
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-20"><div className="divide-y divide-silver border-y border-silver">{questions.map(([question, answer]) => <details key={question} className="group py-6"><summary className="cursor-pointer list-none pr-8 text-lg font-semibold text-graphite outline-none transition group-open:text-sapphire focus-visible:text-sapphire">{question}</summary><p className="max-w-3xl pt-4 text-sm leading-8 text-graphite/70">{answer}</p></details>)}</div><Link href="/contact" className="mt-10 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">پرسش دیگری دارم</Link></section>
    </main>
  );
}
