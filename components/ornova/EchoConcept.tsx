import Image from "next/image";
import Link from "next/link";
import { EchoProductIndex } from "@/components/ornova/EchoProductIndex";

const paths = [
  { number: "۰۱", title: "دیدن قطعه‌ها", detail: "آرشیو جواهرات نقره", href: "/shop" },
  { number: "۰۲", title: "آوردن یک ایده", detail: "استودیو طراحی اختصاصی", href: "/custom-design" },
  { number: "۰۳", title: "ساختن پیش‌طرح", detail: "ابزار مفهومی انگشتر", href: "/ring-builder" },
];

export function EchoConcept() {
  return (
    <main className="echo-concept">
      <section className="echo-opening" aria-labelledby="echo-title">
        <header className="echo-opening-heading">
          <div>
            <p className="echo-signature">آرشیو Ornova <span aria-hidden="true">/</span> Ornova by Yas</p>
            <h1 id="echo-title">بعضی چیزها دور نمی‌شوند؛ <em>شکل عوض می‌کنند.</em></h1>
          </div>
          <p className="echo-opening-description">
            یک تصویر یا نشانه، نقطه‌ی شروع است. طراحی دیجیتال و بررسی امکان ساخت، آن را به قطعه‌ای نقره‌ای نزدیک می‌کند.
          </p>
        </header>

        <EchoProductIndex />

        <nav className="echo-route-index" aria-label="راه‌های شروع در Ornova">
          <p>از کدام مسیر شروع می‌کنی؟</p>
          <ol>
            {paths.map((path) => (
              <li key={path.number}>
                <span className="echo-route-number">{path.number}</span>
                <Link href={path.href}>
                  <strong>{path.title}</strong>
                  <span>{path.detail}</span>
                </Link>
                <span className="echo-route-arrow" aria-hidden="true">↗</span>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      <section className="echo-custom" aria-labelledby="echo-custom-title">
        <div className="echo-custom-image">
          <Image
            src="/images/ornova/goldan-khamoosh-02.jpg"
            alt="سنجاق سینه نقره گلدان خاموش روی کت تیره"
            fill
            sizes="(max-width: 760px) 100vw, 52vw"
            className="object-cover"
          />
          <span className="echo-custom-caption">پرونده‌ی ۰۲ <span aria-hidden="true">/</span> گلدان خاموش</span>
        </div>
        <div className="echo-custom-copy">
          <p className="echo-custom-kicker">طراحی اختصاصی</p>
          <h2 id="echo-custom-title">ایده لازم نیست از اول کامل باشد.</h2>
          <p>
            یک تصویر، یک فرم یا چند خط توضیح برای شروع کافی است. مسیر طراحی دیجیتال و بررسی امکان ساخت، قدم‌به‌قدم روشن می‌شود.
          </p>
          <Link href="/custom-design" className="echo-custom-link">رفتن به استودیو طراحی <span aria-hidden="true">←</span></Link>
        </div>
      </section>
    </main>
  );
}
