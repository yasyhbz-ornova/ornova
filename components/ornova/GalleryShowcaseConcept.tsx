"use client";

import Image from "next/image";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type Ref } from "react";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { catalogCategories, type CatalogCategoryId } from "@/lib/constants/catalog";
import { galleryRoomStands } from "@/lib/constants/gallery-room";
import { findGalleryShowcasePhoto, trayVisibleShowcaseEntries, type GalleryShowcasePhoto } from "@/lib/constants/gallery-room-samples";
import type { Product } from "@/lib/constants/products";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import { GalleryRoomGuide, useGalleryRoomGuide, type GalleryGuideStop } from "./GalleryRoomGuide";
import { GalleryTrayBackdrop, GalleryTrayDossier } from "./GalleryTray";
import styles from "./GalleryShowcaseConcept.module.css";

const roomMedium = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-1280.webp";
const roomLarge = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-1670.webp";

const shelves = [
  { top: 13.5 }, { top: 23.35 }, { top: 33.1 },
  { top: 42.35 }, { top: 51.5 }, { top: 60.6 },
] as const;
const shelfSymbols = {
  "ring-display": "ring",
  "brooch-display": "brooch",
  "ear-display": "earrings",
  "set-display": "set",
  "pendant-display": "pendant",
  "bracelet-display": "bracelet",
} satisfies Record<(typeof galleryRoomStands)[number]["id"], string>;
const number = new Intl.NumberFormat("fa-IR");
const motionPreference = "(prefers-reduced-motion: reduce)";
const workInterval = 12_000;

