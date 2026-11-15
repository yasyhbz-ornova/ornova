"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { OrnovaProductDossier } from "./OrnovaProductDossier";
import type { Product } from "@/lib/constants/products";
import dossierStyles from "./ShopSurface.module.css";
import styles from "./CollectionsArchive.module.css";

const number = new Intl.NumberFormat("fa-IR");

export function CollectionsArchive({ products }: { products: Product[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const selectedIndex = products.findIndex((product) => product.slug === selectedSlug);
  const selectedProduct = products[selectedIndex] ?? null;
  const coverProduct = useMemo(() => products.find((product) => product.slug === "silent-vase-pin") ?? products[0], [products]);

  const closeDossier = useCallback(() => {
    setSelectedSlug(null);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  const moveDossier = useCallback((step: number) => {
    if (!products.length) return;
    setSelectedSlug((current) => {
      const currentIndex = products.findIndex((product) => product.slug === current);
      const nextIndex = (currentIndex + step + products.length) % products.length;
      return products[nextIndex]?.slug ?? null;
    });
  }, [products]);

  useEffect(() => {
    if (!selectedProduct) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDossier();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDossier, selectedProduct]);

  function trapDialogFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.opening} aria-labelledby="collections-title">
        <div className={styles.openingCopy}>
          <p className={styles.kicker}>دفتر مجموعه‌ها <span>·</span> ORNOVA BY YAS</p>
          <h1 id="collections-title">قطعاتی که برای ماندن، آرام طراحی شده‌اند.</h1>
          <p className={styles.intro}>آرشیوی کوچک از طراحی‌های اُرنوا. هر قطعه را از نزدیک ببین، شناسنامه‌اش را ورق بزن و اگر خواستی برای بررسی درخواستش به صندوق بسپار.</p>
          <a className={styles.openArchive} href="#collection-index">ورود به فهرست مجموعه‌ها <span aria-hidden="true">↓</span></a>
        </div>
        {coverProduct && <figure className={styles.cover}>
          <button type="button" className={styles.coverButton} aria-haspopup="dialog" aria-label={`بازکردن شناسنامهٔ ${coverProduct.name}`} onClick={(event) => { returnFocusRef.current = event.currentTarget; setSelectedSlug(coverProduct.slug); }}>
            <span className={styles.coverImage}><Image src={coverProduct.image} alt={coverProduct.name} fill priority sizes="(max-width: 760px) 100vw, 54vw" /></span>
          </button>
          <figcaption><span>{coverProduct.category}</span><strong>{coverProduct.name}</strong><small>تصویر آرشیویِ همین قطعه</small></figcaption>
        </figure>}
      </section>

      <section id="collection-index" className={styles.archive} aria-labelledby="collection-index-title">
        <header className={styles.archiveHeading}>
          <div><p className={styles.kicker}>فهرست انتخاب‌ها</p><h2 id="collection-index-title">از نزدیک ورق بزن.</h2></div>
          <p>برای بازکردن شناسنامه، خودِ تصویر یا نام قطعه را انتخاب کن.</p>
        </header>
        <div className={styles.grid}>
          {products.map((product, index) => <article className={styles.card} key={product.slug}>
            <button type="button" className={styles.productButton} aria-haspopup="dialog" aria-label={`بازکردن شناسنامهٔ ${product.name}`} onClick={(event) => { returnFocusRef.current = event.currentTarget; setSelectedSlug(product.slug); }}>
              <span className={styles.productImage}><Image src={product.image} alt={product.name} fill loading={index < 2 ? "eager" : "lazy"} sizes="(max-width: 760px) 100vw, 33vw" /><small>{number.format(index + 1)} / آرشیو</small></span>
              <span className={styles.productMeta}><span>{product.category}</span><span>قابل درخواست</span></span>
              <span className={styles.productName}>{product.name}</span>
              <span className={styles.productDescription}>{product.description}</span>
              <span className={styles.productAction}>خواندن شناسنامه <span aria-hidden="true">↖</span></span>
            </button>
          </article>)}
        </div>
      </section>

      {selectedProduct && <div ref={dialogRef} className={dossierStyles.productOverlay} role="dialog" aria-modal="true" aria-labelledby="product-dossier-title" tabIndex={-1} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDossier(); }} onKeyDown={trapDialogFocus}>
        <div className={dossierStyles.productDialogBody}>
          <button ref={closeButtonRef} type="button" className={dossierStyles.productClose} onClick={closeDossier} aria-label="بستن شناسنامه">بستن <span aria-hidden="true">×</span></button>
          <OrnovaProductDossier product={selectedProduct} onPrevious={() => moveDossier(-1)} onNext={() => moveDossier(1)} productPosition={selectedIndex + 1} totalProducts={products.length} />
        </div>
      </div>}
    </div>
  );
}
