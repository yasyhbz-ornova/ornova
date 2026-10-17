import { InquiryForm } from "@/components/commerce/InquiryForm";

export const metadata = {
  title: "ارتباط با Ornova | Ornova by Yas",
  description: "برای سفارش طراحی اختصاصی یا پرسش درباره قطعات نقره Ornova با ما در ارتباط باشید.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[0.8fr_1.2fr] md:py-20">
      <div>
        <p className="text-sm text-sapphire">ارتباط با Ornova</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">یک ایده را با هم بررسی کنیم.</h1>
        <p className="mt-6 text-base leading-8 text-graphite/70">برای سفارش طراحی اختصاصی، پرسش درباره قطعات یا ادامه یک درخواست، چند خط درباره ایده‌تان بنویسید. پاسخ و بررسی نهایی پس از اتصال امن حساب کاربری انجام می‌شود.</p>
        <div className="mt-8 border-t border-silver pt-5 text-sm leading-7 text-graphite/60">Ornova by Yas / طراحی دیجیتال جواهر / طراحی قابل ساخت</div>
      </div>
      <InquiryForm />
    </div>
  );
}
