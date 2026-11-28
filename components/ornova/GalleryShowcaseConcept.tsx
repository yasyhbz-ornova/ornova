"use client";

import Image from "next/image";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type Ref } from "react";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { catalogCategories, type CatalogCategoryId } from "@/lib/constants/catalog";
import { findGalleryBirthMonth } from "@/lib/constants/collections";
import { galleryRoomStands } from "@/lib/constants/gallery-room";
import { findGalleryShowcasePhoto, showcaseEntryTrayImage, trayVisibleShowcaseEntries, type GalleryShowcasePhoto } from "@/lib/constants/gallery-room-samples";
import type { Product } from "@/lib/constants/products";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import { GalleryRoomGuide, useGalleryRoomGuide, type GalleryGuideStop } from "./GalleryRoomGuide";
import { GalleryTrayBackdrop, GalleryTrayDossier } from "./GalleryTray";
import styles from "./GalleryShowcaseConcept.module.css";

const roomMedium = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-1280.webp";
const roomLarge = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-1670.webp";
const portraitAvifSmall = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-portrait-v2-460.avif";
const portraitAvifLarge = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-portrait-v2-768.avif";
const portraitWebpSmall = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-portrait-v2-460.webp";
const portraitWebpLarge = "/images/ornova/gallery/review/entry-ornova-orosi-hatam-portrait-v2-768.webp";
const portraitMedia = "(max-width: 700px) and (orientation: portrait)";
const portraitSizes = "(max-aspect-ratio: 426/923) 46.154vh, 100vw";

