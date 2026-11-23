"use client";

import Image from "next/image";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { displayDossierField } from "@/lib/catalog/dossier-fields";
import { catalogCategories, type CatalogCategoryId } from "@/lib/constants/catalog";
import { galleryRoomStands } from "@/lib/constants/gallery-room";
import { galleryShowcaseEntries, type GalleryRoomSample } from "@/lib/constants/gallery-room-samples";
import type { Product } from "@/lib/constants/products";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const shelves = [
  { top: 13.5 }, { top: 23.35 }, { top: 33.1 },
  { top: 42.35 }, { top: 51.5 }, { top: 60.6 },
] as const;
const number = new Intl.NumberFormat("fa-IR");
const motionPreference = "(prefers-reduced-motion: reduce)";
const workInterval = 12_000;
const tablePreviewPhoto = "05";

function subscribeToMotionPreference(listener: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function TrayRing({ sample }: { sample: GalleryRoomSample }) {
  const clipId = useId();
  // Trace only the metal and stone in the source 1008 × 634 photo, not the cushion.
  return <svg className={styles.trayRing} viewBox="270 30 465 214" role="img" aria-label={sample.title} data-gallery-product-number={sample.number}>
    <defs><clipPath id={clipId}>
      <path clipRule="evenodd" d="M531 35 Q548 35 545 56 Q585 91 589 151 Q590 169 585 180 Q628 155 677 157 Q719 155 727 191 Q684 192 632 206 L574 220 Q574 236 554 230 Q520 243 491 229 Q469 242 468 218 L466 199 L322 196 Q278 196 276 168 Q274 135 303 121 Q334 108 380 99 Q485 75 519 56 Q515 39 531 35Z M312 163 Q353 146 468 124 Q454 153 457 187 Q357 189 312 165Z" />
    </clipPath></defs>
    <image href={sample.src} width={sample.image[0]} height={sample.image[1]} clipPath={`url(#${clipId})`} />
  </svg>;
}

export function GalleryShowcaseConcept({ products, catalogUnavailable = false, panelOpen = false, onOpenPanel }: {
  products: Product[]; catalogUnavailable?: boolean; panelOpen?: boolean; onOpenPanel?: (href: string) => void;
}) {
  const router = useRouter();
  const entriesByCategory = useMemo(() => {
    const entries = galleryShowcaseEntries(products);
    for (const category of catalogCategories) {
      const categoryEntries = entries[category.id];
      if (categoryEntries) {
        entries[category.id] = categoryEntries.filter(({ product, sample }) =>
          product ? product.galleryPlacementVerified === true && Boolean(product.standImage)
            : sample?.number === tablePreviewPhoto,
        );
      }
    }
    return entries;
  }, [products]);
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<CatalogCategoryId | null>(null);
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  const [autoPaused, setAutoPaused] = useState(false);
  const [paperHovered, setPaperHovered] = useState(false);
  const [paperFocused, setPaperFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, () => window.matchMedia(motionPreference).matches, () => true);
  const returnFocus = useRef<HTMLElement | null>(null);
  const backToGallery = useRef<HTMLButtonElement>(null);
  const closeMagazine = useRef<HTMLButtonElement>(null);
  const tableOpen = activeCategory !== null;

  useEffect(() => {
    if (tableOpen) backToGallery.current?.focus();
    else if (magazineOpen) closeMagazine.current?.focus();
    else {
      returnFocus.current?.focus();
      returnFocus.current = null;
    }
  }, [tableOpen, magazineOpen]);

  function showCategory(id: CatalogCategoryId, trigger?: HTMLElement) {
    if (!entriesByCategory[id]?.length) return;
    if (trigger) returnFocus.current = trigger;
    setAutoPaused(true);
    setPaperHovered(false);
    setPaperFocused(false);
    setMagazineOpen(false);
    setActiveCategory(id);
  }

  function showMagazine(trigger: HTMLElement) {
    returnFocus.current = trigger;
    setMagazineOpen(true);
  }

  function handleEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (tableOpen) {
      event.stopPropagation();
      setActiveCategory(null);
    } else if (magazineOpen) {
      event.stopPropagation();
      setMagazineOpen(false);
    }
  }

  function openBasket() {
    if (onOpenPanel) onOpenPanel("/?galleryPanel=basket");
    else router.push("/?galleryPanel=basket");
  }

  function panelLink(href: string): Pick<LinkProps, "href" | "onNavigate"> {
    return {
      href,
      onNavigate: onOpenPanel ? (event) => {
        event.preventDefault();
        onOpenPanel(href);
      } : undefined,
    };
  }
  const activeStand = galleryRoomStands.find((stand) => stand.categoryId === activeCategory);
  const categoryLabel = activeStand?.label ?? catalogCategories.find((category) => category.id === activeCategory)?.label;
  const activeEntries = activeCategory ? entriesByCategory[activeCategory] ?? [] : [];
  const activeCount = activeEntries.length;
  const activeIndex = activeCategory ? (indices[activeCategory] ?? 0) % Math.max(activeCount, 1) : 0;
  const activeEntry = activeEntries[activeIndex];
  const activeSample = activeEntry?.sample;
  const linkedProduct = activeEntry?.product;
  const canRequestProduct = linkedProduct?.galleryPlacementVerified === true && Boolean(linkedProduct.standImage);
  const workName = linkedProduct?.name ?? activeSample?.title;
  const workDetails = linkedProduct?.details ?? [];
  const material = displayDossierField(workDetails, "material");
  const stone = displayDossierField(workDetails, "stone");
  const stoneColor = displayDossierField(workDetails, "stoneColor");
  const weight = displayDossierField(workDetails, "weight");
  const dimensions = displayDossierField(workDetails, "dimensions");
  const autoAdvance = !autoPaused && !reducedMotion;

  useEffect(() => {
    if (!activeCategory || activeCount < 2 || !autoAdvance || panelOpen || paperHovered || paperFocused) return;
    const category = activeCategory;
    let timer: number;
    function schedule() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        setIndices((current) => ({ ...current, [category]: (activeIndex + 1) % activeCount }));
      }, workInterval);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [activeCategory, activeCount, activeIndex, autoAdvance, panelOpen, paperHovered, paperFocused]);

  const moveSample = (step: number) => {
    if (!activeCategory || activeCount < 2) return;
    setAutoPaused(true);
    setIndices((current) => ({ ...current, [activeCategory]: ((current[activeCategory] ?? 0) + step + activeCount) % activeCount }));
  };

  return <main className={styles.root} dir="rtl" onKeyDown={handleEscape}>
    <div className={styles.scene} data-table-open={tableOpen || undefined}>
      <div className={styles.roomView} inert={tableOpen || magazineOpen}>
        <Image
        className={styles.architecture}
        src="/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23.webp"
        alt="سالن اُرنوا با اُرُسی سه‌لنگهٔ فیروزه‌ای و کهربایی، ویترین خاتم‌کاری و نشان و شعار برجستهٔ more than metal روی دیوار کاهگلی"
        fill
        unoptimized
        preload
      />
      <Link {...panelLink("/?galleryPanel=account")} className={styles.door} aria-label="ورود به حساب کاربری">
        <span className={styles.doorTag} lang="en" dir="ltr">welcome</span>
      </Link>
      {galleryRoomStands.map((stand, index) => {
        const tier = shelves[index];
        const available = Boolean(entriesByCategory[stand.categoryId]?.length);
        return (
          <button
            key={stand.id}
            className={styles.shelf}
            style={{ top: `${tier.top}%`, animationDelay: `${index * -0.6}s` }}
            type="button"
            data-stand-id={stand.id}
            data-tooltip-dismissed={dismissedTooltip === stand.id || undefined}
            aria-disabled={!available || undefined}
            aria-label={available ? `نمایش ${stand.label} روی میز` : stand.label}
            onMouseLeave={() => setDismissedTooltip(null)}
            onBlur={() => setDismissedTooltip(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && dismissedTooltip !== stand.id) {
                event.stopPropagation();
                setDismissedTooltip(stand.id);
              }
            }}
            onClick={(event) => showCategory(stand.categoryId, event.currentTarget)}
          >
            <span className={styles.shelfGlow} aria-hidden="true" />
            <span className={styles.shelfTooltip} aria-hidden="true">{stand.label}</span>
          </button>
        );
      })}
      <button type="button" className={styles.book} onClick={(event) => showMagazine(event.currentTarget)} aria-label="باز کردن کتاب فهرست همهٔ آثار" />
      <Link {...panelLink("/?galleryPanel=contact")} className={styles.phone} aria-label="ارتباط با اُرنوا از تلفن گالری" />
      <Link {...panelLink("/?galleryPanel=basket")} className={styles.register} aria-label="باز کردن صندوق درخواست‌ها" />
      </div>
      <section className={styles.tableView} inert={!tableOpen} aria-label="نمای نزدیک میز و سینی">
        {tableOpen && <picture className={styles.seatedPicture}>
          <source media="(max-width: 700px) and (orientation: portrait)" srcSet="/images/ornova/gallery/review/ornova-velvet-tray-mobile-v1.webp" />
          <Image className={styles.architecture} src="/images/ornova/gallery/review/ornova-velvet-tray-desktop-v1.webp" alt="" fill sizes="100vw" unoptimized loading="eager" />
        </picture>}
        {tableOpen && <>
          <button ref={backToGallery} type="button" className={styles.backToGallery} onClick={() => setActiveCategory(null)}>بازگشت به گالری <span aria-hidden="true">↙</span></button>
          {activeEntry && <><div className={styles.tableComposition} role="group" aria-label="سینی مخمل آبی افغانی">
            <div className={styles.tableDisplay}>
              <div key={linkedProduct?.slug ?? activeSample?.number} className={styles.tableProduct}>
                {linkedProduct?.standImage
                  ? <div className={styles.catalogCutout} data-table-product={linkedProduct.slug}>
                      <Image src={linkedProduct.standImage} alt={linkedProduct.name} fill sizes="(max-width: 700px) 124px, 260px" unoptimized />
                    </div>
                  : activeSample && <TrayRing sample={activeSample} />}
              </div>
            </div>
            <div
              className={styles.tablePaper}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaperHovered(true); }}
              onPointerLeave={() => setPaperHovered(false)}
              onFocus={() => setPaperFocused(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaperFocused(false); }}
            >
              <article className={styles.dossier} tabIndex={0} aria-live={autoAdvance ? "off" : "polite"} aria-label="شناسنامهٔ اثر روی میز">
                <header className={styles.dossierHeader}>
                  <span lang="en" dir="ltr">Ornova by Yas</span>
                  <span>شناسنامهٔ اثر</span>
                </header>
                <div className={styles.workName}>
                  <span>نام طرح</span><h1>{workName}</h1>
                </div>
                <dl className={styles.workDetails}>
                  <div><dt>دسته</dt><dd>{linkedProduct?.category ?? categoryLabel}</dd></div>
                  <div><dt>جنس</dt><dd>{material || "نامشخص"}</dd></div>
                  <div><dt>سنگ</dt><dd>{stone || "نامشخص"}</dd></div>
                  <div><dt>وزن</dt><dd>{weight || "نامشخص"}</dd></div>
                  {stoneColor && <div><dt>رنگ سنگ</dt><dd>{stoneColor}</dd></div>}
                  {dimensions && <div><dt>ابعاد</dt><dd>{dimensions}</dd></div>}
                </dl>
              </article>
            </div>
          </div>
          <div className={styles.tableActions}>
          <div
            className={styles.reservation}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaperHovered(true); }}
            onPointerLeave={() => setPaperHovered(false)}
            onFocus={() => setPaperFocused(true)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaperFocused(false); }}
          >
            {linkedProduct && canRequestProduct
              ? <RequestBasketButton key={linkedProduct.slug} item={{ slug: linkedProduct.slug, name: linkedProduct.name, category: linkedProduct.category }} label="درخواست رزرو" onAdded={openBasket} />
              : <>
                  <button type="button" disabled aria-describedby="gallery-reservation-status">درخواست رزرو</button>
                  <p id="gallery-reservation-status" className={styles.reservationStatus}>فعلاً قابل رزرو نیست</p>
                </>}
          </div>
          {activeCount > 1 && <div className={styles.navigation} role="group" aria-label="ورق زدن آثار این دسته">
            <button type="button" aria-label="اثر قبلی" onClick={() => moveSample(-1)}><span aria-hidden="true">→</span></button>
            <span>{number.format(activeIndex + 1)} از {number.format(activeCount)}</span>
            <button type="button" aria-label="اثر بعدی" onClick={() => moveSample(1)}><span aria-hidden="true">←</span></button>
            {!reducedMotion && <button type="button" onClick={() => setAutoPaused((paused) => !paused)} aria-label={autoAdvance ? "توقف تعویض خودکار" : "ادامهٔ تعویض خودکار"}>
              <span aria-hidden="true">{autoAdvance ? "Ⅱ" : "▷"}</span>
            </button>}
          </div>}
          </div></>}
        </>}
      </section>
    </div>
    <div className={styles.mobileShelfList} hidden={tableOpen} inert={magazineOpen} role="group" aria-label="دسته‌های ویترین">
      <button type="button" aria-pressed={magazineOpen} onClick={(event) => showMagazine(event.currentTarget)}>کتاب آثار</button>
      {galleryRoomStands.map((stand) => <button key={stand.id} type="button" disabled={!entriesByCategory[stand.categoryId]?.length} onClick={(event) => showCategory(stand.categoryId, event.currentTarget)}>{stand.label}</button>)}
    </div>
    {magazineOpen && <section className={styles.magazine} aria-label="کتاب فهرست آثار">
      <button ref={closeMagazine} type="button" className={styles.close} onClick={() => setMagazineOpen(false)} aria-label="بستن فهرست">×</button>
      <OrnovaBrandMark className={styles.dossierBrand} />
      <h1>کتاب آثار اُرنوا</h1>
      <p>دستهٔ موردنظرت را انتخاب کن تا آثار آن روی میز نمایش داده شوند.</p>
      <div className={styles.magazineCategories}>{catalogCategories.map((category) => {
        const count = entriesByCategory[category.id]?.length ?? 0;
        if (!count) return null;
        return <button key={category.id} type="button" onClick={() => showCategory(category.id)}><span>{category.label}</span><small>{number.format(count)} اثر</small></button>;
      })}</div>
      {catalogUnavailable && <p className={styles.pending}>فهرست برخط محصولات موقتاً در دسترس نیست؛ تصویرهای تأییدشدهٔ گالری نمایش داده می‌شوند.</p>}
      <Link {...panelLink("/?galleryPanel=magazine")}>دیدن فهرست کامل و مجموعه‌های مناسبتی ←</Link>
    </section>}
  </main>;
}
