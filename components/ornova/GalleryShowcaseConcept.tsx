"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { findGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { galleryRoomStands, type GalleryRoomStand } from "@/lib/constants/gallery-room";
import { roomSamplesWithCatalog, type GalleryRoomSample } from "@/lib/constants/gallery-room-samples";
import type { Product } from "@/lib/constants/products";
import { GalleryStandSurface } from "./GalleryStandSurface";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const shelves = [
  { top: 13.5 }, { top: 23.35 }, { top: 33.1 },
  { top: 42.35 }, { top: 51.5 }, { top: 60.6 },
] as const;

function PlacedStand({ stand, sample, left, base, width, table = false }: {
  stand: GalleryRoomStand; sample?: GalleryRoomSample; left: number; base: number; width: number; table?: boolean;
}) {
  const [bx, by, bw, bh] = stand.bounds;
  const [iw, ih] = stand.image;
  const style = {
    left: `${left}%`, bottom: `${100 - base}%`, width: `${width}%`, aspectRatio: `${bw} / ${bh}`,
    "--asset-width": `${iw / bw * 100}%`, "--asset-height": `${ih / bh * 100}%`,
    "--asset-left": `${-bx / bw * 100}%`, "--asset-top": `${-by / bh * 100}%`,
  } as CSSProperties;
  return <div className={`${styles.placedStand} ${table ? styles.tableStand : ""} ${stand.categoryId === "rings" && sample?.number === "05" ? styles.ringPhotoStand : ""}`} style={style} aria-hidden="true">
    <Image className={styles.standAsset} src={`/images/ornova/gallery/stands/${stand.asset}`} alt="" width={iw} height={ih} sizes={table ? "(max-width: 700px) 110px, 170px" : "90px"} />
    <GalleryStandSurface stand={stand} sample={sample} />
  </div>;
}

