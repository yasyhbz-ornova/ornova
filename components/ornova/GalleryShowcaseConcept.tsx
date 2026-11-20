"use client";

import Image from "next/image";
import Link from "next/link";
import { Circle, Gem, Link2, Moon, Pin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { findGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { galleryRoomStands, type GalleryRoomStand } from "@/lib/constants/gallery-room";
import { roomSamplesWithCatalog, type GalleryRoomSample } from "@/lib/constants/gallery-room-samples";
import type { Product } from "@/lib/constants/products";
import { GalleryStandSurface } from "./GalleryStandSurface";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const shelves = [
  { base: 22.8, top: 11.6, width: 6.3, Icon: Circle },
  { base: 32.7, top: 22.8, width: 3.5, Icon: Pin },
  { base: 42.2, top: 32.7, width: 3.5, Icon: Sparkles },
  { base: 51.6, top: 42.2, width: 3.5, Icon: Gem },
  { base: 61.0, top: 51.6, width: 3.5, Icon: Moon },
  { base: 70.1, top: 61.0, width: 6.3, Icon: Link2 },
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
  const [pointerOverShelf, setPointerOverShelf] = useState(false);
  const turn = useRef(0);

  useEffect(() => {
    if (activeCategory || magazineOpen || pointerOverShelf) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const categoryId = galleryRoomStands[turn.current++ % galleryRoomStands.length].categoryId;
      const count = samplesByCategory[categoryId]?.length ?? 0;
      if (count > 1) setIndices((current) => ({ ...current, [categoryId]: ((current[categoryId] ?? 0) + 1) % count }));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeCategory, magazineOpen, pointerOverShelf, samplesByCategory]);

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
      <Image className={styles.architecture} src="/images/ornova/gallery/review/entry-ornova-blue-benches-photoreal-v16.png" alt="سالن بازبینی اُرنوا؛ فرش لاکی، دو نیمکت آبی، میز نمایش مرکزی و ویترین شش‌طبقه" fill sizes="(max-width: 700px) 180vw, 100vw" unoptimized priority />
      <div className={styles.plaque}><OrnovaBrandMark className={styles.brandMark} /></div>
      <Link href="/?galleryPanel=account" className={styles.door} aria-label="ورود به حساب کاربری"><span>welcome</span></Link>
      {galleryRoomStands.map((stand, index) => {
        const tier = shelves[index];
        return <div key={stand.id}>
          <PlacedStand stand={stand} sample={currentSample(stand.categoryId)} left={90.5} base={tier.base} width={tier.width} />
          <button className={styles.shelf} style={{ top: `${tier.top}%` }} type="button" data-stand-id={stand.id} aria-label={`نمایش ${stand.label} روی میز`} onPointerEnter={() => setPointerOverShelf(true)} onPointerLeave={() => setPointerOverShelf(false)} onClick={() => { setMagazineOpen(false); setActiveCategory(stand.categoryId); }}>
            <span className={styles.shelfLabel}><tier.Icon size={15} strokeWidth={1.5} aria-hidden="true" />{stand.label}</span>
          </button>
        </div>;
      })}
      {activeStand && activeSample && <PlacedStand stand={activeStand} sample={activeSample} left={49.3} base={66.0} width={activeStand.categoryId === "rings" || activeStand.categoryId === "bracelets" ? 14 : 8} table />}
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