function subscribeToMotionPreference(listener: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

type PhotoReturn = { label: string; onBack(): void };
export type GalleryShowcaseHandle = { openPhoto(photo: GalleryShowcasePhoto, returnTo: PhotoReturn): boolean };

export function GalleryShowcaseConcept({ products, catalogUnavailable = false, panelOpen = false, productPreview, onOpenPanel, ref }: {
  products: Product[];
  catalogUnavailable?: boolean;
  panelOpen?: boolean;
  productPreview?: { product: Pick<Product, "slug" | "categoryId">; backLabel?: string; onClose(): void };
  onOpenPanel?: (href: string) => void;
  ref?: Ref<GalleryShowcaseHandle>;
}) {
  const router = useRouter();
  const guide = useGalleryRoomGuide();
  const tooltipPrefix = useId();
  const entriesByCategory = useMemo(() => trayVisibleShowcaseEntries(products), [products]);
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [table, setTable] = useState<{ categoryId: CatalogCategoryId; returnTo?: PhotoReturn; fromShelf?: boolean } | null>(null);
  const previewEntry = productPreview
    ? entriesByCategory[productPreview.product.categoryId]?.find((entry) => entry.product?.slug === productPreview.product.slug)
    : undefined;
  const previewProduct = previewEntry?.product;
  const activeCategory = previewProduct?.categoryId ?? table?.categoryId ?? null;
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [hoveredShelf, setHoveredShelf] = useState<string | null>(null);
  const [focusedShelf, setFocusedShelf] = useState<string | null>(null);
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  const [paperHovered, setPaperHovered] = useState(false);
  const [paperFocused, setPaperFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, () => window.matchMedia(motionPreference).matches, () => true);
  const returnFocus = useRef<HTMLElement | null>(null);
  const backToGallery = useRef<HTMLButtonElement>(null);
  const roomBook = useRef<HTMLButtonElement>(null);
  const closeMagazine = useRef<HTMLButtonElement>(null);
  const tableOpen = activeCategory !== null;
  const pointedShelf = hoveredShelf ?? focusedShelf;
  const visibleTooltip = !tableOpen && !magazineOpen && !panelOpen && pointedShelf !== dismissedTooltip ? pointedShelf : null;

  useEffect(() => {
    if (!visibleTooltip) return;
    function dismiss(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      setDismissedTooltip(visibleTooltip);
    }
    window.addEventListener("keydown", dismiss, true);
    return () => window.removeEventListener("keydown", dismiss, true);
  }, [visibleTooltip]);

  useEffect(() => {
    if (panelOpen) return;
    if (tableOpen) backToGallery.current?.focus();
    else if (magazineOpen) closeMagazine.current?.focus();
    else {
      returnFocus.current?.focus();
      returnFocus.current = null;
    }
  }, [tableOpen, magazineOpen, panelOpen, previewProduct?.slug]);

  function showCategory(id: CatalogCategoryId, trigger?: HTMLElement, returnTo?: PhotoReturn) {
    if (!entriesByCategory[id]?.length) return;
    const fromShelf = Boolean(trigger?.dataset.standId || trigger?.dataset.shelfIndex);
    if (fromShelf) guide.follow("showcase");
    setHoveredShelf(null);
    if (trigger) returnFocus.current = trigger;
    else if (returnTo && !magazineOpen) returnFocus.current = null;
    setPaperHovered(false);
    setPaperFocused(false);
    if (!returnTo) setMagazineOpen(false);
    setTable({ categoryId: id, returnTo, fromShelf });
  }

  useImperativeHandle(ref, () => ({
    openPhoto(photo, returnTo) {
      const position = findGalleryShowcasePhoto(entriesByCategory, photo);
      if (!position) return false;
      setIndices((current) => ({ ...current, [position.categoryId]: position.index }));
      showCategory(position.categoryId, undefined, returnTo);
      return true;
    },
  }));

  function closeTable() {
    if (previewProduct && productPreview) {
      productPreview.onClose();
      if (!table && !productPreview.backLabel) window.requestAnimationFrame(() => roomBook.current?.focus());
      return;
    }
    setTable(null);
    table?.returnTo?.onBack();
  }

  function showMagazine(trigger: HTMLElement) {
    guide.follow("magazine");
    if (onOpenPanel) {
      onOpenPanel("/?galleryPanel=magazine");
      return;
    }
    returnFocus.current = trigger;
    setMagazineOpen(true);
  }

  function handleEscape(event: KeyboardEvent<HTMLElement>) {
    if (panelOpen || event.key !== "Escape" || event.defaultPrevented) return;
    if (tableOpen) {
      event.stopPropagation();
      closeTable();
    } else if (magazineOpen) {
      event.stopPropagation();
      setMagazineOpen(false);
    } else if (guide.dismiss()) {
      event.stopPropagation();
    }
  }

  function openBasket() {
    if (onOpenPanel) onOpenPanel("/?galleryPanel=basket");
    else router.push("/?galleryPanel=basket");
  }

  function panelLink(href: string, stop?: GalleryGuideStop): Pick<LinkProps, "href" | "onNavigate" | "prefetch"> {
    return {
      href,
      prefetch: false,
      onNavigate: (event) => {
        if (stop) guide.follow(stop);
        if (onOpenPanel) {
          event.preventDefault();
          onOpenPanel(href);
        }
      },
    };
  }
  const activeEntries = activeCategory ? entriesByCategory[activeCategory] ?? [] : [];
  const activeCount = activeEntries.length;
  const activeIndex = activeCategory ? (indices[activeCategory] ?? 0) % Math.max(activeCount, 1) : 0;
  const activeEntry = previewEntry ?? activeEntries[activeIndex];
  const activeSample = activeEntry?.sample;
  const trayImage = activeSample?.trayImage;
  const linkedProduct = activeEntry?.product;
  const canRequestProduct = linkedProduct?.galleryPlacementVerified === true && Boolean(linkedProduct.standImage);
  const canChangeWork = !previewProduct && !table?.returnTo;
  const autoAdvance = !reducedMotion && canChangeWork;

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
    setIndices((current) => ({ ...current, [activeCategory]: ((current[activeCategory] ?? 0) + step + activeCount) % activeCount }));
  };

  return <main className={styles.root} dir="rtl" onKeyDown={handleEscape}>
    <div className={styles.scene} data-table-open={tableOpen || undefined} data-shelf-approach={(tableOpen && table?.fromShelf && !previewProduct) || undefined}>
      <div className={styles.roomView} inert={tableOpen || magazineOpen || panelOpen}>
        <picture>
          <source media="(max-width: 700px)" srcSet="/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-840.webp" />
          <img
            className={styles.architecture}
            src={roomLarge}
            srcSet={`${roomMedium} 1280w, ${roomLarge} 1670w`}
            sizes="100vw"
            width={1670}
            height={942}
            alt="سالن اُرنوا با اُرُسی سه‌لنگهٔ فیروزه‌ای و کهربایی، ویترین خاتم‌کاری و نشان و شعار برجستهٔ more than metal روی دیوار کاهگلی"
            fetchPriority="high"
          />
        </picture>
      <Link {...panelLink("/?galleryPanel=studio", "studio")} className={styles.door} aria-label="ورود به کارگاه طراحی">
        <span className={styles.doorTag} lang="en" dir="ltr">welcome</span>
      </Link>
      {galleryRoomStands.map((stand, index) => {
        const tier = shelves[index];
        const count = entriesByCategory[stand.categoryId]?.length ?? 0;
        const tooltip = `${tooltipPrefix}-${stand.id}`;
        return (
          <div
            key={stand.id}
            className={styles.shelf}
            style={{ top: `${tier.top}%`, animationDelay: `${index * -0.6}s` }}
            data-tooltip-open={visibleTooltip === stand.id || undefined}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return;
              setHoveredShelf(stand.id);
              setDismissedTooltip(null);
            }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") setHoveredShelf(null); }}
          >
            <button
              className={styles.shelfTrigger}
              type="button"
              data-stand-id={stand.id}
              aria-disabled={!count || undefined}
              aria-label={count ? `نمایش ${stand.label} روی میز` : stand.label}
              aria-describedby={tooltip}
              onFocus={(event) => {
                if (!event.currentTarget.matches(":focus-visible")) return;
                setFocusedShelf(stand.id);
                setDismissedTooltip(null);
              }}
              onBlur={() => setFocusedShelf(null)}
              onClick={(event) => showCategory(stand.categoryId, event.currentTarget)}
            >
              <span className={styles.shelfGlow} aria-hidden="true" />
              <Image
                className={styles.shelfSign}
                data-category-symbol={stand.categoryId}
                src={`/images/ornova/gallery/review/silver-emblem-${shelfSymbols[stand.id]}-v1.webp`}
                width={112}
                height={88}
                unoptimized
                alt=""
              />
            </button>
            <div id={tooltip} className={styles.shelfTooltip} role="tooltip">
              <span aria-hidden="true">{stand.label}</span>
              <small>{count ? `${number.format(count)} اثر روی سینی` : "در حال تکمیل"}</small>
            </div>
          </div>
        );
      })}
      <button ref={roomBook} type="button" className={styles.book} onClick={(event) => showMagazine(event.currentTarget)} aria-label="باز کردن کتاب فهرست همهٔ آثار" />
      <Link {...panelLink("/?galleryPanel=phone", "phone")} className={styles.phone} aria-label="ارتباط با اُرنوا از تلفن گالری" />
      <Link {...panelLink("/?galleryPanel=basket", "cashier")} className={styles.register} aria-label="باز کردن صندوق درخواست‌ها" />
      <div className={styles.mobileShelfIndex} role="group" aria-label="دسته‌های ویترین">
        {galleryRoomStands.map((stand) => <button
          key={stand.id}
          type="button"
          data-shelf-index={stand.id}
          disabled={!entriesByCategory[stand.categoryId]?.length}
          onClick={(event) => showCategory(stand.categoryId, event.currentTarget)}
        >{stand.label}</button>)}
      </div>
      {!tableOpen && !magazineOpen && !panelOpen && <GalleryRoomGuide step={guide.step} />}
      </div>
      <section className={styles.tableView} inert={!tableOpen || panelOpen} aria-hidden={!tableOpen || panelOpen || undefined} aria-label="نمای نزدیک میز و سینی">
        {tableOpen && <GalleryTrayBackdrop />}
        {tableOpen && <>
          <button ref={backToGallery} type="button" className={styles.backToGallery} onClick={closeTable}>{(previewProduct ? productPreview?.backLabel : table?.returnTo?.label) ?? "بازگشت به گالری"} <span aria-hidden="true">↙</span></button>
          {activeEntry && <><div className={styles.tableComposition} role="group" aria-label="سینی مخمل آبی افغانی">
            <div className={styles.tableDisplay}>
              <div key={linkedProduct?.slug ?? activeSample?.number} className={styles.tableProduct}>
                {linkedProduct?.standImage
                  ? <div className={styles.catalogCutout} data-table-product={linkedProduct.slug}>
                      <Image src={linkedProduct.standImage} alt={linkedProduct.name} fill sizes="(max-width: 700px) 124px, 260px" loading="eager" unoptimized />
                    </div>
                  : activeSample && trayImage && <div className={styles.archiveCutout} data-gallery-product-number={activeSample.number} data-tray-cutout>
                        <Image src={trayImage} alt={activeSample.title} fill sizes="(max-width: 700px) 140px, 352px" loading="eager" unoptimized />
                      </div>}
              </div>
            </div>
            <div
              className={styles.tablePaper}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaperHovered(true); }}
              onPointerLeave={() => setPaperHovered(false)}
              onFocus={() => setPaperFocused(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaperFocused(false); }}
            >
              <GalleryTrayDossier
                name={activeEntry.product ? activeEntry.product.name : activeEntry.sample.title}
                archivePhoto={activeEntry.product ? undefined : activeEntry.sample.number}
                details={linkedProduct?.details}
                live={autoAdvance ? "off" : "polite"}
              />
            </div>
          </div>
          <div className={styles.tableActions} role="group" aria-label="سفارش و ورق زدن آثار">
            {canChangeWork && activeCount > 1 && <button type="button" className={styles.trayArrow} aria-label="اثر قبلی" onClick={() => moveSample(-1)}><span aria-hidden="true" /></button>}
            <div
              className={styles.orderAction}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaperHovered(true); }}
              onPointerLeave={() => setPaperHovered(false)}
              onFocus={() => setPaperFocused(true)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaperFocused(false); }}
            >
              {linkedProduct && canRequestProduct
                ? <RequestBasketButton key={linkedProduct.slug} item={{ slug: linkedProduct.slug, name: linkedProduct.name, category: linkedProduct.category }} label="ثبت سفارش" keepExistingQuantity onAdded={openBasket} />
                : activeSample && <Link {...panelLink(`/?galleryPanel=account&complete=1&archive=${activeSample.number}`)}>ثبت سفارش</Link>}
            </div>
            {canChangeWork && activeCount > 1 && <button type="button" className={styles.trayArrow} aria-label="اثر بعدی" onClick={() => moveSample(1)}><span aria-hidden="true" /></button>}
          </div></>}
        </>}
      </section>
    </div>
    {magazineOpen && <section className={styles.magazine} hidden={tableOpen} inert={panelOpen || tableOpen} aria-label="کتاب فهرست آثار">
      <button ref={closeMagazine} type="button" className={styles.close} onClick={() => setMagazineOpen(false)} aria-label="بستن فهرست">×</button>
      <OrnovaBrandMark className={styles.dossierBrand} />
      <h1>کتاب آثار اُرنوا</h1>
      <p>دستهٔ موردنظرت را انتخاب کن تا آثار آن روی میز نمایش داده شوند.</p>
      <div className={styles.magazineCategories}>{catalogCategories.map((category) => {
        const count = entriesByCategory[category.id]?.length ?? 0;
        if (!count) return null;
        return <button key={category.id} type="button" onClick={() => showCategory(category.id)}><span>{category.label}</span><small>{number.format(count)} اثر</small></button>;
      })}</div>
      <div className={styles.magazineLinks}>
        <Link {...panelLink("/?galleryPanel=account")}>حساب من</Link>
      </div>
      {catalogUnavailable && <p className={styles.pending}>فهرست برخط محصولات موقتاً در دسترس نیست؛ تصویرهای تأییدشدهٔ گالری نمایش داده می‌شوند.</p>}
    </section>}
  </main>;
}