export function GalleryShowcaseConcept({ products, catalogUnavailable = false }: { products: Product[]; catalogUnavailable?: boolean }) {
  const samplesByCategory = useMemo(() => roomSamplesWithCatalog(products), [products]);
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  useEffect(() => {
    if (!activeCategory && !magazineOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (magazineOpen) setMagazineOpen(false);
      else setActiveCategory(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [activeCategory, magazineOpen]);

  const currentSample = (categoryId: string) => {
    const categorySamples = samplesByCategory[categoryId] ?? [];
    return categorySamples.length ? categorySamples[(indices[categoryId] ?? 0) % categorySamples.length] : undefined;
  };
  const activeStand = galleryRoomStands.find((stand) => stand.categoryId === activeCategory);
  const activeSample = activeCategory ? currentSample(activeCategory) : undefined;
  const linkedProduct = activeSample ? findGalleryProduct(products, activeSample) : null;
  const activeCount = activeCategory ? samplesByCategory[activeCategory]?.length ?? 0 : 0;
  const activeIndex = activeCategory ? (indices[activeCategory] ?? 0) % Math.max(activeCount, 1) : 0;
  const moveSample = (step: number) => {
    if (!activeCategory || activeCount < 2) return;
    setIndices((current) => ({ ...current, [activeCategory]: ((current[activeCategory] ?? 0) + step + activeCount) % activeCount }));
  };

  return <main className={styles.root} dir="rtl">
    <div className={styles.scene}>
      <Image
        className={styles.architecture}
        src="/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23.webp"
        alt="سالن اُرنوا با اُرُسی سه‌لنگهٔ فیروزه‌ای و کهربایی، ویترین خاتم‌کاری و نشان و شعار برجستهٔ more than metal روی دیوار کاهگلی"
        fill
        unoptimized
        preload
      />
      <Link href="/?galleryPanel=account" className={styles.door} aria-label="ورود به حساب کاربری">
        <span className={styles.doorTag} lang="en" dir="ltr">welcome</span>
      </Link>
      {galleryRoomStands.map((stand, index) => {
        const tier = shelves[index];
        return (
          <button
            key={stand.id}
            className={styles.shelf}
            style={{ top: `${tier.top}%`, animationDelay: `${index * -0.6}s` }}
            type="button"
            data-stand-id={stand.id}
            data-tooltip-dismissed={dismissedTooltip === stand.id || undefined}
            aria-label={`نمایش ${stand.label} روی میز`}
            onMouseLeave={() => setDismissedTooltip(null)}
            onBlur={() => setDismissedTooltip(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && dismissedTooltip !== stand.id) {
                event.stopPropagation();
                setDismissedTooltip(stand.id);
              }
            }}
            onClick={() => { setMagazineOpen(false); setActiveCategory(stand.categoryId); }}
          >
            <span className={styles.shelfGlow} aria-hidden="true" />
            <span className={styles.shelfLabel}>{stand.label}</span>
            <span className={styles.shelfTooltip} aria-hidden="true">{stand.label}</span>
          </button>
        );
      })}
      {activeStand && activeSample && <PlacedStand stand={activeStand} sample={activeSample} left={49.3} base={65.8} width={activeStand.categoryId === "rings" || activeStand.categoryId === "bracelets" ? 7.5 : 5.3} table />}
      <button type="button" className={styles.book} onClick={() => { setActiveCategory(null); setMagazineOpen(true); }} aria-label="باز کردن کتاب فهرست همهٔ آثار" />
      <Link href="/?galleryPanel=contact" className={styles.phone} aria-label="ارتباط با اُرنوا از تلفن گالری" />
      <Link href="/?galleryPanel=basket" className={styles.register} aria-label="باز کردن صندوق درخواست‌ها" />
    </div>
    <div className={styles.mobileShelfList} role="group" aria-label="دسته‌های ویترین">
      <button type="button" aria-pressed={magazineOpen} onClick={() => { setActiveCategory(null); setMagazineOpen(true); }}>کتاب آثار</button>
      {galleryRoomStands.map((stand) => <button key={stand.id} type="button" aria-pressed={activeCategory === stand.categoryId} onClick={() => { setMagazineOpen(false); setActiveCategory(stand.categoryId); }}>{stand.label}</button>)}
    </div>
    {activeStand && activeSample && <aside className={styles.dossier} aria-live="polite" aria-label="شناسنامهٔ اثر روی میز">
      <button className={styles.close} type="button" onClick={() => setActiveCategory(null)} aria-label="بستن شناسنامه">×</button>
      <OrnovaBrandMark className={styles.dossierBrand} />
      <p className={styles.kicker}>شناسنامهٔ اثر · {activeStand.label}</p>
      <h1>{linkedProduct?.name ?? activeSample.title}</h1>
      <figure className={styles.mobileProduct}><Image src={activeSample.src} alt={activeSample.title} width={activeSample.image[0]} height={activeSample.image[1]} sizes="90vw" unoptimized /></figure>
      <dl><div><dt>شناسهٔ تصویر</dt><dd>{activeSample.number}</dd></div><div><dt>گروه</dt><dd>{activeStand.label}</dd></div></dl>
      {linkedProduct ? <Link className={styles.request} href={`/?galleryPanel=product&product=${encodeURIComponent(linkedProduct.slug)}`}>مشخصات و ثبت درخواست خرید ←</Link> : <p className={styles.pending}>مشخصات سفارش این اثر هنوز تأیید نشده است.</p>}
      <div className={styles.navigation}><button type="button" onClick={() => moveSample(-1)} disabled={activeCount < 2}>اثر قبلی</button><span>{new Intl.NumberFormat("fa-IR").format(activeIndex + 1)} از {new Intl.NumberFormat("fa-IR").format(activeCount)}</span><button type="button" onClick={() => moveSample(1)} disabled={activeCount < 2}>اثر بعدی</button></div>
    </aside>}
    {magazineOpen && <section className={styles.magazine} aria-label="کتاب فهرست آثار">
      <button type="button" className={styles.close} onClick={() => setMagazineOpen(false)} aria-label="بستن فهرست">×</button>
      <OrnovaBrandMark className={styles.dossierBrand} />
      <h1>کتاب آثار اُرنوا</h1>
      <p>دستهٔ موردنظرت را انتخاب کن تا آثار آن روی میز نمایش داده شوند.</p>
      <div className={styles.magazineCategories}>{galleryRoomStands.map((stand) => <button key={stand.id} type="button" onClick={() => { setMagazineOpen(false); setActiveCategory(stand.categoryId); }}><span>{stand.label}</span><small>{new Intl.NumberFormat("fa-IR").format(samplesByCategory[stand.categoryId]?.length ?? 0)} تصویر</small></button>)}</div>
      {catalogUnavailable && <p className={styles.pending}>فهرست برخط محصولات موقتاً در دسترس نیست؛ تصویرهای تأییدشدهٔ گالری نمایش داده می‌شوند.</p>}
      <Link href="/?galleryPanel=magazine">دیدن فهرست کامل و مجموعه‌های مناسبتی ←</Link>
    </section>}
    {!activeCategory && !magazineOpen && <p className={styles.hint}>یکی از طبقه‌های ویترین را انتخاب کن؛ محصول روی میز نمایان می‌شود.</p>}
  </main>;
}