const shelves = [
  { top: 13.5, portraitTop: 31.25 }, { top: 23.35, portraitTop: 35.15 }, { top: 33.1, portraitTop: 39.04 },
  { top: 42.35, portraitTop: 42.91 }, { top: 51.5, portraitTop: 46.77 }, { top: 60.6, portraitTop: 50.63 },
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

function shelfHref(categoryId: CatalogCategoryId, index = 0) {
  return `/?galleryPanel=tray&category=${encodeURIComponent(categoryId)}${index ? `&position=${index}` : ""}`;
}

function subscribeToMotionPreference(listener: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

type PhotoReturn = { label: string; onBack(): void };
type WorkPreview = ({ product: Pick<Product, "slug" | "categoryId"> } | { photo: GalleryShowcasePhoto }) & {
  backLabel?: string;
  backHref?: string;
  onClose(): void;
};
export type GalleryShowcaseHandle = { openPhoto(photo: GalleryShowcasePhoto, returnTo: PhotoReturn): boolean };

export function GalleryShowcaseConcept({ products, catalogUnavailable = false, panelOpen = false, initialShelf, workPreview, onOpenPanel, ref }: {
  products: Product[];
  catalogUnavailable?: boolean;
  panelOpen?: boolean;
  initialShelf?: { category?: string; position?: string };
  workPreview?: WorkPreview;
  onOpenPanel?: (href: string) => void;
  ref?: Ref<GalleryShowcaseHandle>;
}) {
  const router = useRouter();
  const guide = useGalleryRoomGuide();
  const tooltipPrefix = useId();
  const entriesByCategory = useMemo(() => trayVisibleShowcaseEntries(products), [products]);
  const initialCategory = galleryRoomStands.find(({ categoryId }) => categoryId === initialShelf?.category)?.categoryId;
  const [indices, setIndices] = useState<Record<string, number>>(() => {
    if (!initialCategory) return {};
    const index = Number(initialShelf?.position);
    const count = entriesByCategory[initialCategory]?.length ?? 0;
    return Number.isInteger(index) && index > 0 && index < count ? { [initialCategory]: index } : {};
  });
  const [table, setTable] = useState<{ categoryId: CatalogCategoryId; returnTo?: PhotoReturn; fromShelf?: boolean; fromLink?: boolean } | null>(
    () => initialCategory && entriesByCategory[initialCategory]?.length ? { categoryId: initialCategory, fromLink: true } : null,
  );
  const previewEntry = useMemo(() => {
    if (!workPreview) return undefined;
    if ("product" in workPreview) {
      const { categoryId, slug } = workPreview.product;
      return entriesByCategory[categoryId]?.find((entry) => entry.product?.slug === slug);
    }
    const position = findGalleryShowcasePhoto(entriesByCategory, workPreview.photo);
    return position ? entriesByCategory[position.categoryId]?.[position.index] : undefined;
  }, [entriesByCategory, workPreview]);
  const previewIdentity = previewEntry?.product?.slug ?? previewEntry?.sample?.src;
  const activeCategory = previewEntry?.product?.categoryId ?? previewEntry?.sample?.categoryId ?? table?.categoryId ?? null;
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [hoveredShelf, setHoveredShelf] = useState<string | null>(null);
  const [focusedShelf, setFocusedShelf] = useState<string | null>(null);
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  const [paperHovered, setPaperHovered] = useState(false);
  const [paperFocused, setPaperFocused] = useState(false);
  const [manualWorkTitle, setManualWorkTitle] = useState("");
  const [roomArtReady, setRoomArtReady] = useState(false);
  const markRoomArtReady = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setRoomArtReady(true);
  }, []);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, () => window.matchMedia(motionPreference).matches, () => true);
  const returnFocus = useRef<HTMLElement | null>(null);
  const backToGallery = useRef<HTMLElement | null>(null);
  const setBackToGallery = useCallback((element: HTMLElement | null) => { backToGallery.current = element; }, []);
  const roomBook = useRef<HTMLAnchorElement>(null);
  const closeMagazine = useRef<HTMLButtonElement>(null);
  const tableOpen = activeCategory !== null;
  const visibleGuideStop = !tableOpen && !magazineOpen && !panelOpen ? guide.stop : undefined;
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
  }, [tableOpen, magazineOpen, panelOpen, previewIdentity]);

  function showCategory(id: CatalogCategoryId, trigger?: HTMLElement, returnTo?: PhotoReturn) {
    if (!entriesByCategory[id]?.length) return;
    const fromShelf = Boolean(trigger?.dataset.standId);
    if (fromShelf) guide.follow("showcase");
    setHoveredShelf(null);
    if (trigger) returnFocus.current = trigger;
    else if (returnTo && !magazineOpen) returnFocus.current = null;
    setPaperHovered(false);
    setPaperFocused(false);
    setManualWorkTitle("");
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
    if (previewEntry && workPreview) {
      workPreview.onClose();
      if (!table && !workPreview.backLabel) window.requestAnimationFrame(() => roomBook.current?.focus());
      return;
    }
    if (table?.fromLink && new URLSearchParams(window.location.search).get("galleryPanel") === "tray") {
      window.history.replaceState(window.history.state, "", "/");
      const stand = galleryRoomStands.find(({ categoryId }) => categoryId === table.categoryId);
      if (stand) returnFocus.current = document.querySelector(`[data-stand-id="${stand.id}"]`);
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
  const trayImage = activeEntry && showcaseEntryTrayImage(activeEntry);
  const linkedProduct = activeEntry?.product;
  const canRequestProduct = linkedProduct?.galleryPlacementVerified === true && Boolean(linkedProduct.standImage);
  const canChangeWork = !previewEntry && !table?.returnTo;
  const autoAdvance = !reducedMotion && canChangeWork;
  const backLabel = (previewEntry ? workPreview?.backLabel : table?.returnTo?.label) ?? "بازگشت به گالری";
  const backHref = previewEntry ? workPreview?.backHref : table?.fromLink ? "/" : undefined;

  useEffect(() => {
    if (!activeCategory || activeCount < 2 || !autoAdvance || panelOpen || paperHovered || paperFocused) return;
    const category = activeCategory;
    let timer: number;
    function schedule() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        setManualWorkTitle("");
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
    const nextIndex = (activeIndex + step + activeCount) % activeCount;
    const work = activeEntries[nextIndex];
    setManualWorkTitle(work.product?.name ?? work.sample?.title ?? "");
    setIndices((current) => ({ ...current, [activeCategory]: nextIndex }));
    if (table?.fromLink) window.history.replaceState(window.history.state, "", shelfHref(activeCategory, nextIndex));
  };

  function trayArrow(step: number, label: string) {
    if (!canChangeWork || !activeCategory || activeCount < 2) return null;
    if (table?.fromLink) {
      const href = shelfHref(activeCategory, (activeIndex + step + activeCount) % activeCount);
      return <Link href={href} prefetch={false} className={styles.trayArrow} aria-label={label} onNavigate={(event) => { event.preventDefault(); moveSample(step); }}><span aria-hidden="true" /></Link>;
    }
    return <button type="button" className={styles.trayArrow} aria-label={label} onClick={() => moveSample(step)}><span aria-hidden="true" /></button>;
  }

  return <main className={styles.root} dir="rtl" onKeyDown={handleEscape}>
    <div className={styles.scene} data-table-open={tableOpen || undefined} data-shelf-approach={(tableOpen && table?.fromShelf && !previewEntry) || undefined}>
      <div className={styles.roomView} data-room-art-ready={roomArtReady || undefined} inert={tableOpen || magazineOpen || panelOpen}>
        <picture>
          <source media={portraitMedia} type="image/avif" srcSet={`${portraitAvifSmall} 460w, ${portraitAvifLarge} 768w`} sizes={portraitSizes} />
          <source media={portraitMedia} srcSet={`${portraitWebpSmall} 460w, ${portraitWebpLarge} 768w`} sizes={portraitSizes} />
          <source media="(max-width: 700px)" srcSet="/images/ornova/gallery/review/entry-ornova-orosi-hatam-v23-840.webp" />
          <img
            ref={markRoomArtReady}
            onLoad={(event) => markRoomArtReady(event.currentTarget)}
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
      <Link {...panelLink("/?galleryPanel=studio", "studio")} className={styles.door} data-guide-current={visibleGuideStop === "studio" || undefined} aria-label="ورود به کارگاه طراحی">
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
            style={{ "--shelf-top": `${tier.top}%`, "--portrait-shelf-top": `${tier.portraitTop}%`, animationDelay: `${index * -0.6}s` } as CSSProperties}
            data-tooltip-open={visibleTooltip === stand.id || undefined}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return;
              setHoveredShelf(stand.id);
              setDismissedTooltip(null);
            }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") setHoveredShelf(null); }}
          >
            <a
              className={styles.shelfTrigger}
              data-guide-current={visibleGuideStop === "showcase" || undefined}
              href={count ? shelfHref(stand.categoryId) : undefined}
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
              onClick={(event) => {
                if (!count || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                showCategory(stand.categoryId, event.currentTarget);
              }}
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
            </a>
            <div id={tooltip} className={styles.shelfTooltip} role="tooltip">
              <span aria-hidden="true">{stand.label}</span>
              <small>{count ? `${number.format(count)} اثر روی سینی` : "در حال تکمیل"}</small>
            </div>
          </div>
        );
      })}
      <Link ref={roomBook} href="/?galleryPanel=magazine" prefetch={false} className={styles.book} data-guide-current={visibleGuideStop === "magazine" || undefined} onNavigate={(event) => {
        if (!roomBook.current) return;
        event.preventDefault();
        showMagazine(roomBook.current);
      }} aria-label="باز کردن کتاب فهرست همهٔ آثار" />
      <Link {...panelLink("/?galleryPanel=phone", "phone")} className={styles.phone} data-guide-current={visibleGuideStop === "phone" || undefined} aria-label="ارتباط با اُرنوا از تلفن گالری" />
      <Link {...panelLink("/?galleryPanel=basket", "cashier")} className={styles.register} data-guide-current={visibleGuideStop === "cashier" || undefined} aria-label="باز کردن صندوق درخواست‌ها" />
      {!tableOpen && !magazineOpen && !panelOpen && <GalleryRoomGuide step={guide.step} />}
      </div>
      <section className={`${styles.tableView} ${styles.trayViewport}`} inert={!tableOpen || panelOpen} aria-hidden={!tableOpen || panelOpen || undefined} aria-label="نمای نزدیک میز و سینی">
        {tableOpen && <GalleryTrayBackdrop />}
        {tableOpen && <>
          {backHref
            ? <Link ref={setBackToGallery} href={backHref} prefetch={false} className={styles.backToGallery} onNavigate={(event) => { event.preventDefault(); closeTable(); }}>{backLabel} <span aria-hidden="true">↙</span></Link>
            : <button ref={setBackToGallery} type="button" className={styles.backToGallery} onClick={closeTable}>{backLabel} <span aria-hidden="true">↙</span></button>}
          {activeEntry && <><div className={styles.tableComposition} role="group" aria-label="سینی مخمل آبی افغانی">
            {autoAdvance && <span role="status" className="sr-only">{manualWorkTitle}</span>}
            <div className={styles.tableDisplay} data-tray-category={activeCategory}>
              <div key={linkedProduct?.slug ?? activeSample?.number} className={styles.tableProduct}>
                {linkedProduct && trayImage
                  ? <div className={styles.catalogCutout} data-table-product={linkedProduct.slug}>
                      <Image src={trayImage} alt={linkedProduct.name} fill sizes="(max-width: 700px) 220px, 352px" loading="eager" unoptimized />
                    </div>
                  : activeSample && trayImage && <div className={styles.archiveCutout} data-gallery-product-number={activeSample.number} data-tray-cutout>
                        <Image src={trayImage} alt={activeSample.title} fill sizes="(max-width: 700px) 240px, 384px" loading="eager" unoptimized />
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
                archive={activeEntry.product ? undefined : {
                  number: activeEntry.sample.number,
                  category: catalogCategories.find(({ id }) => id === activeCategory)?.label,
                  month: findGalleryBirthMonth(activeEntry.sample)?.name,
                }}
                details={linkedProduct?.details}
                live={autoAdvance ? "off" : "polite"}
              />
            </div>
          </div>
          <div className={styles.tableActions} role="group" aria-label="سفارش و ورق زدن آثار">
            {trayArrow(-1, "اثر قبلی")}
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
            {trayArrow(1, "اثر بعدی")}
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
