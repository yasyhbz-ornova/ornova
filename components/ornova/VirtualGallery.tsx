"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { WorkshopBookPage } from "@/components/ornova/GalleryAccountPanel";
import type { GuideChapter } from "@/components/ornova/GalleryGuidePanel";
import type { StudioInquiryMode } from "@/components/studio/DesignStudio";
import { GalleryShowcaseConcept, type GalleryShowcaseHandle } from "./GalleryShowcaseConcept";
import { OrnovaSymbol } from "./OrnovaBrandMark";
import { findGalleryShowcasePhoto, galleryRoomSamples, galleryRoomSamplesByCategory, showcaseEntryTrayImage, trayVisibleShowcaseEntries, type GalleryShowcasePhoto } from "@/lib/constants/gallery-room-samples";
import { galleryTrayWorkImage } from "@/lib/constants/gallery-tray-cutouts";
import { isPublicGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { findGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { buildMagazineIndex, emptyMagazineFilters, findMagazineWorks, type MagazineFilters } from "@/lib/catalog/magazine-index";
import { catalogCategories, catalogFamilies } from "@/lib/constants/catalog";
import { galleryCollections } from "@/lib/constants/collections";
import type { Product } from "@/lib/constants/products";
import { REQUEST_LINE_ID_PATTERN } from "@/lib/commerce/request-basket";
import { getAuthCallbackErrorMessage } from "@/lib/auth/inputs";
import { isStudioId } from "@/lib/studio/conversation";
import styles from "./VirtualGallery.module.css";

function LoadingLeaf() { return <p role="status" className={styles.intro}>در حال بازکردن صفحه…</p>; }
const InquiryForm = dynamic(() => import("@/components/commerce/InquiryForm").then((mod) => mod.InquiryForm), { loading: LoadingLeaf });
const RingDesignBuilder = dynamic(() => import("@/components/commerce/RingDesignBuilder").then((mod) => mod.RingDesignBuilder), { loading: LoadingLeaf });
const RequestBasketView = dynamic(() => import("@/components/commerce/RequestBasketView").then((mod) => mod.RequestBasketView), { loading: LoadingLeaf });
const GalleryCashierReceipts = dynamic(() => import("@/components/commerce/GalleryCashierReceipts").then((mod) => mod.GalleryCashierReceipts), { loading: LoadingLeaf });
const GalleryAccountPanel = dynamic(() => import("@/components/ornova/GalleryAccountPanel").then((mod) => mod.GalleryAccountPanel), { loading: LoadingLeaf });
const GalleryGuidePanel = dynamic(() => import("@/components/ornova/GalleryGuidePanel").then((mod) => mod.GalleryGuidePanel), { loading: LoadingLeaf });
const GalleryLibraryPanel = dynamic(() => import("@/components/ornova/GalleryLibraryPanel").then((mod) => mod.GalleryLibraryPanel), { loading: LoadingLeaf });
const GalleryPhoneNotebook = dynamic(() => import("@/components/ornova/GalleryPhoneNotebook").then((mod) => mod.GalleryPhoneNotebook), { loading: LoadingLeaf });
const DesignStudio = dynamic(() => import("@/components/studio/DesignStudio").then((mod) => mod.DesignStudio), { loading: LoadingLeaf });

const number = new Intl.NumberFormat("fa-IR");
type GalleryPanel = "magazine" | "phone" | "contact" | "studio" | "about" | "account" | "library" | "basket" | "ring-builder" | "size-guide" | "guide";
type Chapter = { kind: "category" | "collection"; id: string };
type Drawer = Chapter | { kind: GalleryPanel };
export type GalleryLocation = { panel?: string; category?: string; position?: string; collection?: string; month?: string; product?: string; archive?: string; from?: string };
type TrayWork = { product: Product } | { photo: GalleryShowcasePhoto };
type TraySelection = TrayWork & {
  origin?: { drawer: Drawer; backLabel: string; focusId?: string; month?: string; previous: TraySelection | null };
};
const galleryPanelEvent = "ornova-gallery-panel-change";
const magazineHref = "/?galleryPanel=magazine";

function chapterHref(kind: Chapter["kind"], id: string, month?: string) {
  return `${magazineHref}&${kind}=${encodeURIComponent(id)}${month ? `&month=${encodeURIComponent(month)}` : ""}`;
}

function setMagazineHref(href: string, mode: "pushState" | "replaceState") {
  window.history[mode](window.history.state, "", href);
  window.dispatchEvent(new Event(galleryPanelEvent));
}

function magazineChapter(location: GalleryLocation = {}) {
  if (location.panel !== "magazine" && location.panel !== "product") return null;
  const { category, collection } = location;
  if (!collection && category && catalogCategories.some(({ id }) => id === category)) return `category:${category}`;
  if (!category && collection && galleryCollections.some(({ id }) => id === collection)) return `collection:${collection}`;
  if (!category && !collection && location.panel === "product" && location.from === "magazine") return "magazine";
  return null;
}

function getMagazineChapterSnapshot() {
  return magazineChapter(readGalleryLocation());
}

function readGalleryLocation(): GalleryLocation {
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) => {
    const values = params.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  };
  return { panel: read("galleryPanel"), category: read("category"), collection: read("collection"), month: read("month"), product: read("product"), archive: read("archive"), from: read("from") };
}

function magazineDrawer(chapter: string | null): Chapter | null {
  if (!chapter) return null;
  const [kind, id] = chapter.split(":");
  return kind === "category" || kind === "collection" ? { kind, id } : null;
}

function trayHref(work: { product: string } | { archive: string }, drawer: Drawer | null, month?: string) {
  const params = new URLSearchParams({ galleryPanel: "product", ...work });
  if (drawer?.kind === "category" || drawer?.kind === "collection") {
    params.set(drawer.kind, drawer.id);
    if (month) params.set("month", month);
  } else if (drawer?.kind === "magazine") params.set("from", "magazine");
  return `/?${params}`;
}

function GalleryIndexWork({ id, name, image, href, caption, archiveNumber, onOpen }: { id: string; name: string; image: string; href: string; caption?: string; archiveNumber?: string; onOpen(): void }) {
  return <li>
    <Link id={id} href={href} prefetch={false} className={styles.indexWork} data-archive-photo={archiveNumber} aria-label={`نمایش ${name}${caption ? `، ${caption}` : ""} روی سینی`} onNavigate={(event) => { event.preventDefault(); onOpen(); }}>
      <span className={styles.indexWorkImage}><Image src={image} alt="" fill sizes="66px" unoptimized /></span>
      <span>{caption && <small className={styles.indexWorkCaption}>{caption}</small>}{name}</span>
    </Link>
  </li>;
}
function subscribeToGalleryPanel(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(galleryPanelEvent, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(galleryPanelEvent, onChange);
  };
}

function getGalleryPanelSnapshot(): GalleryPanel | null {
  const params = new URLSearchParams(window.location.search);
  const panel = params.get("galleryPanel");
  if (panel === "contact" && !params.has("product") && !params.has("from") && !params.has("archive")) return "phone";
  return panel === "phone" || panel === "contact" || panel === "basket" || panel === "studio" || panel === "account" || panel === "library" || panel === "magazine" || panel === "about" || panel === "ring-builder" || panel === "size-guide" || panel === "guide" ? panel : null;
}
function getGalleryGuideChapterSnapshot(): GuideChapter {
  const params = new URLSearchParams(window.location.search);
  const chapter = params.get("chapter");
  return params.get("galleryPanel") === "guide" && (chapter === "faq" || chapter === "silver-care" || chapter === "silver-properties") ? chapter : "overview";
}
function trayKey(location: GalleryLocation = {}): string | null {
  if (location.panel !== "product") return null;
  if (location.product && !location.archive) return `product:${location.product}`;
  if (location.archive && !location.product) return `archive:${location.archive}`;
  return null;
}
function getGalleryTraySnapshot() { return trayKey(readGalleryLocation()); }
function getGalleryMonthSnapshot() { return readGalleryLocation().month ?? null; }
function getGalleryStudioDraftSnapshot(): string | null {
  const params = new URLSearchParams(window.location.search);
  const draft = params.get("draft");
  return params.get("galleryPanel") === "studio" && isStudioId(draft) ? draft : null;
}
function getWorkshopBookSnapshot(): WorkshopBookPage | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("galleryPanel") !== "studio") return null;
  const page = params.get("customerPage");
  if (page === "profile" || page === "orders" || page === "idea") return page;
  return isStudioId(params.get("draft")) ? "idea" : null;
}
function getGalleryCompletionSnapshot() { return new URLSearchParams(window.location.search).get("complete") === "1"; }
function getCheckoutArchiveSnapshot() {
  const params = new URLSearchParams(window.location.search);
  return params.get("galleryPanel") === "account" && params.get("complete") === "1" ? params.get("archive") : null;
}
function getCashierViewSnapshot() {
  const params = new URLSearchParams(window.location.search);
  return params.get("galleryPanel") === "basket" && params.get("view") === "receipts" ? params.get("receipt") ?? "" : null;
}
function getGalleryAuthErrorSnapshot() {
  const params = new URLSearchParams(window.location.search);
  return params.get("galleryPanel") === "account" ? getAuthCallbackErrorMessage(params.get("error")) : null;
}
function getGallerySignOutFailureSnapshot() {
  const params = new URLSearchParams(window.location.search);
  return params.get("galleryPanel") === "account" && params.get("signout") === "failed";
}
function getGalleryContactSnapshot(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("galleryPanel") !== "contact") return null;
  const context = {
    productSlug: params.get("product") ?? undefined,
    archivePhoto: params.get("archive") ?? undefined,
    selection: params.get("selection") ?? undefined,
    sourceContext: params.get("from") === "custom-design" || params.get("from") === "ring-builder" ? params.get("from") : undefined,
    requestBasketContext: params.get("from") === "request-basket",
    studioReview: params.get("from") === "workshop-review",
    intent: params.get("intent") === "price" || params.get("intent") === "question" ? params.get("intent") : undefined,
    withoutDraft: params.get("withoutDraft") === "1",
  };
  return JSON.stringify(context);
}

