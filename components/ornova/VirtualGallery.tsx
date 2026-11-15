"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { InquiryForm } from "@/components/commerce/InquiryForm";
import { OrnovaProductDossier } from "@/components/commerce/OrnovaProductDossier";
import { RingDesignBuilder } from "@/components/commerce/RingDesignBuilder";
import { RequestBasketView } from "@/components/commerce/RequestBasketView";
import { GalleryAccountPanel } from "@/components/ornova/GalleryAccountPanel";
import { GalleryGuidePanel, type GuideChapter } from "@/components/ornova/GalleryGuidePanel";
import { GalleryLibraryPanel } from "@/components/ornova/GalleryLibraryPanel";
import { DesignStudio } from "@/components/studio/DesignStudio";
import { GalleryRoom } from "./GalleryRoom";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import { roomSamplesWithCatalog } from "@/lib/constants/gallery-room-samples";
import { galleryRoomStands } from "@/lib/constants/gallery-room";
import { findGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { catalogCategories, catalogFamilies } from "@/lib/constants/catalog";
import { galleryCollections } from "@/lib/constants/collections";
import { galleryRenders, type GalleryRender } from "@/lib/constants/gallery-renders";
import { products as legacyProducts, type Product } from "@/lib/constants/products";
import { REQUEST_LINE_ID_PATTERN } from "@/lib/commerce/request-basket";
import { getAuthCallbackErrorMessage } from "@/lib/auth/inputs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isStudioId } from "@/lib/studio/conversation";
import styles from "./VirtualGallery.module.css";

const number = new Intl.NumberFormat("fa-IR");
const niches = galleryRoomStands;
function isPublicGalleryProduct(product: Product) {
  return product.publicationStatus === "published" && product.galleryPlacementVerified === true && Boolean(product.standImage);
}
type Drawer = { kind: "category"; id: string } | { kind: "collection"; id: string } | { kind: "magazine" | "contact" | "studio" | "about" | "account" | "library" | "basket" | "ring-builder" | "size-guide" | "guide" };
const galleryPanelEvent = "ornova-gallery-panel-change";

function GalleryRenderShelf({ renders, categoryLabel }: { renders: GalleryRender[]; categoryLabel: string }) {
  const [index, setIndex] = useState(0);
  if (!renders.length) return null;
  const render = renders[index % renders.length];
  return <section className={styles.renderShelf} aria-label={`تصاویر آمادهٔ ویترین ${categoryLabel}`}>
    <div className={styles.renderShelfHeading}>
      <div><span className={styles.renderShelfKicker}>تصویرهای آمادهٔ ویترین</span><h2>{categoryLabel}</h2></div>
      <span className={styles.renderCount}>{number.format(index + 1)} / {number.format(renders.length)}</span>
    </div>
    <figure className={styles.renderFigure} aria-live="polite">
      <Image key={render.src} src={render.src} alt={`${render.title} روی استند مخمل آبی اُرنوا`} width={render.width} height={render.height} sizes="(max-width: 700px) 88vw, 520px" />
      <figcaption>{render.title}</figcaption>
    </figure>
    {renders.length > 1 && <div className={styles.renderControls}>
      <button type="button" onClick={() => setIndex((current) => (current - 1 + renders.length) % renders.length)} aria-label="نمایش تصویر قبلی">تصویر قبلی <span aria-hidden="true">←</span></button>
      <span>{number.format(index + 1)} از {number.format(renders.length)}</span>
      <button type="button" onClick={() => setIndex((current) => (current + 1) % renders.length)} aria-label="نمایش تصویر بعدی"><span aria-hidden="true">→</span> تصویر بعدی</button>
    </div>}
    <p className={styles.renderNotice}>این تصویر، نمایش اثر روی استند است. شناسنامه و امکان سفارش فقط پس از تطبیق با اطلاعات تأییدشدهٔ فروشگاه فعال می‌شود.</p>
  </section>;
}
function subscribeToGalleryPanel(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(galleryPanelEvent, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(galleryPanelEvent, onChange);
  };
}

function getGalleryPanelSnapshot(): "contact" | "basket" | "studio" | "account" | "library" | "magazine" | "about" | "ring-builder" | "size-guide" | "guide" | null {
  const panel = new URLSearchParams(window.location.search).get("galleryPanel");
  return panel === "contact" || panel === "basket" || panel === "studio" || panel === "account" || panel === "library" || panel === "magazine" || panel === "about" || panel === "ring-builder" || panel === "size-guide" || panel === "guide" ? panel : null;
}
function getGalleryGuideChapterSnapshot(): GuideChapter {
  const params = new URLSearchParams(window.location.search);
  const chapter = params.get("chapter");
  return params.get("galleryPanel") === "guide" && (chapter === "faq" || chapter === "silver-care" || chapter === "silver-properties") ? chapter : "overview";
}
function getGalleryProductSnapshot(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("galleryPanel") === "product" ? params.get("product") : null;
}
function getGalleryStudioDraftSnapshot(): string | null {
  const params = new URLSearchParams(window.location.search);
  const draft = params.get("draft");
  return params.get("galleryPanel") === "studio" && isStudioId(draft) ? draft : null;
}
function getGalleryCompletionSnapshot() { return new URLSearchParams(window.location.search).get("complete") === "1"; }
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
    selection: params.get("selection") ?? undefined,
    sourceContext: params.get("from") === "custom-design" || params.get("from") === "ring-builder" ? params.get("from") : undefined,
    requestBasketContext: params.get("from") === "request-basket",
    intent: params.get("intent") === "price" || params.get("intent") === "question" ? params.get("intent") : undefined,
    withoutDraft: params.get("withoutDraft") === "1",
  };
  return JSON.stringify(context);
}

