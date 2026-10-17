import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/constants/products";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";

const fragments = [
  { title: "چیزی که می‌ماند", text: "هر قطعه از یک رد شروع می‌شود؛ از چیزی که زمان نتوانسته کامل از بین ببرد." },
  { title: "نشانه، نه تزئین", text: "فرم‌ها برای معنا ساخته می‌شوند، نه برای شلوغ‌کردن سطح." },
  { title: "از تصویر تا فرم", text: "یاس ایده را با طراحی دیجیتال جواهر به یک امکان قابل ساخت نزدیک می‌کند." },
];

export function RitualArchiveConcept() {
  const featured = products[0];
  return <main className="ritual-concept">
    <section className="ritual-opening"><div className="ritual-opening-copy"><p className="ritual-label">آرشیو Ornova / پروندهٔ ۰۱</p><h1>نقره‌ای برای خاطره‌هایی که نزدیک قلب می‌مانند</h1><p>جواهرات نقره برای خاطره‌هایی که نمی‌خواهند به گذشته تبدیل شوند.</p><div className="ritual-actions"><Link href="/shop" className="ritual-solid">ورود به آرشیو</Link><Link href="/custom-design" className="ritual-line">ساختن یک نشانه</Link><Link href="/ring-builder" className="ritual-line">ساختن فرم انگشتر</Link></div></div><div className="ritual-opening-visual"><Image src={featured.image} alt={featured.name} fill priority sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" /><div className="ritual-veil" /><span>لاجورد شب<br />نقره / سنگ / خاطره</span></div></section>
    <section className="ritual-statement"><p className="ritual-label">یک خانه برای اشیای نزدیک</p><h2>بعضی چیزها را نمی‌شود نگه داشت.<br />می‌شود شکلشان داد.</h2><p>Ornova از فاصلهٔ میان احساس و فرم ساخته می‌شود؛ جایی که یک تصویر، یک نشانه یا یک فقدان، به قطعه‌ای برای نزدیک‌ماندن تبدیل می‌شود.</p></section>
    <section className="ritual-fragments"><div className="ritual-fragment-list">{fragments.map((fragment, index) => <article key={fragment.title}><span>۰{index + 1}</span><div><h3>{fragment.title}</h3><p>{fragment.text}</p></div></article>)}</div><div className="ritual-fragment-image"><Image src="/images/ornova/goldan-khamoosh-02.jfif" alt="جزئیات طراحی دیجیتال جواهر" fill sizes="(max-width: 768px) 100vw, 42vw" className="object-cover" /></div></section>
    <section className="ritual-object"><div className="ritual-object-image"><Image src={featured.image} alt={featured.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div><div className="ritual-object-copy"><p className="ritual-label">یک شیء از آرشیو</p><h2>{featured.name}</h2><p>لاجوردی عمیق در میان نقره‌ای که نور را نگه می‌دارد. قطعه‌ای برای آنچه هنوز نزدیک است.</p><Link href={`/shop/${featured.slug}`} className="ritual-line">دیدن پروندهٔ قطعه ←</Link><div className="mt-8"><RequestBasketButton item={{ slug: featured.slug, name: featured.name, category: featured.category }} /></div></div></section>
    <section className="ritual-closing"><p className="ritual-label">ادامهٔ پرونده</p><h2>اگر نشانه‌ای داری،<br />می‌توانیم به آن فرم بدهیم.</h2><Link href="/custom-design" className="ritual-line">ورود به استودیو طراحی ←</Link></section>
  </main>;
}
