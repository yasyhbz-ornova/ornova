"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { products } from "@/lib/constants/products";

const toPersianNumber = (value: number) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function AftertoneConcept() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const product = products[selectedIndex];
  const image = product.gallery[selectedImageIndex] ?? product.gallery[0];
  const visibleDetails = product.details.slice(0, 3);

  function selectProduct(index: number) {
    setSelectedIndex(index);
    setSelectedImageIndex(0);
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-ivory text-graphite">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pb-24 lg:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-silver pb-5">
          <div>
            <p className="text-xs text-graphite/55">آرشیو قطعه‌های Ornova</p>
            <h1 className="mt-2 text-2xl font-medium leading-tight sm:text-3xl">یک قطعه را انتخاب کن.</h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-graphite/65">هر پرونده، تصویرها و اطلاعاتی را نشان می‌دهد که برای تصمیم‌گرفتن لازم‌اند.</p>
        </header>

        <section id="selected-product-record" aria-label={`پرونده‌ی ${product.name}`} className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-12 lg:pt-10">
          <div className="min-w-0">
            <figure>
              <div id="selected-product-image" className="relative aspect-[5/4] overflow-hidden bg-navy sm:aspect-[1.22/1] lg:aspect-[1.12/1]">
                <Image
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 62vw"
                  className="object-cover transition-opacity duration-300"
                />
              </div>
              <figcaption className="mt-3 flex items-baseline justify-between gap-4 text-xs text-graphite/60">
                <span aria-live="polite" aria-atomic="true">نمای {toPersianNumber(selectedImageIndex + 1)} از {toPersianNumber(product.gallery.length)}</span>
              </figcaption>
            </figure>

            {product.gallery.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="نماهای همین قطعه">
                {product.gallery.map((galleryImage, index) => (
                  <button
                    key={galleryImage.src}
                    type="button"
                    aria-label={`نمای ${toPersianNumber(index + 1)}: ${galleryImage.alt}`}
                    aria-controls="selected-product-image"
                    aria-pressed={selectedImageIndex === index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden border transition sm:h-[76px] sm:w-[76px] ${selectedImageIndex === index ? "border-sapphire" : "border-silver hover:border-graphite/45"}`}
                  >
                    <Image src={galleryImage.src} alt="" fill sizes="76px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col lg:pt-2">
            <p className="text-sm text-sapphire">{product.category}</p>
            <h2 aria-live="polite" aria-atomic="true" className="mt-3 text-3xl font-medium leading-[1.45] sm:text-4xl">{product.name}</h2>
            <p className="mt-4 max-w-xl text-sm leading-8 text-graphite/70">{product.description}</p>

            <dl className="mt-8 grid grid-cols-1 border-y border-silver sm:grid-cols-3">
              {visibleDetails.map((detail) => (
                <div key={detail.label} className="flex min-w-0 items-baseline justify-between gap-4 border-b border-silver/60 py-3 last:border-b-0 sm:block sm:border-b-0 sm:px-3 sm:py-4 sm:first:pr-0 sm:last:pl-0">
                  <dt className="shrink-0 text-xs leading-6 text-graphite/55">{detail.label}</dt>
                  <dd className="text-left text-sm leading-6 text-graphite sm:mt-1 sm:text-right">{detail.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-xs leading-6 text-graphite/55">قیمت و جزئیات نهایی پس از بررسی درخواست اعلام می‌شود.</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href={`/contact?product=${product.slug}&intent=price`}
                className="inline-flex min-h-12 items-center justify-center bg-sapphire px-6 text-sm font-medium text-ivory transition-colors hover:bg-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire"
              >
                درخواست قیمت
              </Link>
              <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} />
            </div>

            <div className="mt-10 border-t border-silver pt-5">
              <p className="text-xs text-graphite/50">قطعه‌های دیگر</p>
              <nav className="mt-2" aria-label="انتخاب قطعه از آرشیو">
                {products.map((item, index) => (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={selectedIndex === index}
                    aria-controls="selected-product-record"
                    onClick={() => selectProduct(index)}
                    className={`flex w-full items-center justify-between gap-4 border-b border-silver/70 py-3 text-right text-sm transition-colors ${selectedIndex === index ? "text-sapphire" : "text-graphite/70 hover:text-graphite"}`}
                  >
                    <span>{item.name}</span>
                    <span className="shrink-0 text-xs text-graphite/45">{toPersianNumber(index + 1)}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section className="mt-16 flex flex-col justify-between gap-5 border-t border-silver pt-6 sm:flex-row sm:items-end lg:mt-24" aria-label="طراحی اختصاصی">
          <div>
            <h2 className="text-lg font-medium">به‌دنبال فرمی دیگر هستی؟</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-graphite/65">ایده یا تصویرت را برای بررسی طراحی اختصاصی بفرست؛ لازم نیست از پیش همه‌چیز را بدانی.</p>
          </div>
          <Link href="/custom-design" className="w-fit border-b border-sapphire pb-1 text-sm text-sapphire transition-colors hover:text-graphite">رفتن به استودیو طراحی</Link>
        </section>
      </div>
    </main>
  );
}
