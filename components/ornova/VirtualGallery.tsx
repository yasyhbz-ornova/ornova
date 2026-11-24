"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { InquiryForm } from "@/components/commerce/InquiryForm";
import { RingDesignBuilder } from "@/components/commerce/RingDesignBuilder";
import { RequestBasketView } from "@/components/commerce/RequestBasketView";
import { GalleryAccountPanel } from "@/components/ornova/GalleryAccountPanel";
import { GalleryGuidePanel, type GuideChapter } from "@/components/ornova/GalleryGuidePanel";
import { GalleryLibraryPanel } from "@/components/ornova/GalleryLibraryPanel";
import { DesignStudio, type StudioInquiryMode } from "@/components/studio/DesignStudio";
import { GalleryShowcaseConcept, type GalleryShowcaseHandle } from "./GalleryShowcaseConcept";
import { OrnovaSymbol } from "./OrnovaBrandMark";
import { galleryRoomSamplesByCategory, type GalleryShowcasePhoto } from "@/lib/constants/gallery-room-samples";
import { findGalleryProduct } from "@/lib/catalog/gallery-product-link";
import { catalogCategories, catalogFamilies } from "@/lib/constants/catalog";
import { galleryCollections } from "@/lib/constants/collections";
import { products as legacyProducts, type Product } from "@/lib/constants/products";
import { REQUEST_LINE_ID_PATTERN } from "@/lib/commerce/request-basket";
import { getAuthCallbackErrorMessage } from "@/lib/auth/inputs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isStudioId } from "@/lib/studio/conversation";
import styles from "./VirtualGallery.module.css";

const number = new Intl.NumberFormat("fa-IR");
function isPublicGalleryProduct(product: Product) {
  return product.publicationStatus === "published" && product.galleryPlacementVerified === true && Boolean(product.standImage);
}
type Drawer = { kind: "category"; id: string } | { kind: "collection"; id: string } | { kind: "magazine" | "contact" | "studio" | "about" | "account" | "library" | "basket" | "ring-builder" | "size-guide" | "guide" };
type ProductTraySelection = {
  product: Product;
  origin?: { drawer: Drawer; backLabel: string; focusId?: string; previous: ProductTraySelection | null };
};
const galleryPanelEvent = "ornova-gallery-panel-change";

