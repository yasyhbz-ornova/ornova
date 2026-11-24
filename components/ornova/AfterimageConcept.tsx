import Image from "next/image";
import Link from "next/link";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { products } from "@/lib/constants/products";
import "./GalleryConcepts.css";

const featured = products[0];

export function AfterimageConcept() {
  return (
    <main className="afterimage-concept">
      <section className="afterimage-opening" aria-labelledby="afterimage-title">
        <div className="afterimage-opening-layout">
          <div className="afterimage-opening-copy">
            <p className="afterimage-signature">Ornova by Yas</p>
            <h1 id="afterimage-title">چیزی از شب، کنار تو می‌ماند.</h1>
            <p className="afterimage-intro">
              جواهرات نقره با طراحی دیجیتال؛ برای نشانه‌هایی که می‌خواهی نزدیکت بمانند.
            </p>
            <div className="afterimage-opening-actions">
              <Link href="/shop" className="afterimage-primary">دیدن قطعات</Link>
              <Link href="/custom-design" className="afterimage-secondary">سفارش طراحی اختصاصی</Link>
            </div>
          </div>

          <figure className="afterimage-opening-figure">
            <Link href={`/shop/${featured.slug}`} className="afterimage-opening-photo" aria-label={`دیدن پرونده‌ی ${featured.name}`}>
              <Image
                src={featured.image}
                alt={featured.gallery[0]?.alt ?? featured.name}
                fill
                priority
                sizes="(max-width: 760px) 100vw, 58vw"
                className="afterimage-opening-image"
              />
            </Link>
            <figcaption>
              <div>
                <span>{featured.category}</span>
                <strong>{featured.name}</strong>
              </div>
              <Link href={`/shop/${featured.slug}`}>پرونده‌ی قطعه</Link>
            </figcaption>
          </figure>

          <aside className="afterimage-opening-details" aria-label={`نماهای دیگر ${featured.name}`}>
            {featured.gallery.slice(1, 3).map((image) => (
              <figure key={image.src}>
                <div className="afterimage-detail-photo">
                  <Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 42vw, 12vw" className="object-cover" />
                </div>
              </figure>
            ))}
          </aside>
        </div>
      </section>

      <section id="afterimage-archive" className="afterimage-archive" aria-labelledby="afterimage-archive-title">
        <div className="afterimage-archive-heading">
          <p>آرشیو قطعات</p>
          <h2 id="afterimage-archive-title">هر فرم، راه خودش را برای نزدیک‌ماندن دارد.</h2>
          <Link href="/shop">رفتن به فروشگاه</Link>
        </div>

        <div className="afterimage-index" aria-label="قطعات Ornova">
          {products.map((product, index) => (
            <article className={`afterimage-index-piece afterimage-index-piece-${index + 1}`} key={product.slug}>
              <Link href={`/shop/${product.slug}`} className="afterimage-index-image" aria-label={`دیدن ${product.name}`}>
                <Image src={product.image} alt={product.gallery[0]?.alt ?? product.name} fill sizes="(max-width: 760px) 100vw, 34vw" className="object-cover" />
              </Link>
              <div className="afterimage-index-copy">
                <p>{product.category}</p>
                <h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3>
                <p>{product.description}</p>
                <div className="afterimage-piece-actions">
                  <Link href={`/contact?product=${product.slug}&intent=price`} className="afterimage-text-link">درخواست قیمت</Link>
                  <RequestBasketButton
                    item={{ slug: product.slug, name: product.name, category: product.category }}
                    label="افزودن به سبد درخواست"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="afterimage-commission" aria-labelledby="afterimage-commission-title">
        <div className="afterimage-commission-image">
          <Image
            src="/images/ornova/goldan-khamoosh-02.jpg"
            alt="نمای نزدیک سنجاق سینه‌ی گلدان خاموش روی کت تیره"
            fill
            sizes="(max-width: 760px) 100vw, 58vw"
            className="object-cover"
          />
        </div>
        <div className="afterimage-commission-copy">
          <p>استودیو طراحی اختصاصی</p>
          <h2 id="afterimage-commission-title">ایده‌ات را لازم نیست کامل بدانی.</h2>
          <p>یک تصویر، یک فرم یا چند خط توضیح برای شروع کافی است. بررسی امکان ساخت، پیش از ادامه‌ی مسیر انجام می‌شود.</p>
          <div className="afterimage-commission-actions">
            <Link href="/custom-design" className="afterimage-primary">شروع طراحی اختصاصی</Link>
            <Link href="/ring-builder" className="afterimage-secondary">ساخت پیش‌طرح انگشتر</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
