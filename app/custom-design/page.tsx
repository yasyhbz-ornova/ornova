import Image from "next/image";
import Link from "next/link";

const steps = [
  ["۰۱", "ایده را می‌فرستی", "تصویر، اسکچ یا توضیحی کوتاه از چیزی که می‌خواهی شکل بگیرد."],
  ["۰۲", "Ornova گوش می‌دهد", "فرم، متریال و امکان ساخت از نگاه فنی و هنری بررسی می‌شود."],
  ["۰۳", "مسیر طراحی روشن می‌شود", "جزئیات ادامهٔ کار و برآورد اولیه با تو هماهنگ می‌شود."],
  ["۰۴", "فرم ساخته می‌شود", "طراحی دیجیتال، رندر و اصلاحات لازم تا رسیدن به فرم نهایی پیش می‌رود."],
];

export const metadata = { title: "استودیو طراحی اختصاصی | Ornova by Yas", description: "مسیر حرفه‌ای سفارش طراحی اختصاصی جواهرات نقره در Ornova." };

export default function CustomDesignPage() {
  return <main className="custom-atelier">
    <section className="atelier-opening"><div className="atelier-opening-copy"><p className="ritual-label">استودیو طراحی اختصاصی Ornova</p><h1>یک نشانه،<br />پیش از آن‌که از دست برود.</h1><p>اگر تصویر، خاطره یا فرمی داری که می‌خواهی نزدیکت بماند، از همین‌جا مسیر تبدیل‌شدنش به یک طراحی دیجیتال جواهر شروع می‌شود.</p><div className="ritual-actions"><Link href="/contact" className="ritual-solid">شروع درخواست طراحی</Link><Link href="/ring-builder" className="ritual-line">ساختن پیش‌طرح انگشتر</Link></div></div><div className="atelier-opening-image"><Image src="/images/ornova/goldan-khamoosh-02.jpg" alt="جزئیات طراحی دیجیتال جواهر برای سفارش اختصاصی" fill priority sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" /><div className="ritual-veil" /><span>فرم / تناسب / امکان ساخت</span></div></section>
    <section className="atelier-intro"><p className="ritual-label">دو راه برای شروع</p><h2>لازم نیست همه‌چیز را از قبل بدانی.</h2><div className="atelier-paths"><Link href="/contact" className="atelier-path"><span>ایده یا تصویر دارم</span><strong>آنچه در ذهن یا دستت هست را برای بررسی بفرست.</strong><small>رفتن به درخواست طراحی ←</small></Link><Link href="/ring-builder" className="atelier-path"><span>می‌خواهم با پنل طراحی کنم</span><strong>برای یک انگشتر، از فرم و سنگ شروع کن و پیش‌طرح بساز.</strong><small>ورود به پنل طراحی ←</small></Link></div></section>
    <section className="atelier-process"><div className="atelier-process-intro"><p className="ritual-label">مسیر همکاری</p><h2>از یک رد تا فرمی که می‌شود پوشید.</h2><p>هر مرحله بعد از بررسی و هماهنگی تو جلو می‌رود. نتیجهٔ نهایی به فرم، متریال، سایز و امکان ساخت وابسته است.</p></div><div className="atelier-process-list">{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className="atelier-note"><div><p className="ritual-label">قبل از شروع</p><h2>یک تصویر کافی است.</h2><p>اگر تصویر یا اسکچ نداری، چند خط دربارهٔ فرم، کاربرد و حسی که می‌خواهی قطعه منتقل کند بنویس. داستان خصوصی‌ات لازم نیست؛ اطلاعات لازم برای طراحی کافی است.</p></div><Link href="/contact" className="ritual-solid">ارسال برای بررسی Ornova</Link></section>
  </main>;
}