function GalleryIndexWork({ id, name, image, archiveNumber, onOpen }: { id: string; name: string; image: string; archiveNumber?: string; onOpen(): void }) {
  return <li>
    <button id={id} type="button" className={styles.indexWork} data-archive-photo={archiveNumber} aria-label={`نمایش ${name} روی سینی`} onClick={onOpen}>
      <span className={styles.indexWorkImage}><Image src={image} alt="" fill sizes="66px" unoptimized /></span>
      <span>{name}</span>
    </button>
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

export function VirtualGallery({ imageMode, galleryProducts, studioDraftOwner = null }: { imageMode: "offline" | "preview"; galleryProducts?: Product[]; studioDraftOwner?: string | null }) {
  const products = galleryProducts ?? legacyProducts;
  const showcaseRef = useRef<GalleryShowcaseHandle>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const returnDrawerFocusId = useRef<string | undefined>(undefined);
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
  const [productTray, setProductTray] = useState<ProductTraySelection | null>(null);
  const [studioContact, setStudioContact] = useState<{ mode: StudioInquiryMode; studioDraftId: string | null } | null>(null);
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
  const contactSourceContext = studioContact?.mode === "transferred" ? "custom-design" : contactContext?.sourceContext;
  const contactProduct = useMemo(() => products.find((item) => item.slug === contactContext?.productSlug && isPublicGalleryProduct(item)) ?? null, [contactContext?.productSlug, products]);
  const contactProductSelectionKey = contactProduct && contactContext?.selection !== undefined
    ? contactContext.selection === contactProduct.slug || REQUEST_LINE_ID_PATTERN.test(contactContext.selection) ? contactContext.selection : "invalid-selection"
    : undefined;
  const contactLoginNextPath = useMemo(() => {
    const params = new URLSearchParams();
    if (contactProduct) params.set("product", contactProduct.slug);
    if (contactProductSelectionKey) params.set("selection", contactProductSelectionKey);
    if (contactSourceContext) params.set("from", contactSourceContext);
    else if (contactContext?.requestBasketContext) params.set("from", "request-basket");
    if (contactProduct && contactContext?.intent) params.set("intent", contactContext.intent);
    if (contactContext?.sourceContext === "ring-builder" && contactContext.withoutDraft) params.set("withoutDraft", "1");
    return `/?galleryPanel=contact${params.size ? `&${params.toString()}` : ""}`;
  }, [contactContext, contactProduct, contactProductSelectionKey, contactSourceContext]);
  const linkedGalleryProduct = useMemo(() => products.find((item) => item.slug === linkedProductSlug && isPublicGalleryProduct(item)) ?? null, [linkedProductSlug, products]);
  const drawer = useMemo(() => drawerState ?? (returnPanel ? { kind: returnPanel } : null), [drawerState, returnPanel]);
  const trayProduct = productTray?.product ?? linkedGalleryProduct;
  const [selectedBirthMonthId, setSelectedBirthMonthId] = useState("farvardin");
  const [collectionFromRoomBook, setCollectionFromRoomBook] = useState(false);
  const [subtypeId, setSubtypeId] = useState<string | null>(null);
  const category = drawer?.kind === "category" ? catalogCategories.find((item) => item.id === drawer.id) : null;
  const categoryProducts = useMemo(() => products.filter((product) => product.categoryId === category?.id && isPublicGalleryProduct(product)), [category?.id, products]);
  const filteredProducts = subtypeId ? categoryProducts.filter((product) => product.subtypeId === subtypeId) : categoryProducts;
  const archiveWorks = category && !subtypeId ? (galleryRoomSamplesByCategory[category.id] ?? []).flatMap((photo) =>
    photo.trayImage && !findGalleryProduct(products, photo) ? [{ photo, image: photo.trayImage }] : [],
  ) : [];

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
    clearGalleryReturnState();
    setDrawer(null);
    setStudioContact(null);
    setCollectionFromRoomBook(false);
    setAccountReturnDestination(undefined);
    const trigger = returnFocusRef.current;
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, [clearGalleryReturnState]);

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
        heading?.focus({ preventScroll: true });
        review?.scrollIntoView({ block: "center" });
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (drawer.kind === "collection" && !collectionFromRoomBook) { setDrawer({ kind: "magazine" }); return; }
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
  }, [closeDrawer, collectionFromRoomBook, drawer, studioContact]);

  useEffect(() => {
    const clearLocalDrawer = () => { setDrawer(null); setProductTray(null); setSubtypeId(null); setStudioContact(null); };
    window.addEventListener("popstate", clearLocalDrawer);
    return () => window.removeEventListener("popstate", clearLocalDrawer);
  }, []);

  useEffect(() => {
    if (linkedProductSlug && !linkedGalleryProduct) clearGalleryReturnState();
  }, [clearGalleryReturnState, linkedGalleryProduct, linkedProductSlug]);

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
    const previous = productTray ?? (linkedGalleryProduct ? { product: linkedGalleryProduct } : null);
    clearGalleryReturnState();
    setProductTray({ product, origin: { drawer, backLabel, focusId, previous } });
    setDrawer(null);
  }
  function closeProductTray() {
    clearGalleryReturnState();
    const origin = productTray?.origin;
    setProductTray(origin?.previous ?? null);
    if (origin) {
      returnDrawerFocusId.current = origin.focusId;
      setDrawer(origin.drawer);
    }
  }
  function openGalleryPanel(href: string) {
    if (href === "/?galleryPanel=basket" && !drawer && productTray?.origin?.drawer.kind === "basket") {
      closeProductTray();
      return;
    }
    if (linkedGalleryProduct && !productTray) setProductTray({ product: linkedGalleryProduct });
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.history.pushState(window.history.state, "", href);
    window.dispatchEvent(new Event(galleryPanelEvent));
  }
  function openCollection(id: string, roomBookTrigger?: HTMLButtonElement) {
    setCollectionFromRoomBook(Boolean(roomBookTrigger));
    openDrawer({ kind: "collection", id });
    if (roomBookTrigger) returnFocusRef.current = roomBookTrigger;
  }
  function openGalleryPhoto(photo: GalleryShowcasePhoto, focusId: string, backLabel: string) {
    if (!drawer) return;
    const fromRoomBook = drawer.kind === "collection" && collectionFromRoomBook;
    const roomBookTrigger = fromRoomBook ? returnFocusRef.current : null;
    const opened = showcaseRef.current?.openPhoto(photo, {
      label: backLabel,
      onBack() {
        returnDrawerFocusId.current = focusId;
        setCollectionFromRoomBook(fromRoomBook);
        if (roomBookTrigger) returnFocusRef.current = roomBookTrigger;
        setDrawer(drawer);
      },
    });
    if (!opened) return;
    clearGalleryReturnState();
    setDrawer(null);
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
  function openCategory(id: string) {
    setSubtypeId(null);
    openDrawer({ kind: "category", id });
  }
  function returnFromCategory() {
    if (category) returnDrawerFocusId.current = `gallery-magazine-category-${category.id}`;
    setSubtypeId(null);
    setDrawer({ kind: "magazine" });
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
    if (drawer?.kind === "category") { returnFromCategory(); return; }
    if (drawer?.kind === "collection" && !collectionFromRoomBook) { setDrawer({ kind: "magazine" }); return; }
    if (drawer?.kind === "contact" && studioContact) { setDrawer({ kind: "studio" }); return; }
    if (drawer?.kind === "contact" && contactContext?.sourceContext === "ring-builder") { returnToRingBuilder(); return; }
    if (drawer?.kind === "size-guide" && sizeGuideFromBuilder) { setDrawer({ kind: "ring-builder" }); return; }
    closeDrawer();
  }
  function openBasketProduct(slug: string, focusId: string) {
    const product = products.find((item) => item.slug === slug && isPublicGalleryProduct(item));
    if (product) openProductOnTray(product, "بازگشت به صندوق", focusId);
  }
  const activeCollection = drawer?.kind === "collection" ? galleryCollections.find((item) => item.id === drawer.id) : undefined;
  const selectedBirthMonth = activeCollection?.birthMonths?.find((month) => month.id === selectedBirthMonthId) ?? activeCollection?.birthMonths?.[0];
  const birthMonthWorks = selectedBirthMonth ? [
    { label: "دستبند زودیاک", title: selectedBirthMonth.bracelet, image: selectedBirthMonth.braceletImage },
    { label: "نیم‌ست صورت فلکی", title: selectedBirthMonth.constellation, image: selectedBirthMonth.constellationImage },
    { label: "آویز گل فیبوناچی", title: selectedBirthMonth.flowerPendant, image: selectedBirthMonth.flowerImage },
  ] : [];

  return <div className={`${styles.root} virtualGallery`} dir="rtl">
  <GalleryShowcaseConcept
    ref={showcaseRef}
    products={products}
    panelOpen={Boolean(drawer)}
    productPreview={trayProduct ? { product: trayProduct, backLabel: productTray?.origin?.backLabel, onClose: closeProductTray } : undefined}
    onOpenBirthMonths={(trigger) => openCollection("birth-months", trigger)}
    onOpenPanel={openGalleryPanel}
  />

    {drawer && <div className={styles.overlay} data-studio-open={drawer.kind === "studio" ? "true" : "false"} data-basket-open={drawer.kind === "basket" ? "true" : undefined} data-account-open={drawer.kind === "account" || undefined} role="dialog" aria-modal="true" aria-labelledby="gallery-drawer-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
      <aside className={styles.drawer} ref={drawerRef}>
        <div className={styles.drawerTop}>
          <button type="button" onClick={handleDrawerBack} className={styles.backButton}>{drawer.kind === "collection" && collectionFromRoomBook ? "بازگشت به کتاب" : drawer.kind === "category" || drawer.kind === "collection" ? "بازگشت به فهرست" : drawer.kind === "contact" && studioContact ? "بازگشت به کارگاه" : (drawer.kind === "contact" && contactContext?.sourceContext === "ring-builder") || (drawer.kind === "size-guide" && sizeGuideFromBuilder) ? "بازگشت به طراحی انگشتر" : "بازگشت به گالری"} <span aria-hidden="true">↙</span></button>
          <button type="button" onClick={closeDrawer} className={styles.closeButton} aria-label="بستن پنل">×</button>
        </div>
        {drawer.kind === "category" && category && <>
          <h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{category.label}</h1>
          {(categoryProducts.length > 0 || archiveWorks.length > 0) && <p className={styles.intro}>برای دیدن هر اثر روی سینی، آن را از فهرست انتخاب کن.</p>}
          {categoryProducts.length > 0 && <div className={styles.subtypes} role="group" aria-label={`گونه‌های ${category.label}`}>
            <button type="button" aria-pressed={!subtypeId} className={!subtypeId ? styles.selectedSubtype : ""} onClick={() => setSubtypeId(null)}>همهٔ گونه‌ها</button>
            {category.types.map((type) => <button type="button" key={type.id} aria-pressed={subtypeId === type.id} className={subtypeId === type.id ? styles.selectedSubtype : ""} onClick={() => setSubtypeId(type.id)}>{type.label}</button>)}
          </div>}
          {filteredProducts.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-orderable-title">
            <h2 id="gallery-orderable-title">آثار قابل سفارش</h2>
            <ul className={styles.indexWorks}>{filteredProducts.map((product) => {
              if (!product.standImage) return null;
              const id = `gallery-index-product-${product.slug}`;
              return <GalleryIndexWork key={id} id={id} name={product.name} image={product.standImage} onOpen={() => openProductOnTray(product, "بازگشت به ویترین", id)} />;
            })}</ul>
          </section>}
          {archiveWorks.length > 0 && <section className={styles.indexSection} aria-labelledby="gallery-archive-title">
            <h2 id="gallery-archive-title">آرشیو آثار</h2>
            <ul className={styles.indexWorks}>{archiveWorks.map(({ photo, image }) => {
              const id = `gallery-archive-photo-${photo.number}`;
              return <GalleryIndexWork key={id} id={id} name={photo.title} image={image} archiveNumber={photo.number} onOpen={() => openGalleryPhoto(photo, id, "بازگشت به آرشیو")} />;
            })}</ul>
          </section>}
          {filteredProducts.length === 0 && archiveWorks.length === 0 && <div className={styles.emptyState}>
            <p>{subtypeId ? "برای این گونه هنوز اثری منتشر نشده است." : "برای این دسته هنوز اثری آمادهٔ نمایش نیست."}</p>
            {!subtypeId && <button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "studio" })}>درخواست طراحی شخصی <span aria-hidden="true">←</span></button>}
          </div>}
        </>}
        {drawer.kind === "basket" && <><span id="gallery-drawer-title" tabIndex={-1} className="sr-only">صندوق درخواست</span><div className={styles.basketView}><RequestBasketView galleryMode products={products} onBrowseCatalog={() => openDrawer({ kind: "magazine" })} onContinueRequest={continueCheckout} continuePending={checkoutPending} continueError={checkoutError} onSelectProduct={openBasketProduct} /></div></>}
        {drawer.kind === "magazine" && <>
          <p className={styles.eyebrow}>مجلهٔ اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>فهرست گالری</h1>
          <p className={styles.intro}>از میان خانواده‌های زیورآلات، اکسسوری و ست‌ها انتخاب کن؛ هر عنوان، ویترین همان دسته را در همین قاب باز می‌کند.</p>
          <div className={styles.magazineSpread} role="group" aria-label="صفحه‌های مجلهٔ دسته‌ها و مجموعه‌ها">
          <div className={styles.magazineFamilies}>{catalogFamilies.map((family) => <section className={styles.magazineFamily} key={family.id} aria-labelledby={`magazine-family-${family.id}`}>
            <h2 id={`magazine-family-${family.id}`}>{family.label}</h2>
            <div className={styles.magazineLinks}>{catalogCategories.filter((item) => item.family === family.id).map((item) => {
              const index = catalogCategories.findIndex((categoryItem) => categoryItem.id === item.id);
              return <button id={`gallery-magazine-category-${item.id}`} type="button" key={item.id} onClick={() => openCategory(item.id)}><small>{number.format(index + 1)}</small>{item.label}<span>↖</span></button>;
            })}</div>
          </section>)}</div>
          <section className={styles.collectionIndex} aria-labelledby="magazine-collections-title">
            <h2 id="magazine-collections-title">مجموعه‌ها</h2>
            <div className={styles.magazineLinks}>{galleryCollections.map((collection) => <button type="button" key={collection.id} onClick={() => openCollection(collection.id)}><small>✳</small>{collection.name}<span>↖</span></button>)}</div>
          </section>
          <div className={styles.magazineFooter}><button type="button" onClick={() => openDrawer({ kind: "about" })}>دربارهٔ اُرنوا <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "guide" })}>دفتر راهنما <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "contact" })}>ارتباط با ما <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "account" })}>حساب من <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "library" })}>دفتر طرح‌های شخصی <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "basket" })}>صندوق درخواست <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "studio" })}>اتاق طراحی شخصی <span>↖</span></button><button type="button" onClick={() => openDrawer({ kind: "ring-builder" })}>طراحی انگشتر <span>↖</span></button><button type="button" onClick={() => { setSizeGuideFromBuilder(false); openDrawer({ kind: "size-guide" }); }}>راهنمای سایز انگشتر <span>↖</span></button></div>
          </div>
        </>}
        {drawer.kind === "collection" && (activeCollection ? <>
            <p className={styles.eyebrow}>دفتر مجموعه‌های اُرنوا</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{activeCollection.name}</h1>
            <p className={styles.intro}>{activeCollection.description}</p>
            {activeCollection.birthMonths && selectedBirthMonth ? <>
              <div className={styles.birthMonthPicker} role="group" aria-label="انتخاب ماه تولد">
                {activeCollection.birthMonths.map((month) => <button type="button" key={month.id} aria-pressed={month.id === selectedBirthMonth.id} onClick={() => setSelectedBirthMonthId(month.id)}>{month.name}</button>)}
              </div>
              <h2 className={styles.birthMonthTitle}>{selectedBirthMonth.name}</h2>
              <div className={styles.birthMonthWorks} aria-label={`آثار ماه ${selectedBirthMonth.name}`}>
                {birthMonthWorks.map(({ label, title, image }) => <article className={styles.birthMonthWork} key={label}>
                  <span className={styles.collectionReferenceNumber}>{label}</span>
                  <strong>{title}</strong>
                  {image ? <figure className={styles.birthMonthFigure}>
                    <button id={`gallery-collection-photo-${image.number}`} type="button" className={styles.birthMonthPhoto} data-collection-photo={image.number} aria-label={`نمایش ${image.title} روی سینی`} onClick={(event) => openGalleryPhoto(image, event.currentTarget.id, "بازگشت به دفتر")}>
                      <Image src={image.src} alt={image.title} width={image.width} height={image.height} sizes="(max-width: 700px) 76vw, 320px" />
                    </button>
                  </figure> : <p className={styles.collectionImagePending}>عکس این طرح در حال تطبیق است.</p>}
                </article>)}
              </div>
              <p className={styles.collectionNotice}>عکس فقط وقتی کنار مشخصات می‌آید که با همان مدل تطبیق داده شده باشد. افزودن به صندوق پس از آماده‌شدن شناسنامه و اطلاعات فروش فعال خواهد شد.</p>
            </> : <>
              <div className={styles.collectionReferences} aria-label={`مراجع مجموعهٔ ${activeCollection.name}`}>
                {activeCollection.references.map((reference) => <article className={styles.collectionReference} key={reference}>
                  <span className={styles.collectionReferenceNumber}>مرجع {reference}</span>
                  <strong>آویز گردنبندِ ماه تولد</strong>
                  <small>گل و سنگ، نام روی مکعب و روزِ رومی کنار آن پس از تطبیق عکس و مدل ثبت می‌شود.</small>
                </article>)}
              </div>
              <p className={styles.collectionNotice}>این مراجع هنوز عکس تأییدشدهٔ محصول و جزئیات نهایی ندارند؛ فعلاً برای خرید یا افزودن به صندوق ارائه نمی‌شوند.</p>
            </>}
          </> : <div className={styles.emptyState}><p>این صفحه از مجموعه در دسترس نیست.</p></div>)}
        {drawer.kind === "account" && <>
          <header className={styles.accountHeading}>
            <OrnovaSymbol className={styles.accountSymbol} />
            <h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>{accountCompletionMode ? "تماس و نشانی" : "حساب من"}</h1>
          </header>
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
        {(drawer.kind === "contact" || (drawer.kind === "studio" && studioContact)) && <div className="pt-3.5" hidden={drawer.kind !== "contact"} inert={drawer.kind !== "contact"}>
          <p className={styles.eyebrow}>تلفن گالری</p>
          <h1 id={drawer.kind === "contact" ? "gallery-drawer-title" : undefined} tabIndex={-1} className={styles.title}>ارتباط با اُرنوا</h1>
          <p className={styles.intro}>{studioContact?.mode === "transferred" ? "خلاصهٔ ایده‌ات از کارگاه به این فرم آمده است. پیش از ارسال می‌توانی آن را همین‌جا بازبینی کنی." : "برای پیگیری درخواست، پرسش دربارهٔ یک اثر یا گفت‌وگو دربارهٔ ایدهٔ شخصی، همین‌جا پیام بگذار."}</p>
          <div className={styles.basketView}><InquiryForm galleryMode productContext={contactProduct ? { slug: contactProduct.slug, name: contactProduct.name, category: contactProduct.category } : undefined} productSelectionKey={contactProductSelectionKey} sourceContext={contactSourceContext} requestBasketContext={contactContext?.requestBasketContext} intent={contactProduct ? contactContext?.intent : undefined} includeRingDraft={!contactContext?.withoutDraft} loginNextPath={contactLoginNextPath} /></div>
          <button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "basket" })}>دیدن صندوق درخواست <span aria-hidden="true">←</span></button>
        </div>}
        {(drawer.kind === "studio" || (drawer.kind === "contact" && studioContact)) && <div hidden={drawer.kind !== "studio"} inert={drawer.kind !== "studio"}>
          <DesignStudio
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
        {drawer.kind === "about" && <><p className={styles.eyebrow}>یادداشت مجله</p><h1 id="gallery-drawer-title" tabIndex={-1} className={styles.title}>دربارهٔ اُرنوا</h1><p className={styles.intro}>Ornova by Yas فضای شخصی یاس برای طراحی دیجیتال جواهرات نقره است؛ هر اثر از ایده و فرم آغاز می‌شود و با ابزارهایی مانند MatrixGold و ZBrush به طرحی قابل بررسی می‌رسد.</p><p className={styles.intro}>این گالری برای دیدن آثار، خواندن شناسنامهٔ هر قطعه و فرستادن ایده‌های طراحی ساخته شده است؛ جزئیات هر محصول بر پایهٔ اطلاعات تأییدشدهٔ همان اثر نمایش داده می‌شود.</p><button type="button" className={styles.primaryLink} onClick={() => openDrawer({ kind: "contact" })}>ارتباط با اُرنوا <span>←</span></button><button type="button" className={styles.secondaryLink} onClick={() => openDrawer({ kind: "account" })}>حساب مشتری <span>←</span></button></>}
      </aside>
    </div>}
  </div>;
}