export function VirtualGallery({ imageMode, galleryProducts: products, catalogUnavailable = false, studioDraftOwner = null, initialLocation }: { imageMode: "offline" | "preview"; galleryProducts: Product[]; catalogUnavailable?: boolean; studioDraftOwner?: string | null; initialLocation?: GalleryLocation }) {
  const showcaseRef = useRef<GalleryShowcaseHandle>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const returnDrawerFocusId = useRef<string | undefined>(undefined);
  const [sizeGuideFromBuilder, setSizeGuideFromBuilder] = useState(false);
  const returnPanel = useSyncExternalStore(subscribeToGalleryPanel, getGalleryPanelSnapshot, () => initialLocation?.panel === "magazine" ? "magazine" : null);
  const chapter = useSyncExternalStore(subscribeToGalleryPanel, getMagazineChapterSnapshot, () => magazineChapter(initialLocation));
  const linkedTrayKey = useSyncExternalStore(subscribeToGalleryPanel, getGalleryTraySnapshot, () => trayKey(initialLocation));
  const linkedMonth = useSyncExternalStore(subscribeToGalleryPanel, getGalleryMonthSnapshot, () => initialLocation?.month ?? null);
  const studioDraftId = useSyncExternalStore(subscribeToGalleryPanel, getGalleryStudioDraftSnapshot, () => null);
  const workshopBookPage = useSyncExternalStore(subscribeToGalleryPanel, getWorkshopBookSnapshot, () => null);
  const accountCompletionMode = useSyncExternalStore(subscribeToGalleryPanel, getGalleryCompletionSnapshot, () => false);
  const checkoutArchive = useSyncExternalStore(subscribeToGalleryPanel, getCheckoutArchiveSnapshot, () => null);
  const receiptSelection = useSyncExternalStore(subscribeToGalleryPanel, getCashierViewSnapshot, () => null);
  const accountInitialError = useSyncExternalStore(subscribeToGalleryPanel, getGalleryAuthErrorSnapshot, () => null);
  const accountSignOutFailed = useSyncExternalStore(subscribeToGalleryPanel, getGallerySignOutFailureSnapshot, () => false);
  const guideChapter = useSyncExternalStore(subscribeToGalleryPanel, getGalleryGuideChapterSnapshot, (): GuideChapter => "overview");
  const contactContextSnapshot = useSyncExternalStore(subscribeToGalleryPanel, getGalleryContactSnapshot, () => null);
  const [drawerState, setDrawer] = useState<Drawer | null>(null);
  const [productTray, setProductTray] = useState<TraySelection | null>(null);
  const [studioContact, setStudioContact] = useState<{ mode: StudioInquiryMode; studioDraftId: string | null } | null>(null);
  const [accountReturnDestination, setAccountReturnDestination] = useState<string | undefined>();
  const [magazineFilters, setMagazineFilters] = useState<MagazineFilters>(emptyMagazineFilters);
  const magazineSearchInput = useRef<HTMLInputElement>(null);
  const checkoutPhoto = checkoutArchive ? galleryRoomSamples.find((photo) => photo.number === checkoutArchive && photo.trayImage) : undefined;
  const checkoutLoginPath = `/?galleryPanel=account&complete=1${checkoutPhoto ? `&archive=${checkoutPhoto.number}` : ""}`;
  const contactContext = useMemo(() => {
    if (!contactContextSnapshot) return null;
    try {
      const value: unknown = JSON.parse(contactContextSnapshot);
      return value && typeof value === "object" ? value as { productSlug?: string; archivePhoto?: string; selection?: string; sourceContext?: "custom-design" | "ring-builder"; requestBasketContext: boolean; studioReview: boolean; intent?: "price" | "question"; withoutDraft: boolean } : null;
    } catch { return null; }
  }, [contactContextSnapshot]);
  const contactSourceContext = studioContact?.mode === "transferred" ? "custom-design" : contactContext?.sourceContext;
  const contactProduct = useMemo(() => products.find((item) => item.slug === contactContext?.productSlug
    && item.publicationStatus === "published" && item.galleryPlacementVerified && item.standImage) ?? null, [contactContext?.productSlug, products]);
  const archiveOrder = contactContext?.archivePhoto === undefined ? null : galleryRoomSamples.find((photo) => photo.number === contactContext.archivePhoto && photo.trayImage) ?? null;
  const invalidArchiveOrder = contactContext?.archivePhoto !== undefined && !archiveOrder;
  const contactProductSelectionKey = contactProduct && contactContext?.selection !== undefined
    ? contactContext.selection === contactProduct.slug || REQUEST_LINE_ID_PATTERN.test(contactContext.selection) ? contactContext.selection : "invalid-selection"
    : undefined;
  const contactLoginNextPath = useMemo(() => {
    const params = new URLSearchParams();
    if (contactProduct) params.set("product", contactProduct.slug);
    if (archiveOrder) params.set("archive", archiveOrder.number);
    if (contactProductSelectionKey) params.set("selection", contactProductSelectionKey);
    if (contactSourceContext) params.set("from", contactSourceContext);
    else if (contactContext?.requestBasketContext) params.set("from", "request-basket");
    else if (studioContact?.mode === "review-existing" || contactContext?.studioReview) params.set("from", "workshop-review");
    if (contactProduct && contactContext?.intent) params.set("intent", contactContext.intent);
    if (contactContext?.sourceContext === "ring-builder" && contactContext.withoutDraft) params.set("withoutDraft", "1");
    return `/?galleryPanel=contact${params.size ? `&${params.toString()}` : ""}`;
  }, [archiveOrder, contactContext, contactProduct, contactProductSelectionKey, contactSourceContext, studioContact?.mode]);
  const linkedTray = useMemo<TraySelection | null>(() => {
    if (!linkedTrayKey) return null;
    const key = linkedTrayKey.slice(linkedTrayKey.indexOf(":") + 1);
    const product = linkedTrayKey.startsWith("product:") && products.find((item) => item.slug === key && isPublicGalleryProduct(item));
    const photo = linkedTrayKey.startsWith("archive:") && galleryRoomSamples.find((item) => item.number === key);
    if (!product && !photo) return null;
    if (photo && !findGalleryShowcasePhoto(trayVisibleShowcaseEntries(products), photo)) return null;
    const back = chapter === "magazine" ? { kind: "magazine" as const } : magazineDrawer(chapter);
    const month = back?.kind === "collection" && galleryCollections.find((item) => item.id === back.id)?.birthMonths?.some(({ id }) => id === linkedMonth) ? linkedMonth ?? undefined : undefined;
    const origin = back ? { drawer: back, backLabel: back.kind === "collection" ? "بازگشت به دفتر" : "بازگشت به صفحهٔ مجله", month, previous: null } : undefined;
    return product ? { product, origin } : photo ? { photo, origin } : null;
  }, [chapter, linkedMonth, linkedTrayKey, products]);
  const drawer = useMemo<Drawer | null>(() => {
    if (drawerState) return drawerState;
    if (returnPanel === "magazine") return magazineDrawer(chapter) ?? { kind: "magazine" };
    return returnPanel ? { kind: returnPanel } : null;
  }, [chapter, drawerState, returnPanel]);
  const tray = productTray ?? linkedTray;
  const [subtypeId, setSubtypeId] = useState<string | null>(null);
  const category = drawer?.kind === "category" ? catalogCategories.find((item) => item.id === drawer.id) : null;
  const activeCollection = drawer?.kind === "collection" ? galleryCollections.find((item) => item.id === drawer.id) : undefined;
  const needsMagazineIndex = drawer?.kind === "magazine" || Boolean(activeCollection?.flowerMonths);
  const magazineIndex = useMemo(() => needsMagazineIndex ? buildMagazineIndex(products) : [], [needsMagazineIndex, products]);
  const searchingMagazine = Boolean(magazineFilters.query.trim() || magazineFilters.category || magazineFilters.collection);
  const magazineWorks = useMemo(() => searchingMagazine ? findMagazineWorks(magazineIndex, magazineFilters) : [], [magazineIndex, magazineFilters, searchingMagazine]);
  const categoryProducts = useMemo(() => products.filter((product) => product.categoryId === category?.id && isPublicGalleryProduct(product)), [category?.id, products]);
  const availableTypes = category?.types.filter((type) => categoryProducts.some((product) => product.subtypeId === type.id)) ?? [];
  const filteredProducts = subtypeId ? categoryProducts.filter((product) => product.subtypeId === subtypeId) : categoryProducts;
  const archiveWorks = category && !subtypeId ? (galleryRoomSamplesByCategory[category.id] ?? []).flatMap((photo) =>
    photo.trayImage && !findGalleryProduct(products, photo) ? [{ photo, image: photo.trayImage }] : [],
  ) : [];
  const chapterStandImage = filteredProducts[0]?.standImage;
  const chapterImage = chapterStandImage ? galleryTrayWorkImage(chapterStandImage) : archiveWorks[0]?.image;

  const clearGalleryReturnState = useCallback(() => {
    const url = new URL(window.location.href);
    const activePanel = url.searchParams.get("galleryPanel");
    if (!getGalleryPanelSnapshot() && activePanel !== "product") return;
    url.searchParams.delete("galleryPanel");
    if (activePanel === "product") for (const key of ["product", "archive", "category", "collection", "month", "from"]) url.searchParams.delete(key);
    if (activePanel === "account") for (const key of ["complete", "archive", "next", "error", "signout"]) url.searchParams.delete(key);
    if (activePanel === "basket") for (const key of ["view", "receipt"]) url.searchParams.delete(key);
    if (activePanel === "contact") for (const key of ["draftTransfer", "product", "archive", "selection", "from", "intent", "withoutDraft"]) url.searchParams.delete(key);
    if (activePanel === "studio") for (const key of ["draft", "customerPage"]) url.searchParams.delete(key);
    if (activePanel === "guide") url.searchParams.delete("chapter");
    if (activePanel === "magazine") for (const key of ["category", "collection", "month"]) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }, []);

  const closeDrawer = useCallback(() => {
    clearGalleryReturnState();
    setDrawer(null);
    setStudioContact(null);
    setAccountReturnDestination(undefined);
    const trigger = returnFocusRef.current;
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, [clearGalleryReturnState]);

  const returnToMagazine = useCallback((from: Chapter) => {
    returnDrawerFocusId.current = `gallery-magazine-${from.kind}-${from.id}`;
    setSubtypeId(null);
    setDrawer(null);
    setMagazineHref(magazineHref, "replaceState");
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const focusId = returnDrawerFocusId.current;
      returnDrawerFocusId.current = undefined;
      const origin = focusId ? document.getElementById(focusId) : null;
      const returnTarget = origin && drawerRef.current?.contains(origin) ? origin : null;
      if (returnTarget) {
        returnTarget.focus({ preventScroll: true });
        returnTarget.scrollIntoView({ block: "nearest" });
      } else {
        const review = drawer.kind === "studio" && studioContact ? drawerRef.current?.querySelector<HTMLElement>("[data-studio-review]") : null;
        const heading = review ?? document.getElementById("gallery-drawer-title");
        (heading ?? drawerRef.current)?.focus({ preventScroll: true });
        review?.scrollIntoView({ block: "center" });
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (drawer.kind === "collection" || drawer.kind === "category") {
          returnToMagazine(drawer);
          return;
        }
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
        .filter((element) => !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = priorOverflow; window.cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKeyDown); };
  }, [closeDrawer, drawer, returnToMagazine, studioContact]);

  useEffect(() => {
    const clearLocalDrawer = () => { setDrawer(null); setProductTray(null); setSubtypeId(null); setStudioContact(null); };
    window.addEventListener("popstate", clearLocalDrawer);
    return () => window.removeEventListener("popstate", clearLocalDrawer);
  }, []);

  useEffect(() => {
    if (linkedTrayKey && !linkedTray) clearGalleryReturnState();
  }, [clearGalleryReturnState, linkedTray, linkedTrayKey]);

  useEffect(() => {
    if (drawer) drawerRef.current?.scrollTo(0, 0);
  }, [drawer]);

  function openDrawer(next: Drawer) {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && !activeElement.closest('[role="dialog"]')) {
      returnFocusRef.current = activeElement;
    }
    clearGalleryReturnState();
    setStudioContact(null);
    setDrawer(next);
  }
  function openStudioInquiry(mode: StudioInquiryMode) {
    clearGalleryReturnState();
    setStudioContact({ mode, studioDraftId });
    setDrawer({ kind: "contact" });
  }
  function openProductOnTray(product: Product, backLabel: string, focusId?: string) {
    if (!drawer || !isPublicGalleryProduct(product)) return;
    const previous = tray;
    clearGalleryReturnState();
    setProductTray({ product, origin: { drawer, backLabel, focusId, previous } });
    setDrawer(null);
  }
  function closeProductTray() {
    clearGalleryReturnState();
    const origin = tray?.origin;
    setProductTray(origin?.previous ?? null);
    if (origin) {
      restoreDrawer(origin.drawer, origin.focusId, origin.month);
    }
  }
  function openGalleryPanel(href: string) {
    if (href === "/?galleryPanel=basket" && !drawer && productTray?.origin?.drawer.kind === "basket") {
      closeProductTray();
      return;
    }
    if (linkedTray && !productTray) setProductTray(linkedTray);
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.history.pushState(window.history.state, "", href);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function openChapter(href: string) {
    setSubtypeId(null);
    setDrawer(null);
    setMagazineHref(href, "pushState");
  }
  function restoreDrawer(next: Drawer, focusId?: string, month?: string) {
    returnDrawerFocusId.current = focusId;
    setDrawer(next);
    if (next.kind === "category" || next.kind === "collection") setMagazineHref(chapterHref(next.kind, next.id, month), "replaceState");
    if (next.kind === "magazine") setMagazineHref(magazineHref, "replaceState");
  }
  function openGalleryPhoto(photo: GalleryShowcasePhoto, focusId: string, backLabel: string) {
    if (!drawer) return;
    const opened = showcaseRef.current?.openPhoto(photo, {
      label: backLabel,
      onBack() {
        restoreDrawer(drawer, focusId, selectedBirthMonth?.id);
      },
    });
    if (!opened) return;
    clearGalleryReturnState();
    setDrawer(null);
  }
  function openLibraryAccount() { setAccountReturnDestination("/?galleryPanel=library"); openDrawer({ kind: "account" }); }
  function continueCheckout() {
    setDrawer({ kind: "account" });
    window.history.pushState(window.history.state, "", "/?galleryPanel=account&complete=1");
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function reviewCheckout() {
    if (checkoutArchive !== null && !checkoutPhoto) return;
    const target = checkoutPhoto ? `archive=${checkoutPhoto.number}` : "from=request-basket";
    setDrawer({ kind: "contact" });
    window.history.pushState(window.history.state, "", `/?galleryPanel=contact&${target}`);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function showCashier(receipts = false, id?: string) {
    setDrawer({ kind: "basket" });
    const selection = id ? `&receipt=${encodeURIComponent(id)}` : "";
    window.history.pushState(window.history.state, "", `/?galleryPanel=basket${receipts ? `&view=receipts${selection}` : ""}`);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function selectCashierReceipt(id?: string) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("receipt", id);
    else url.searchParams.delete("receipt");
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function openRingBuilderProduct() {
    const product = products.find((item) => item.slug === "lajvard-shab-ring" && isPublicGalleryProduct(item));
    if (product) openProductOnTray(product, "بازگشت به طراحی انگشتر", "ring-builder-sample-product");
  }
  function openRingSizeGuide() {
    setSizeGuideFromBuilder(true);
    setDrawer({ kind: "size-guide" });
  }
  function openRingBuilderContact(withoutDraft: boolean) {
    const query = withoutDraft ? "?galleryPanel=contact&from=ring-builder&withoutDraft=1" : "?galleryPanel=contact&from=ring-builder";
    window.history.pushState(window.history.state, "", `/${query}`);
    setDrawer({ kind: "contact" });
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function returnToRingBuilder() {
    window.history.replaceState(window.history.state, "", "/?galleryPanel=ring-builder");
    window.dispatchEvent(new Event(galleryPanelEvent));
    setDrawer({ kind: "ring-builder" });
  }
  function handleDrawerBack() {
    if (drawer?.kind === "category" || drawer?.kind === "collection") { returnToMagazine(drawer); return; }
    if (drawer?.kind === "contact" && studioContact) { setDrawer({ kind: "studio" }); return; }
    if (drawer?.kind === "contact" && contactContext?.sourceContext === "ring-builder") { returnToRingBuilder(); return; }
    if (drawer?.kind === "size-guide" && sizeGuideFromBuilder) { setDrawer({ kind: "ring-builder" }); return; }
    closeDrawer();
  }
  function openBasketProduct(slug: string, focusId: string) {
    const product = products.find((item) => item.slug === slug && isPublicGalleryProduct(item));
    if (product) openProductOnTray(product, "بازگشت به صندوق", focusId);
  }
  const selectedBirthMonth = activeCollection?.birthMonths?.find((month) => month.id === linkedMonth) ?? activeCollection?.birthMonths?.[0];
  const hasCollectionPhotos = Boolean(activeCollection?.birthMonths || activeCollection?.flowerMonths);
  const collectionEntries = useMemo(() => hasCollectionPhotos ? trayVisibleShowcaseEntries(products) : null, [hasCollectionPhotos, products]);
  function collectionThumbnail(photo?: GalleryShowcasePhoto) {
    const position = collectionEntries && photo && findGalleryShowcasePhoto(collectionEntries, photo);
    const entry = position && collectionEntries?.[position.categoryId]?.[position.index];
    return entry ? showcaseEntryTrayImage(entry) : undefined;
  }
  const birthMonthWorks = selectedBirthMonth ? [
    { label: "دستبند زودیاک", title: selectedBirthMonth.bracelet, photo: selectedBirthMonth.braceletImage },
    { label: "نیم‌ست صورت فلکی", title: selectedBirthMonth.constellation, photo: selectedBirthMonth.constellationImage },
    { label: "آویز گل فیبوناچی", title: selectedBirthMonth.flowerPendant, photo: selectedBirthMonth.flowerImage },
  ].map((work) => ({ ...work, thumbnail: collectionThumbnail(work.photo) })) : [];
  const flowers = activeCollection?.flowerMonths?.map((month) => ({ ...month, thumbnail: collectionThumbnail(month.flowerImage) })) ?? [];
  const matchedFlowers = flowers.flatMap((month) => month.flowerImage && month.thumbnail
    ? [{ ...month, photo: month.flowerImage, thumbnail: month.thumbnail }] : []);
  const pendingFlowers = flowers.filter(({ thumbnail }) => !thumbnail);
  const otherFlowerPhotos = activeCollection?.flowerMonths ? findMagazineWorks(magazineIndex, { ...emptyMagazineFilters, collection: activeCollection.id }).flatMap(({ archive, image }) =>
    archive && !flowers.some(({ flowerImage }) => flowerImage?.number === archive.number) ? [{ archive, image }] : [],
  ) : [];
  const magazineChapterOpen = drawer?.kind === "category" || drawer?.kind === "collection";
  const magazineNavigation = magazineChapterOpen || drawer?.kind === "magazine";
  const trayOrigin = tray?.origin;
  const trayBack = trayOrigin?.drawer;
  const trayBackHref = trayBack?.kind === "category" || trayBack?.kind === "collection"
    ? chapterHref(trayBack.kind, trayBack.id, trayOrigin?.month)
    : trayBack?.kind === "magazine" ? magazineHref : "/";

  return <div className={`${styles.root} virtualGallery`} dir="rtl">
  <GalleryShowcaseConcept
    ref={showcaseRef}
    products={products}
    panelOpen={Boolean(drawer)}
    initialShelf={initialLocation?.panel === "tray" ? initialLocation : undefined}
    workPreview={tray ? { ...tray, backLabel: trayOrigin?.backLabel, backHref: linkedTray && !productTray ? trayBackHref : undefined, onClose: closeProductTray } : undefined}
    onOpenPanel={openGalleryPanel}
  />

    {drawer && <div className={styles.overlay} data-studio-open={drawer.kind === "studio" ? "true" : "false"} data-basket-open={drawer.kind === "basket" ? "true" : undefined} data-book-open={drawer.kind === "magazine" || drawer.kind === "category" || drawer.kind === "collection" || drawer.kind === "guide" || drawer.kind === "about" || drawer.kind === "size-guide" || undefined} data-phone-open={drawer.kind === "phone" ? "true" : undefined} data-account-open={drawer.kind === "account" || undefined} role="dialog" aria-modal="true" aria-labelledby="gallery-drawer-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
      <aside className={styles.drawer} ref={drawerRef} tabIndex={-1}>
        <div className={styles.drawerTop}>
          {magazineNavigation ? <>
            <Link href={magazineChapterOpen ? magazineHref : "/"} prefetch={false} onNavigate={(event) => { event.preventDefault(); handleDrawerBack(); }} className={styles.backButton}>{magazineChapterOpen ? "بازگشت به فهرست" : "بازگشت به گالری"} <span aria-hidden="true">↙</span></Link>
            <Link href="/" prefetch={false} onNavigate={(event) => { event.preventDefault(); closeDrawer(); }} className={styles.closeButton} aria-label="بستن پنل">×</Link>
          </> : <>
            <button type="button" onClick={handleDrawerBack} className={styles.backButton}>{drawer.kind === "contact" && studioContact ? "بازگشت به کارگاه" : (drawer.kind === "contact" && contactContext?.sourceContext === "ring-builder") || (drawer.kind === "size-guide" && sizeGuideFromBuilder) ? "بازگشت به طراحی انگشتر" : "بازگشت به گالری"} <span aria-hidden="true">↙</span></button>
            <button type="button" onClick={closeDrawer} className={styles.closeButton} aria-label="بستن پنل">×</button>
          </>}
        </div>
        {drawer.kind === "category" && category && <section className={styles.chapterSheet} aria-labelledby="gallery-drawer-title">
          <header className={`${styles.magazineCover} ${styles.chapterHeading}`}>
            <div><p className={styles.eyebrow}>{catalogFamilies.find((family) => family.id === category.family)?.label}</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{category.label}</h1></div>
            {chapterImage && <div className={styles.magazineFeature} aria-hidden="true"><Image src={chapterImage} alt="" width={220} height={120} loading="eager" unoptimized /></div>}
          </header>
          {availableTypes.length > 0 && <div className={styles.subtypes} role="group" aria-label={`گونه‌های ${category.label}`}>
            <button type="button" aria-pressed={!subtypeId} className={!subtypeId ? styles.selectedSubtype : ""} onClick={() => setSubtypeId(null)}>همهٔ گونه‌ها</button>
            {availableTypes.map((type) => <button type="button" key={type.id} aria-pressed={subtypeId === type.id} className={subtypeId === type.id ? styles.selectedSubtype : ""} onClick={() => setSubtypeId(type.id)}>{type.label}</button>)}
          </div>}
          {filteredProducts.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-orderable-title">
            <h2 id="gallery-orderable-title">آثار قابل سفارش</h2>
            <ul className={styles.indexWorks}>{filteredProducts.map((product) => {
              if (!product.standImage) return null;
              const id = `gallery-index-product-${product.slug}`;
              return <GalleryIndexWork key={id} id={id} name={product.name} image={galleryTrayWorkImage(product.standImage)} href={trayHref({ product: product.slug }, drawer)} onOpen={() => openProductOnTray(product, "بازگشت به صفحهٔ مجله", id)} />;
            })}</ul>
          </section>}
          {archiveWorks.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-archive-title">
            <h2 id="gallery-archive-title">آرشیو آثار</h2>
            <ul className={styles.indexWorks}>{archiveWorks.map(({ photo, image }) => {
              const id = `gallery-archive-photo-${photo.number}`;
              return <GalleryIndexWork key={id} id={id} name={photo.title} image={image} archiveNumber={photo.number} href={trayHref({ archive: photo.number }, drawer)} onOpen={() => openGalleryPhoto(photo, id, "بازگشت به آرشیو")} />;
            })}</ul>
          </section>}
          {filteredProducts.length === 0 && archiveWorks.length === 0 && <div className={styles.emptyState}>
            <p>{subtypeId ? "برای این گونه هنوز اثری منتشر نشده است." : "برای این دسته هنوز اثری آمادهٔ نمایش نیست."}</p>
            {!subtypeId && <button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "studio" })}>درخواست طراحی شخصی <span aria-hidden="true">←</span></button>}
          </div>}
        </section>}
        {drawer.kind === "basket" && <>
          <span id="gallery-drawer-title" tabIndex={-1} className="sr-only">صندوق سفارش‌ها</span>
          <nav className={styles.cashierNav} aria-label="برگه‌های صندوق"><button type="button" aria-pressed={receiptSelection === null} onClick={() => showCashier()}>انتخاب‌های فعلی</button><button type="button" aria-pressed={receiptSelection !== null} onClick={() => showCashier(true)}>رسیدها و برگه‌های مبلغ</button></nav>
          <div className={styles.basketView}>{receiptSelection === null
            ? <RequestBasketView galleryMode products={products} onBrowseCatalog={() => openDrawer({ kind: "magazine" })} onContinueRequest={continueCheckout} onSelectProduct={openBasketProduct} />
            : <GalleryCashierReceipts selection={receiptSelection || undefined} onSelectReceipt={selectCashierReceipt} onOpenAccount={() => { setAccountReturnDestination(`/?galleryPanel=basket&view=receipts${receiptSelection ? `&receipt=${encodeURIComponent(receiptSelection)}` : ""}`); openDrawer({ kind: "account" }); }} />}</div>
        </>}
        {drawer.kind === "magazine" && <>
          <header className={styles.magazineCover}>
            <div><p className={styles.eyebrow}>مجلهٔ اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>فهرست آثار</h1></div>
            <OrnovaSymbol className={styles.magazineFeature} />
          </header>
          {catalogUnavailable && <p className={styles.intro} role="status">کاتالوگ برخط موقتاً در دسترس نیست. آثار آرشیو را می‌توانید در مجله و روی سینی ببینید.</p>}
          <section className={styles.magazineSearch} aria-label="جست‌وجوی آثار">
            <div className={styles.magazineSearchFields}>
              <label>نام اثر<input ref={magazineSearchInput} type="search" value={magazineFilters.query} onChange={(event) => setMagazineFilters({ ...magazineFilters, query: event.target.value })} placeholder="جست‌وجو در آثار" maxLength={160} /></label>
              <label>دسته<select value={magazineFilters.category} onChange={(event) => setMagazineFilters({ ...magazineFilters, category: event.target.value })}>
                <option value="">همهٔ دسته‌ها</option>
                {catalogCategories.filter((category) => magazineIndex.some((work) => work.categoryId === category.id)).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select></label>
              <label>مجموعه<select value={magazineFilters.collection} onChange={(event) => setMagazineFilters({ ...magazineFilters, collection: event.target.value })}>
                <option value="">همهٔ مجموعه‌ها</option>
                {galleryCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select></label>
            </div>
            {searchingMagazine && <div className={styles.magazineSearchResults}>
              <div><p role="status">{magazineWorks.length ? `${number.format(magazineWorks.length)} اثر پیدا شد` : "اثری با این جست‌وجو پیدا نشد."}</p><button type="button" onClick={() => { setMagazineFilters(emptyMagazineFilters); magazineSearchInput.current?.focus(); }}>پاک‌کردن فیلترها</button></div>
              {magazineWorks.length > 0 && <ul className={styles.indexWorks} aria-label="نتیجهٔ جست‌وجوی آثار">
                {magazineWorks.map(({ id, name, image, product, archive }) => {
                  const focusId = `gallery-search-work-${id}`;
                  const href = product ? trayHref({ product: product.slug }, drawer) : archive ? trayHref({ archive: archive.number }, drawer) : null;
                  if (!href) return null;
                  return <GalleryIndexWork key={id} id={focusId} name={name} image={image} href={href} onOpen={() => {
                    if (product) openProductOnTray(product, "بازگشت به نتایج", focusId);
                    else if (archive) openGalleryPhoto(archive, focusId, "بازگشت به نتایج");
                  }} />;
                })}
              </ul>}
            </div>}
          </section>
          <div className={styles.magazineSpread} role="group" aria-label="صفحه‌های مجلهٔ دسته‌ها و مجموعه‌ها">
          <div className={styles.magazineFamilies}>{catalogFamilies.map((family) => <section className={styles.magazineFamily} key={family.id} aria-labelledby={`magazine-family-${family.id}`}>
            <h2 id={`magazine-family-${family.id}`}>{family.label}</h2>
            <div className={styles.magazineLinks}>{catalogCategories.filter((item) => item.family === family.id).map((item) => {
              const index = catalogCategories.findIndex((categoryItem) => categoryItem.id === item.id);
              const href = chapterHref("category", item.id);
              return <Link id={`gallery-magazine-category-${item.id}`} href={href} prefetch={false} key={item.id} onNavigate={(event) => { event.preventDefault(); openChapter(href); }}><span>{item.label}</span><i aria-hidden="true" /><small aria-hidden="true">{number.format(index + 1)}</small></Link>;
            })}</div>
          </section>)}</div>
          <section className={styles.collectionIndex} aria-labelledby="magazine-collections-title">
            <h2 id="magazine-collections-title">مجموعه‌ها</h2>
            <div className={styles.magazineLinks}>{galleryCollections.map((collection, index) => {
              const href = chapterHref("collection", collection.id);
              return <Link id={`gallery-magazine-collection-${collection.id}`} href={href} prefetch={false} key={collection.id} onNavigate={(event) => { event.preventDefault(); openChapter(href); }}><span>{collection.name}</span><i aria-hidden="true" /><small aria-hidden="true">{number.format(catalogCategories.length + index + 1)}</small></Link>;
            })}</div>
          </section>
          <div className={styles.magazineFooter}><button type="button" onClick={() => openDrawer({ kind: "about" })}>دربارهٔ اُرنوا <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "guide" })}>دفتر راهنما <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "phone" })}>دفترچهٔ تلفن <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "account" })}>حساب من <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "library" })}>دفتر طرح‌های شخصی <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "basket" })}>صندوق درخواست <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "studio" })}>کارگاه طراحی <span aria-hidden="true">↖</span></button><button type="button" onClick={() => openDrawer({ kind: "ring-builder" })}>طراحی انگشتر <span aria-hidden="true">↖</span></button><button type="button" onClick={() => { setSizeGuideFromBuilder(false); openDrawer({ kind: "size-guide" }); }}>راهنمای سایز انگشتر <span aria-hidden="true">↖</span></button></div>
          </div>
        </>}
        {drawer.kind === "collection" && (activeCollection ? <section className={styles.chapterSheet} aria-labelledby="gallery-drawer-title">
            <header className={`${styles.magazineCover} ${styles.chapterHeading}`}><div><p className={styles.eyebrow}>دفتر مجموعه‌های اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{activeCollection.name}</h1><p className={styles.intro}>{activeCollection.description}</p></div></header>
            {activeCollection.birthMonths && selectedBirthMonth ? <>
              <div className={styles.birthMonthPicker} role="group" aria-label="انتخاب ماه تولد">
                {activeCollection.birthMonths.map((month) => {
                  const href = chapterHref("collection", activeCollection.id, month.id);
                  return <Link key={month.id} href={href} prefetch={false} aria-current={month.id === selectedBirthMonth.id ? "true" : undefined} onNavigate={(event) => { event.preventDefault(); setMagazineHref(href, "replaceState"); }}>{month.name}</Link>;
                })}
              </div>
              <h2 className={styles.birthMonthTitle}>{selectedBirthMonth.name}</h2>
              <div className={styles.birthMonthWorks} aria-label={`آثار ماه ${selectedBirthMonth.name}`}>
                {birthMonthWorks.map(({ label, title, photo, thumbnail }) => <article className={styles.birthMonthWork} key={label}>
                  <header className={styles.birthMonthCaption}>
                    <span className={styles.collectionReferenceNumber}>{label}</span>
                    <strong>{title}</strong>
                    {(!photo || !thumbnail) && <p className={styles.collectionImagePending}>عکس این طرح در حال تطبیق است.</p>}
                  </header>
                  {photo && thumbnail && <Link id={`gallery-collection-photo-${photo.number}`} href={trayHref({ archive: photo.number }, drawer, selectedBirthMonth.id)} prefetch={false} className={styles.birthMonthPhoto} data-collection-photo={photo.number} aria-label={`نمایش ${photo.title} روی سینی`} onNavigate={(event) => { event.preventDefault(); openGalleryPhoto(photo, `gallery-collection-photo-${photo.number}`, "بازگشت به دفتر"); }}>
                    <Image src={thumbnail} alt="" fill sizes="(max-width: 640px) 32vw, 220px" unoptimized />
                  </Link>}
                </article>)}
              </div>
            </> : activeCollection.flowerMonths && <>
              {matchedFlowers.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-flower-matched-title">
                <h2 id="gallery-flower-matched-title">گل‌های ماه تولد</h2>
                <ul className={styles.indexWorks}>{matchedFlowers.map(({ id: monthId, name, flowerPendant, photo, thumbnail }) => {
                  const id = `gallery-flower-month-${monthId}`;
                  return <GalleryIndexWork key={id} id={id} name={flowerPendant} caption={name} image={thumbnail} archiveNumber={photo.number} href={trayHref({ archive: photo.number }, drawer)} onOpen={() => openGalleryPhoto(photo, id, "بازگشت به دفتر")} />;
                })}</ul>
              </section>}
              {otherFlowerPhotos.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-flower-archive-title">
                <h2 id="gallery-flower-archive-title">آویزهای آرشیوی مجموعه</h2>
                <ul className={styles.indexWorks}>{otherFlowerPhotos.map(({ archive, image }) => {
                  const id = `gallery-flower-archive-${archive.number}`;
                  return <GalleryIndexWork key={id} id={id} name={archive.title} image={image} archiveNumber={archive.number} href={trayHref({ archive: archive.number }, drawer)} onOpen={() => openGalleryPhoto(archive, id, "بازگشت به دفتر")} />;
                })}</ul>
              </section>}
              {pendingFlowers.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-flower-pending-title">
                <h2 id="gallery-flower-pending-title">عکس‌های در حال تطبیق</h2>
                <ul className={`${styles.indexWorks} ${styles.unmatchedFlowers}`}>{pendingFlowers.map(({ id, name, flowerPendant }) => <li key={id}><small className={styles.indexWorkCaption}>{name}</small>{flowerPendant}</li>)}</ul>
              </section>}
            </>}
          </section> : <div className={styles.emptyState}><p>این صفحه از مجموعه در دسترس نیست.</p></div>)}
        {drawer.kind === "account" && <section className={styles.accountPage} aria-labelledby="gallery-drawer-title">
          <header className={styles.accountHeading}>
            <OrnovaSymbol className={styles.accountSymbol} />
            <h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>دفتر شخصی اُرنوا</h1>
          </header>
          {accountCompletionMode && checkoutArchive !== null && !checkoutPhoto
            ? <p role="alert" className={styles.intro}>این اثر پیدا نشد. دوباره از روی سینی انتخابش کن.</p>
            : <GalleryAccountPanel completionMode={accountCompletionMode} initialError={accountInitialError} signOutFailed={accountSignOutFailed} onContinueCheckout={reviewCheckout} checkoutTitle={checkoutPhoto?.title} nextDestination={accountCompletionMode ? checkoutLoginPath : accountReturnDestination} />}
        </section>}
        {drawer.kind === "library" && <><span id="gallery-drawer-title" className="sr-only">گالری من</span><GalleryLibraryPanel onOpenAccount={openLibraryAccount} /></>}
        {drawer.kind === "guide" && <>
          <p className={styles.eyebrow}>دفتر همراهی اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>راهنمای گالری</h1>
          <GalleryGuidePanel initialChapter={guideChapter} onContact={() => openDrawer({ kind: "phone" })} onSizeGuide={() => { setSizeGuideFromBuilder(false); openDrawer({ kind: "size-guide" }); }} />
        </>}
        {drawer.kind === "ring-builder" && <RingDesignBuilder onContinueRequest={() => openRingBuilderContact(false)} onContinueWithoutDraft={() => openRingBuilderContact(true)} onOpenProduct={openRingBuilderProduct} onOpenSizeGuide={openRingSizeGuide} />}
        {drawer.kind === "size-guide" && <>
          <p className={styles.eyebrow}>راهنمای اندازه‌گیری</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>سایز انگشتر را دقیق‌تر پیدا کن</h1>
          <p className={styles.intro}>برای ثبت سایز در پیش‌طرح، اندازهٔ داخلی یکی از انگشترهای راحت خود را بر حسب میلی‌متر بررسی کن. اندازهٔ نهایی پیش از ساخت باید با تیم اُرنوا تأیید شود.</p>
          <ol className={styles.sizeGuideSteps}><li><strong>یک انگشتر مناسب انتخاب کن</strong><span>انگشتری را بردار که روی همان انگشت راحت است و به‌سادگی از بند انگشت عبور می‌کند.</span></li><li><strong>قطر داخلی را اندازه بگیر</strong><span>خط‌کش را از وسط فضای داخلی حلقه بگذر‌ان؛ عدد را با دقت میلی‌متری یادداشت کن.</span></li><li><strong>عدد را برای بررسی بفرست</strong><span>اندازهٔ تقریبی را در یادداشت طراحی بنویس. اندازه‌گیری با نخ یا نوار ممکن است خطا داشته باشد.</span></li></ol>
          <p className={styles.collectionNotice}>راهنمایی حاضر جای اندازه‌گیری حرفه‌ای یا تأیید سایز نهایی را نمی‌گیرد.</p>
          <button type="button" className={styles.primaryLink} onClick={() => { setSizeGuideFromBuilder(true); setDrawer({ kind: "ring-builder" }); }}>ادامهٔ طراحی انگشتر <span>←</span></button>
        </>}
        {drawer.kind === "phone" && <GalleryPhoneNotebook />}
        {(drawer.kind === "contact" || (drawer.kind === "studio" && studioContact)) && <div className="pt-3.5" hidden={drawer.kind !== "contact"} inert={drawer.kind !== "contact"}>
          <h1 id={drawer.kind === "contact" ? "gallery-drawer-title" : undefined} tabIndex={-1} className={styles.title}>{studioContact || contactContext?.studioReview || contactSourceContext === "custom-design" ? "ثبت ایده در کارگاه" : contactContext?.intent === "question" && !archiveOrder ? "پرسش دربارهٔ اثر" : "ثبت سفارش"}</h1>
          {studioContact?.mode === "transferred" && <p className={styles.intro}>خلاصهٔ ایدهٔ کارگاه را پیش از ارسال بازبینی کن.</p>}
          {invalidArchiveOrder ? <p role="alert" className={styles.intro}>این اثر در آرشیو گالری پیدا نشد. دوباره از روی سینی انتخابش کن.</p> : <div className={styles.basketView}><InquiryForm galleryMode archiveOrder={archiveOrder ?? undefined} productContext={!archiveOrder && contactProduct ? { slug: contactProduct.slug, name: contactProduct.name, category: contactProduct.category } : undefined} productSelectionKey={archiveOrder ? undefined : contactProductSelectionKey} sourceContext={archiveOrder ? undefined : contactSourceContext} requestBasketContext={!archiveOrder && contactContext?.requestBasketContext} intent={!archiveOrder && contactProduct ? contactContext?.intent : undefined} includeRingDraft={!archiveOrder && !contactContext?.withoutDraft} loginNextPath={contactLoginNextPath} onOpenReceipt={(id) => showCashier(true, id)} /></div>}
          {!studioContact && !contactContext?.studioReview && contactSourceContext !== "custom-design" && !archiveOrder && <button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "basket" })}>دیدن صندوق درخواست <span aria-hidden="true">←</span></button>}
        </div>}
        {(drawer.kind === "studio" || (drawer.kind === "contact" && studioContact)) && <div className={styles.studioSurface} hidden={drawer.kind !== "studio"} inert={drawer.kind !== "studio"}>
          <DesignStudio
            initialBookPage={workshopBookPage}
            draftId={studioContact ? studioContact.studioDraftId : studioDraftId}
            userId={studioDraftOwner}
            imageMode={imageMode}
            embedded
            active={drawer.kind === "studio"}
            onOpenInquiry={openStudioInquiry}
            onReturnToInquiry={studioContact ? () => setDrawer({ kind: "contact" }) : undefined}
            onOpenAccountGallery={() => openDrawer({ kind: "library" })}
          />
        </div>}
        {drawer.kind === "about" && <><p className={styles.eyebrow}>یادداشت مجله</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>دربارهٔ اُرنوا</h1><p className={styles.intro}>Ornova by Yas فضای شخصی یاس برای طراحی دیجیتال جواهرات نقره است؛ هر اثر از ایده و فرم آغاز می‌شود و با ابزارهایی مانند MatrixGold و ZBrush به طرحی قابل بررسی می‌رسد.</p><p className={styles.intro}>این گالری برای دیدن آثار، خواندن شناسنامهٔ هر قطعه و فرستادن ایده‌های طراحی ساخته شده است؛ جزئیات هر محصول بر پایهٔ اطلاعات تأییدشدهٔ همان اثر نمایش داده می‌شود.</p><button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "phone" })}>ارتباط با اُرنوا <span aria-hidden="true">←</span></button><button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "account" })}>حساب مشتری <span aria-hidden="true">←</span></button></>}
      </aside>
    </div>}
  </div>;
}