export function VirtualGallery({ imageMode, galleryProducts }: { imageMode: "offline" | "preview"; galleryProducts?: Product[] }) {
  const products = galleryProducts ?? legacyProducts;
  const roomSamplesByCategory = useMemo(() => roomSamplesWithCatalog(products), [products]);
  const drawerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const standHoverTimerRef = useRef<number | null>(null);
  const hoverCooldownRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const standIntentRef = useRef(false);
  const categorySourceRef = useRef<"scene" | "magazine" | "ring-builder" | "basket">("scene");
  const [sizeGuideFromBuilder, setSizeGuideFromBuilder] = useState(false);
  const returnPanel = useSyncExternalStore(subscribeToGalleryPanel, getGalleryPanelSnapshot, () => null);
  const linkedProductSlug = useSyncExternalStore(subscribeToGalleryPanel, getGalleryProductSnapshot, () => null);
  const studioDraftId = useSyncExternalStore(subscribeToGalleryPanel, getGalleryStudioDraftSnapshot, () => null);
  const accountCompletionMode = useSyncExternalStore(subscribeToGalleryPanel, getGalleryCompletionSnapshot, () => false);
  const accountInitialError = useSyncExternalStore(subscribeToGalleryPanel, getGalleryAuthErrorSnapshot, () => null);
  const accountSignOutFailed = useSyncExternalStore(subscribeToGalleryPanel, getGallerySignOutFailureSnapshot, () => false);
  const guideChapter = useSyncExternalStore(subscribeToGalleryPanel, getGalleryGuideChapterSnapshot, (): GuideChapter => "overview");
  const contactContextSnapshot = useSyncExternalStore(subscribeToGalleryPanel, getGalleryContactSnapshot, () => null);
  const [drawerState, setDrawer] = useState<Drawer | null>(null);
  const [accountReturnDestination, setAccountReturnDestination] = useState<string | undefined>();
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const contactContext = useMemo(() => {
    if (!contactContextSnapshot) return null;
    try {
      const value: unknown = JSON.parse(contactContextSnapshot);
      return value && typeof value === "object" ? value as { productSlug?: string; selection?: string; sourceContext?: "custom-design" | "ring-builder"; requestBasketContext: boolean; intent?: "price" | "question"; withoutDraft: boolean } : null;
    } catch { return null; }
  }, [contactContextSnapshot]);
  const contactProduct = useMemo(() => products.find((item) => item.slug === contactContext?.productSlug && isPublicGalleryProduct(item)) ?? null, [contactContext?.productSlug, products]);
  const contactProductSelectionKey = contactProduct && contactContext?.selection !== undefined
    ? contactContext.selection === contactProduct.slug || REQUEST_LINE_ID_PATTERN.test(contactContext.selection) ? contactContext.selection : "invalid-selection"
    : undefined;
  const contactLoginNextPath = useMemo(() => {
    const params = new URLSearchParams();
    if (contactProduct) params.set("product", contactProduct.slug);
    if (contactProductSelectionKey) params.set("selection", contactProductSelectionKey);
    if (contactContext?.sourceContext) params.set("from", contactContext.sourceContext);
    else if (contactContext?.requestBasketContext) params.set("from", "request-basket");
    if (contactProduct && contactContext?.intent) params.set("intent", contactContext.intent);
    if (contactContext?.sourceContext === "ring-builder" && contactContext.withoutDraft) params.set("withoutDraft", "1");
    return `/?galleryPanel=contact${params.size ? `&${params.toString()}` : ""}`;
  }, [contactContext, contactProduct, contactProductSelectionKey]);
  const linkedGalleryProduct = useMemo(() => products.find((item) => item.slug === linkedProductSlug && isPublicGalleryProduct(item)) ?? null, [linkedProductSlug, products]);
  const drawer = useMemo(() => drawerState ?? (linkedGalleryProduct ? { kind: "category", id: linkedGalleryProduct.categoryId } : returnPanel ? { kind: returnPanel } : null), [drawerState, linkedGalleryProduct, returnPanel]);
  const [selectedProductState, setSelectedProduct] = useState<Product | null>(null);
  const selectedProduct = selectedProductState ?? linkedGalleryProduct;
  const [featuredProductIndex, setFeaturedProductIndex] = useState(0);
  const [selectedBirthMonthId, setSelectedBirthMonthId] = useState("farvardin");
  const [standIndices, setStandIndices] = useState<Record<string, number>>({});
  const [subtypeId, setSubtypeId] = useState<string | null>(null);
  const [categoryFromMagazine, setCategoryFromMagazine] = useState(false);
  const [productOpenedFromBasket, setProductOpenedFromBasket] = useState(false);
  const category = drawer?.kind === "category" ? catalogCategories.find((item) => item.id === drawer.id) : null;
  const focusedNiche = category ? niches.find((item) => item.categoryId === category.id) : null;
  const categoryProducts = useMemo(() => products.filter((product) => product.categoryId === category?.id && isPublicGalleryProduct(product) && (!subtypeId || product.subtypeId === subtypeId)), [category?.id, subtypeId, products]);
  const categoryRenders = category ? galleryRenders.filter((render) => render.categoryId === category.id && render.status === "ready") : [];
  const categoryHasProducts = categoryProducts.length > 0;
  const productIndex = selectedProduct ? categoryProducts.findIndex((item) => item.slug === selectedProduct.slug) : -1;

  function cancelScheduledStandOpen() {
    standIntentRef.current = false;
    if (standHoverTimerRef.current !== null) {
      window.clearTimeout(standHoverTimerRef.current);
      standHoverTimerRef.current = null;
    }
  }
  function scheduleStandOpen(niche: (typeof niches)[number]) {
    if (drawer || hoverCooldownRef.current) return;
    cancelScheduledStandOpen();
    standIntentRef.current = true;
    standHoverTimerRef.current = window.setTimeout(() => {
      standHoverTimerRef.current = null;
      openStand(niche);
    }, 900);
  }

  useEffect(() => {
    if (drawer && standHoverTimerRef.current !== null) {
      window.clearTimeout(standHoverTimerRef.current);
      standHoverTimerRef.current = null;
    }
    return () => {
      if (standHoverTimerRef.current !== null) {
        window.clearTimeout(standHoverTimerRef.current);
        standHoverTimerRef.current = null;
      }
    };
  }, [drawer]);

  useEffect(() => () => {
    if (cooldownTimerRef.current !== null) window.clearTimeout(cooldownTimerRef.current);
  }, []);

  const clearGalleryReturnState = useCallback(() => {
    const url = new URL(window.location.href);
    const activePanel = url.searchParams.get("galleryPanel");
    if (activePanel !== "contact" && activePanel !== "basket" && activePanel !== "studio" && activePanel !== "account" && activePanel !== "library" && activePanel !== "product" && activePanel !== "magazine" && activePanel !== "about" && activePanel !== "ring-builder" && activePanel !== "size-guide" && activePanel !== "guide") return;
    url.searchParams.delete("galleryPanel");
    if (activePanel === "product") url.searchParams.delete("product");
    if (activePanel === "account") for (const key of ["complete", "next", "error", "signout"]) url.searchParams.delete(key);
    if (activePanel === "contact") for (const key of ["draftTransfer", "product", "selection", "from", "intent", "withoutDraft"]) url.searchParams.delete(key);
    if (activePanel === "studio") url.searchParams.delete("draft");
    if (activePanel === "guide") url.searchParams.delete("chapter");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }, []);

  const closeDrawer = useCallback(() => {
    hoverCooldownRef.current = true;
    if (cooldownTimerRef.current !== null) window.clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setTimeout(() => { hoverCooldownRef.current = false; }, 1400);
    standIntentRef.current = false;
    clearGalleryReturnState();
    setDrawer(null); setSelectedProduct(null); setSubtypeId(null);
    setAccountReturnDestination(undefined);
    const trigger = returnFocusRef.current;
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, [clearGalleryReturnState]);

  useEffect(() => {
    if (!drawer) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => document.getElementById(selectedProduct ? "product-dossier-title" : "gallery-drawer-title")?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (selectedProduct && categorySourceRef.current === "magazine") { setSelectedProduct(null); return; }
        if (drawer.kind === "collection") { setDrawer({ kind: "magazine" }); return; }
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])].filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = priorOverflow; window.cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKeyDown); };
  }, [closeDrawer, drawer, selectedProduct]);

  useEffect(() => {
    const clearLocalDrawer = () => { setDrawer(null); setSelectedProduct(null); setSubtypeId(null); };
    window.addEventListener("popstate", clearLocalDrawer);
    return () => window.removeEventListener("popstate", clearLocalDrawer);
  }, []);

  useEffect(() => {
    if (linkedProductSlug && !linkedGalleryProduct) clearGalleryReturnState();
  }, [clearGalleryReturnState, linkedGalleryProduct, linkedProductSlug]);

  useEffect(() => {
    if (drawer) drawerRef.current?.scrollTo(0, 0);
  }, [drawer]);

  useEffect(() => {
    if (selectedProduct && drawerRef.current) drawerRef.current.scrollTop = 0;
  }, [selectedProduct]);

  useEffect(() => {
    if (drawer?.kind !== "category" || selectedProduct || categoryProducts.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      if (document.hidden || carouselRef.current?.matches(":hover, :focus-within")) return;
      setFeaturedProductIndex((current) => (current + 1) % categoryProducts.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [categoryProducts, drawer?.kind, selectedProduct]);

  useEffect(() => {
    if (drawer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      if (document.hidden || standIntentRef.current) return;
      setStandIndices((current) => Object.fromEntries(galleryRoomStands.map((stand) => {
        const count = roomSamplesByCategory[stand.categoryId]?.length ?? 0;
        return [stand.categoryId, count > 1 ? ((current[stand.categoryId] ?? 0) + 1) % count : 0];
      })));
    }, 7000);
    return () => window.clearInterval(interval);
  }, [drawer, roomSamplesByCategory]);

  function openDrawer(next: Drawer) {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && !activeElement.closest('[role="dialog"]')) {
      returnFocusRef.current = activeElement;
    }
    clearGalleryReturnState();
    setDrawer(next);
  }
  function openLibraryAccount() { setAccountReturnDestination("/?galleryPanel=library"); openDrawer({ kind: "account" }); }
  function beginCheckoutLogin() {
    setCheckoutError("");
    setDrawer({ kind: "account" });
    window.history.pushState(window.history.state, "", "/?galleryPanel=account&complete=1");
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  async function continueCheckout() {
    if (checkoutPending) return;
    setCheckoutPending(true);
    setCheckoutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      if (!user) { beginCheckoutLogin(); return; }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone,province,city,address_line")
        .maybeSingle();
      if (profileError) throw profileError;
      const addressReady = Boolean(profile?.phone?.trim() && profile?.province?.trim() && profile?.city?.trim() && profile?.address_line?.trim());
      if (!addressReady) { beginCheckoutLogin(); return; }

      setDrawer({ kind: "contact" });
      window.history.pushState(window.history.state, "", "/?galleryPanel=contact&from=request-basket");
      window.dispatchEvent(new Event(galleryPanelEvent));
    } catch {
      setCheckoutError("حساب یا نشانی امن بررسی نشد؛ انتخاب‌ها در صندوق مانده‌اند. کمی بعد دوباره تلاش کن.");
    } finally {
      setCheckoutPending(false);
    }
  }
  function openCategory(id: string, source: "scene" | "magazine" = "scene") { categorySourceRef.current = source; setCategoryFromMagazine(source === "magazine"); setProductOpenedFromBasket(false); setSubtypeId(null); setSelectedProduct(null); setFeaturedProductIndex(0); openDrawer({ kind: "category", id }); }
  function returnFromCategory() {
    if (categorySourceRef.current === "magazine") { setSubtypeId(null); setSelectedProduct(null); setDrawer({ kind: "magazine" }); return; }
    closeDrawer();
  }
  function returnFromProduct() {
    if (categorySourceRef.current === "magazine") { setSelectedProduct(null); return; }
    if (categorySourceRef.current === "ring-builder") { setSelectedProduct(null); setDrawer({ kind: "ring-builder" }); return; }
    if (categorySourceRef.current === "basket") { setSelectedProduct(null); setDrawer({ kind: "basket" }); return; }
    closeDrawer();
  }
  function openRingBuilderProduct() {
    const product = products.find((item) => item.slug === "lajvard-shab-ring" && isPublicGalleryProduct(item));
    if (!product) return;
    categorySourceRef.current = "ring-builder";
    setCategoryFromMagazine(false);
    setProductOpenedFromBasket(false);
    setSubtypeId(null);
    setSelectedProduct(product);
    setDrawer({ kind: "category", id: product.categoryId });
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
    if (selectedProduct) { returnFromProduct(); return; }
    if (drawer?.kind === "category") { returnFromCategory(); return; }
    if (drawer?.kind === "collection") { setDrawer({ kind: "magazine" }); return; }
    if (drawer?.kind === "contact" && contactContext?.sourceContext === "ring-builder") { returnToRingBuilder(); return; }
    if (drawer?.kind === "size-guide" && sizeGuideFromBuilder) { setDrawer({ kind: "ring-builder" }); return; }
    closeDrawer();
  }
  function openStand(niche: (typeof niches)[number]) {
    returnFocusRef.current = document.activeElement as HTMLElement;
    categorySourceRef.current = "scene";
    setCategoryFromMagazine(false);
    setProductOpenedFromBasket(false);
    setSubtypeId(null);
    returnFocusRef.current = document.querySelector<HTMLElement>(`[data-stand-id="${niche.id}"]`);
    setSelectedProduct(null);
    setFeaturedProductIndex(0);
    setDrawer({ kind: "category", id: niche.categoryId });
  }
  function openBasketProduct(slug: string) {
    const product = products.find((item) => item.slug === slug && isPublicGalleryProduct(item));
    if (!product) return;
    categorySourceRef.current = "basket";
    setCategoryFromMagazine(false);
    setProductOpenedFromBasket(true);
    setSubtypeId(null);
    setSelectedProduct(product);
    setDrawer({ kind: "category", id: product.categoryId });
  }
  function adjacentProduct(step: number) {
    if (!categoryProducts.length || productIndex < 0) return;
    setSelectedProduct(categoryProducts[(productIndex + step + categoryProducts.length) % categoryProducts.length]);
  }
  function moveFeaturedProduct(step: number) {
    if (!categoryProducts.length) return;
    setFeaturedProductIndex((current) => (current + step + categoryProducts.length) % categoryProducts.length);
  }

  const featuredProduct = categoryProducts[featuredProductIndex % Math.max(1, categoryProducts.length)] ?? null;
  const productOpen = Boolean(selectedProduct);
  const roomSamples = category ? roomSamplesByCategory[category.id] : undefined;
  const roomSampleIndex = category ? (standIndices[category.id] ?? 0) % (roomSamples?.length || 1) : 0;
  const roomSample = roomSamples?.[roomSampleIndex];
  const linkedRoomProduct = roomSample ? findGalleryProduct(products, roomSample) : null;
  const roomSampleOpen = drawer?.kind === "category" && Boolean(roomSample) && !categoryFromMagazine && !selectedProduct;
  function moveRoomSample(step: number) {
    if (!category || !roomSamples?.length) return;
    setStandIndices((current) => ({ ...current, [category.id]: ((current[category.id] ?? 0) + step + roomSamples.length) % roomSamples.length }));
  }
  const displayFocused = drawer?.kind === "category";

  return <div className={`${styles.root} virtualGallery`} dir="rtl" data-focused-display={displayFocused ? drawer.id : undefined} data-product-open={productOpen ? "true" : undefined}>
  <GalleryRoom standIndices={standIndices} samplesByCategory={roomSamplesByCategory} activeCategory={displayFocused ? drawer.id : undefined} panelOpen={Boolean(drawer)} onSelectStand={openStand} onStandIntent={scheduleStandOpen} onCancelIntent={cancelScheduledStandOpen} onSelectObject={(kind) => { cancelScheduledStandOpen(); openDrawer({ kind }); }} />

    {drawer && <div className={styles.overlay} data-room-sample={roomSampleOpen || undefined} data-product-open={selectedProduct ? "true" : "false"} data-studio-open={drawer.kind === "studio" ? "true" : "false"} data-basket-open={drawer.kind === "basket" ? "true" : undefined} data-focused-display={category?.id} data-focus-side={focusedNiche ? (focusedNiche.x > 50 ? "left" : "right") : undefined} role="dialog" aria-modal="true" aria-labelledby={selectedProduct ? "product-dossier-title" : "gallery-drawer-title"} onMouseDown={(event) => { const target = event.target; if (target === event.currentTarget || (selectedProduct && target instanceof Element && !target.closest("[data-dossier-content], [data-dossier-top]"))) closeDrawer(); }}>
      <aside className={styles.drawer} ref={drawerRef}>
        <div className={styles.drawerTop} data-dossier-top={selectedProduct ? "true" : undefined}>
          <button type="button" onClick={handleDrawerBack} className={styles.backButton}>{selectedProduct ? (categoryFromMagazine ? "بازگشت به ویترین" : productOpenedFromBasket ? "بازگشت به صندوق" : "بازگشت به نمای گالری") : (drawer.kind === "category" && categoryFromMagazine) || drawer.kind === "collection" ? "بازگشت به فهرست" : (drawer.kind === "contact" && contactContext?.sourceContext === "ring-builder") || (drawer.kind === "size-guide" && sizeGuideFromBuilder) ? "بازگشت به طراحی انگشتر" : "بازگشت به گالری"} <span aria-hidden="true">↙</span></button>
          <button type="button" onClick={closeDrawer} className={styles.closeButton} aria-label="بستن پنل">×</button>
        </div>
        {roomSampleOpen && roomSample && category && roomSamples && <section className={styles.roomSampleSheet}>
          <OrnovaBrandMark className={styles.sampleBrand} />
          <p className={styles.eyebrow}>ویترین گالری <span>·</span> {category.label}</p>
          <h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{linkedRoomProduct?.name ?? roomSample.title}</h1>
          <dl className={styles.sampleFacts}><div><dt>نوع اثر</dt><dd>{category.label}</dd></div><div><dt>تصویر</dt><dd>نمای نهایی اثر روی استند اختصاصی</dd></div><div><dt>شناسهٔ تصویر</dt><dd>{roomSample.productSlug ? "کاتالوگ" : number.format(Number(roomSample.number))}</dd></div>{linkedRoomProduct?.details.slice(0, 3).map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
          <div className={styles.sampleControls}><button type="button" onClick={() => moveRoomSample(-1)}>اثر قبلی</button><span>{number.format(roomSampleIndex + 1)} / {number.format(roomSamples.length)}</span><button type="button" onClick={() => moveRoomSample(1)}>اثر بعدی</button></div>
          {linkedRoomProduct ? <button type="button" className={styles.primaryLink} onClick={() => setSelectedProduct(linkedRoomProduct)}>دیدن شناسنامهٔ اثر <span aria-hidden="true">←</span></button> : <p className={styles.sampleNote}>مشخصات وزن، اندازه و قیمت این اثر هنوز ثبت نشده است.</p>}
        </section>}
        {!roomSampleOpen && drawer.kind === "category" && category && (selectedProduct
          ? <OrnovaProductDossier product={selectedProduct} onPrevious={() => adjacentProduct(-1)} onNext={() => adjacentProduct(1)} productPosition={productIndex + 1} totalProducts={categoryProducts.length} onAddToBasket={() => openDrawer({ kind: "basket" })} />
          : <>
            <p className={styles.eyebrow}>ویترین گالری <span>·</span> {category.label}</p>
            <h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{category.label}</h1>
            <p className={styles.intro}>{categoryHasProducts ? "این ویترین به این دسته اختصاص دارد. از میان گونه‌ها انتخاب کن یا همهٔ آثار منتشرشده را ببین." : "ویترین اختصاصی این دسته."}</p>
            {categoryHasProducts && <div className={styles.subtypes} role="group" aria-label={`گونه‌های ${category.label}`}>
              <button type="button" aria-pressed={!subtypeId} className={!subtypeId ? styles.selectedSubtype : ""} onClick={() => { setSubtypeId(null); setFeaturedProductIndex(0); }}>همهٔ گونه‌ها</button>
              {category.types.map((type) => <button type="button" key={type.id} aria-pressed={subtypeId === type.id} className={subtypeId === type.id ? styles.selectedSubtype : ""} onClick={() => { setSubtypeId(type.id); setFeaturedProductIndex(0); }}>{type.label}</button>)}
            </div>}
            {featuredProduct ? <div ref={carouselRef} className={styles.featuredProduct} role="group" aria-label={`نمایش محصولات ${category.label}`}>
              <button type="button" className={styles.featuredProductButton} onClick={() => setSelectedProduct(featuredProduct)} aria-label={`بازکردن شناسنامهٔ ${featuredProduct.name}`}>
                <span className={styles.featuredImage} data-display-kind={featuredProduct.categoryId}>
                  {featuredProduct.standImage ? <>
                    <span className={styles.featuredPedestal} aria-hidden="true" />
                    <Image key={featuredProduct.slug} src={featuredProduct.standImage} alt={`${featuredProduct.name} روی پایهٔ نمایش اُرنوا`} fill sizes="(max-width: 700px) 88vw, 420px" />
                  </> : <span className={styles.featuredMissing}>نمای محصول روی استند هنوز آماده نیست</span>}
                  {featuredProduct.gallery[0]?.label && <span className={styles.featuredNotice}><strong>{featuredProduct.gallery[0].label}</strong>{featuredProduct.gallery[0].notice && <span>{featuredProduct.gallery[0].notice}</span>}</span>}
                </span>
                <span className={styles.featuredInfo}>
                  <span className={styles.productMeta}>{featuredProduct.category}<span>{number.format((categoryProducts.findIndex((product) => product.slug === featuredProduct.slug) + 1))} / {number.format(categoryProducts.length)}</span></span>
                  <span className={styles.productName}>{featuredProduct.name}</span>
                  <span className={styles.productCta}>دیدن شناسنامه <i aria-hidden="true">↖</i></span>
                </span>
              </button>
              {categoryProducts.length > 1 && <div className={styles.featuredControls}>
                <button type="button" onClick={() => moveFeaturedProduct(-1)} aria-label="نمایش اثر قبلی">← اثر قبلی</button>
                <span>{number.format((categoryProducts.findIndex((product) => product.slug === featuredProduct.slug) + 1))} / {number.format(categoryProducts.length)}</span>
                <button type="button" onClick={() => moveFeaturedProduct(1)} aria-label="نمایش اثر بعدی">اثر بعدی →</button>
              </div>}
            </div> : categoryRenders.length === 0 ? <div className={styles.emptyState}><span aria-hidden="true">✳</span><p>{subtypeId ? "برای این گونه هنوز اثری با تصویر و اطلاعات تأییدشده منتشر نشده است." : "هنوز محصولی با تصویر و شناسنامهٔ تأییدشده برای این ویترین آماده نیست."}</p><button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "studio" })}>درخواست طراحی شخصی <span>←</span></button></div> : null}
            {!subtypeId && <GalleryRenderShelf key={category.id} renders={categoryRenders} categoryLabel={category.label} />}
          </>)}
        {drawer.kind === "basket" && <><span id="gallery-drawer-title" tabIndex={-1} className="sr-only">صندوق درخواست</span><div className={styles.basketView}><RequestBasketView galleryMode products={products} onBrowseCatalog={() => openDrawer({ kind: "magazine" })} onContinueRequest={continueCheckout} continuePending={checkoutPending} continueError={checkoutError} onSelectProduct={openBasketProduct} /></div></>}
        {drawer.kind === "magazine" && <>
          <p className={styles.eyebrow}>مجلهٔ اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>فهرست گالری</h1>
          <p className={styles.intro}>از میان خانواده‌های زیورآلات، اکسسوری و ست‌ها انتخاب کن؛ هر عنوان، ویترین همان دسته را در همین قاب باز می‌کند.</p>
          <div className={styles.magazineSpread} role="group" aria-label="صفحه‌های مجلهٔ دسته‌ها و مجموعه‌ها">
          <div className={styles.magazineFamilies}>{catalogFamilies.map((family) => <section className={styles.magazineFamily} key={family.id} aria-labelledby={`magazine-family-${family.id}`}>
            <h2 id={`magazine-family-${family.id}`}>{family.label}</h2>
            <div className={styles.magazineLinks}>{catalogCategories.filter((item) => item.family === family.id).map((item) => {
              const index = catalogCategories.findIndex((categoryItem) => categoryItem.id === item.id);
              return <button type="button" key={item.id} onClick={() => openCategory(item.id, "magazine")}><small>{number.format(index + 1)}</small>{item.label}<span>↖</span></button>;
            })}</div>
          </section>)}</div>
          <section className={styles.collectionIndex} aria-labelledby="magazine-collections-title">
            <h2 id="magazine-collections-title">مجموعه‌ها</h2>
            <div className={styles.magazineLinks}>{galleryCollections.map((collection) => <button type="button" key={collection.id} onClick={() => openDrawer({ kind: "collection", id: collection.id })}><small>✳</small>{collection.name}<span>↖</span></button>)}</div>
          </section>
          <div className={styles.magazineFooter}><button type="button" onClick={() => openDrawer({ kind: "about" })}>دربارهٔ اُرنوا <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "guide" })}>دفتر راهنما <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "contact" })}>ارتباط با ما <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "account" })}>حساب من <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "library" })}>دفتر طرح‌های شخصی <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "basket" })}>صندوق درخواست <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "studio" })}>اتاق طراحی شخصی <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "ring-builder" })}>طراحی انگشتر <span>↖</span></button><button type="button" onClick={() => { setSizeGuideFromBuilder(false); openDrawer({ kind: "size-guide" }); }}>راهنمای سایز انگشتر <span>↖</span></button></div>
          </div>
        </>}
        {drawer.kind === "collection" && (() => {
          const collection = galleryCollections.find((item) => item.id === drawer.id);
          if (!collection) return <div className={styles.emptyState}><p>این صفحه از مجموعه در دسترس نیست.</p></div>;
          const selectedBirthMonth = collection.birthMonths?.find((month) => month.id === selectedBirthMonthId) ?? collection.birthMonths?.[0];
          const birthMonthWorks = selectedBirthMonth ? [
            { label: "دستبند زودیاک", title: selectedBirthMonth.bracelet, image: selectedBirthMonth.braceletImage },
            { label: "نیم‌ست صورت فلکی", title: selectedBirthMonth.constellation, image: selectedBirthMonth.constellationImage },
            { label: "آویز گل فیبوناچی", title: selectedBirthMonth.flowerPendant, image: selectedBirthMonth.flowerImage },
          ] : [];
          return <>
            <p className={styles.eyebrow}>دفتر مجموعه‌های اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{collection.name}</h1>
            <p className={styles.intro}>{collection.description}</p>
            {collection.birthMonths && selectedBirthMonth ? <>
              <div className={styles.birthMonthPicker} role="group" aria-label="انتخاب ماه تولد">
                {collection.birthMonths.map((month) => <button type="button" key={month.id} aria-pressed={month.id === selectedBirthMonth.id} onClick={() => setSelectedBirthMonthId(month.id)}>{month.name}</button>)}
              </div>
              <h2 className={styles.birthMonthTitle}>{selectedBirthMonth.name}</h2>
              <div className={styles.birthMonthWorks} aria-label={`آثار ماه ${selectedBirthMonth.name}`}>
                {birthMonthWorks.map((work) => <article className={styles.birthMonthWork} key={work.label}>
                  <span className={styles.collectionReferenceNumber}>{work.label}</span>
                  <strong>{work.title}</strong>
                  <figure className={styles.birthMonthFigure}>
                    {work.image ? <Image src={work.image} alt={`${selectedBirthMonth.name}؛ ${work.label}؛ ${work.title}`} width={1122} height={1402} sizes="(max-width: 700px) 76vw, 340px" /> : <div className={styles.collectionImagePending} role="img" aria-label={`تصویر ${work.label} هنوز با طرح ${selectedBirthMonth.name} تطبیق داده نشده`}><span>در انتظار تطبیق عکس نهایی</span></div>}
                    <figcaption>{work.image ? "تصویر نهایی روی استند اختصاصی" : "عکس نهایی این طرح هنوز تطبیق نشده"}</figcaption>
                  </figure>
                </article>)}
              </div>
              <p className={styles.collectionNotice}>عکس فقط وقتی کنار مشخصات می‌آید که با همان مدل تطبیق داده شده باشد. افزودن به صندوق پس از آماده‌شدن شناسنامه و اطلاعات فروش فعال خواهد شد.</p>
            </> : <>
              <div className={styles.collectionReferences} aria-label={`مراجع مجموعهٔ ${collection.name}`}>
                {collection.references.map((reference) => <article className={styles.collectionReference} key={reference}>
                  <span className={styles.collectionReferenceNumber}>مرجع {reference}</span>
                  <strong>آویز گردنبندِ ماه تولد</strong>
                  <small>گل و سنگ، نام روی مکعب و روزِ رومی کنار آن پس از تطبیق عکس و مدل ثبت می‌شود.</small>
                </article>)}
              </div>
              <p className={styles.collectionNotice}>این مراجع هنوز عکس تأییدشدهٔ محصول و جزئیات نهایی ندارند؛ فعلاً برای خرید یا افزودن به صندوق ارائه نمی‌شوند.</p>
            </>}
          </>;
        })()}
        {drawer.kind === "account" && <>
          <p className={styles.eyebrow}>دفترچهٔ مشتری اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{accountCompletionMode ? "تکمیل شناسنامه" : "حساب من"}</h1>
          <p className={styles.intro}>{accountCompletionMode ? "برای ادامهٔ انتخاب‌ها، راه تماس و نشانی را در شناسنامهٔ خصوصی خود ثبت کن. پس از ذخیره، مستقیم به صندوق گالری برمی‌گردی." : "برای پیگیری درخواست‌ها و گفت‌وگوها، لینک ورود یک‌بارمصرف را به ایمیلت بفرست. ورود و تکمیل شناسنامه در همین فضای گالری انجام می‌شود."}</p>
          <GalleryAccountPanel completionMode={accountCompletionMode} initialError={accountInitialError} signOutFailed={accountSignOutFailed} onReturnToBasket={() => openDrawer({ kind: "basket" })} nextDestination={accountReturnDestination} />
        </>}
        {drawer.kind === "library" && <><span id="gallery-drawer-title" className="sr-only">گالری من</span><GalleryLibraryPanel onOpenAccount={openLibraryAccount} /></>}
        {drawer.kind === "guide" && <>
          <p className={styles.eyebrow}>دفتر همراهی اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>راهنمای گالری</h1>
          <GalleryGuidePanel initialChapter={guideChapter} onContact={() => openDrawer({ kind: "contact" })} onSizeGuide={() => { setSizeGuideFromBuilder(false); openDrawer({ kind: "size-guide" }); }} />
        </>}
        {drawer.kind === "ring-builder" && <RingDesignBuilder onContinueRequest={() => openRingBuilderContact(false)} onContinueWithoutDraft={() => openRingBuilderContact(true)} onOpenProduct={openRingBuilderProduct} onOpenSizeGuide={openRingSizeGuide} />}
        {drawer.kind === "size-guide" && <>
          <p className={styles.eyebrow}>راهنمای اندازه‌گیری</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>سایز انگشتر را دقیق‌تر پیدا کن</h1>
          <p className={styles.intro}>برای ثبت سایز در پیش‌طرح، اندازهٔ داخلی یکی از انگشترهای راحت خود را بر حسب میلی‌متر بررسی کن. اندازهٔ نهایی پیش از ساخت باید با تیم اُرنوا تأیید شود.</p>
          <ol className={styles.sizeGuideSteps}><li><strong>یک انگشتر مناسب انتخاب کن</strong><span>انگشتری را بردار که روی همان انگشت راحت است و به‌سادگی از بند انگشت عبور می‌کند.</span></li><li><strong>قطر داخلی را اندازه بگیر</strong><span>خط‌کش را از وسط فضای داخلی حلقه بگذر‌ان؛ عدد را با دقت میلی‌متری یادداشت کن.</span></li><li><strong>عدد را برای بررسی بفرست</strong><span>اندازهٔ تقریبی را در یادداشت طراحی بنویس. اندازه‌گیری با نخ یا نوار ممکن است خطا داشته باشد.</span></li></ol>
          <p className={styles.collectionNotice}>راهنمایی حاضر جای اندازه‌گیری حرفه‌ای یا تأیید سایز نهایی را نمی‌گیرد.</p>
          <button type="button" className={styles.primaryLink} onClick={() => { setSizeGuideFromBuilder(true); setDrawer({ kind: "ring-builder" }); }}>ادامهٔ طراحی انگشتر <span>←</span></button>
        </>}
        {drawer.kind === "contact" && <><p className={styles.eyebrow}>تلفن گالری</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>ارتباط با اُرنوا</h1><p className={styles.intro}>برای پیگیری درخواست، پرسش دربارهٔ یک اثر یا گفت‌وگو دربارهٔ ایدهٔ شخصی، همین‌جا پیام بگذار.</p><div className={styles.basketView}><InquiryForm galleryMode productContext={contactProduct ? { slug: contactProduct.slug, name: contactProduct.name, category: contactProduct.category } : undefined} productSelectionKey={contactProductSelectionKey} sourceContext={contactContext?.sourceContext} requestBasketContext={contactContext?.requestBasketContext} intent={contactProduct ? contactContext?.intent : undefined} includeRingDraft={contactContext?.sourceContext !== "custom-design" && !contactContext?.withoutDraft} loginNextPath={contactLoginNextPath} /></div><button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "basket" })}>دیدن صندوق درخواست <span>←</span></button></>}
        {drawer.kind === "studio" && <DesignStudio draftId={studioDraftId} userId={null} imageMode={imageMode} embedded onOpenInquiry={() => openDrawer({ kind: "contact" })} onOpenAccountGallery={() => openDrawer({ kind: "library" })} onRequestLogin={(id) => { setAccountReturnDestination(`/?galleryPanel=studio&draft=${encodeURIComponent(id)}`); openDrawer({ kind: "account" }); }} />}
        {drawer.kind === "about" && <><p className={styles.eyebrow}>یادداشت مجله</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>دربارهٔ اُرنوا</h1><p className={styles.intro}>Ornova by Yas فضای شخصی یاس برای طراحی دیجیتال جواهرات نقره است؛ هر اثر از ایده و فرم آغاز می‌شود و با ابزارهایی مانند MatrixGold و ZBrush به طرحی قابل بررسی می‌رسد.</p><p className={styles.intro}>این گالری برای دیدن آثار، خواندن شناسنامهٔ هر قطعه و فرستادن ایده‌های طراحی ساخته شده است؛ جزئیات هر محصول بر پایهٔ اطلاعات تأییدشدهٔ همان اثر نمایش داده می‌شود.</p><button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "contact" })}>ارتباط با اُرنوا <span>←</span></button><button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "account" })}>حساب مشتری <span>←</span></button></>}
      </aside>
    </div>}
  </div>;
}
