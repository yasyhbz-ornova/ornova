"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { catalogCategories, type CatalogCategoryId } from "@/lib/constants/catalog";
import { products, type Product } from "@/lib/constants/products";
import { ORNOVA_BRAND_MARKUP } from "./OrnovaBrandMark";
import styles from "./VirtualGallery.module.css";

const panoramaUrl = "/images/ornova/gallery/ornova-gallery-360-entry-v8.webp";
const displays = [
  { categoryId: "rings", productSlug: "lajvard-shab-ring", pitch: -4, yaw: -67 },
  { categoryId: "brooches-pins", pitch: -4, yaw: -34 },
  { categoryId: "charms", pitch: -4, yaw: 62 },
] as const;
const defaultView = { pitch: -7, yaw: -3, hfov: 100 };

function isCompactViewport() {
  return window.matchMedia("(max-width: 800px)").matches;
}

function minimumHfov() {
  return isCompactViewport() ? 48 : 50;
}

function fittedHfov(hfov: number) {
  return Math.max(minimumHfov(), Math.min(isCompactViewport() ? 150 : 166, hfov));
}

function entryView() {
  return { ...defaultView, pitch: isCompactViewport() ? -8 : defaultView.pitch, hfov: isCompactViewport() ? 90 : defaultView.hfov };
}

export type GalleryPose = { pitch: number; yaw: number; hfov: number };

export type Gallery360StageHandle = {
  focus(pitch: number, yaw: number, hfov?: number): void;
  navigate(pitch: number, yaw: number, hfov?: number): void;
  restore(): void;
  reset(): void;
  zoom(delta: number): void;
};

export type GalleryDisplaySelection = {
  categoryId: CatalogCategoryId;
  product?: Product;
  pose: { pitch: number; yaw: number };
};

type Props = {
  onDisplaySelect(selection: GalleryDisplaySelection): void;
  onMagazineSelect(): void;
  onPhoneSelect(): void;
  onStudioSelect(): void;
};

let scriptPromise: Promise<void> | null = null;

function hasPannellumApi() {
  const api = (window as unknown as { pannellum?: { viewer?: unknown } }).pannellum;
  return typeof api?.viewer === "function";
}

function loadPannellum() {
  if (typeof window !== "undefined" && hasPannellumApi()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    let link = document.getElementById("ornova-pannellum-css") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "ornova-pannellum-css";
      link.rel = "stylesheet";
      link.href = "/vendor/pannellum/pannellum.css";
      document.head.append(link);
    }

    const existing = document.getElementById("ornova-pannellum-script") as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true" && hasPannellumApi()) {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      script.dataset.loaded = "true";
      if (hasPannellumApi()) resolve();
      else reject(new Error("Pannellum loaded without its viewer API"));
    };
    const onError = () => reject(new Error("Pannellum could not be loaded"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = "ornova-pannellum-script";
      script.src = "/vendor/pannellum/pannellum.js";
      script.async = true;
      document.body.append(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export const Gallery360Stage = forwardRef<Gallery360StageHandle, Props>(function Gallery360Stage(
  { onDisplaySelect, onMagazineSelect, onPhoneSelect, onStudioSelect },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Pannellum.Viewer | null>(null);
  const restorePoseRef = useRef<GalleryPose | null>(null);
  const pendingFocusRef = useRef<GalleryPose | null>(null);
  const onDisplaySelectRef = useRef(onDisplaySelect);
  const onMagazineSelectRef = useRef(onMagazineSelect);
  const onPhoneSelectRef = useRef(onPhoneSelect);
  const onStudioSelectRef = useRef(onStudioSelect);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  onDisplaySelectRef.current = onDisplaySelect;
  onMagazineSelectRef.current = onMagazineSelect;
  onPhoneSelectRef.current = onPhoneSelect;
  onStudioSelectRef.current = onStudioSelect;

  function savePose(viewer: Pannellum.Viewer) {
    if (!restorePoseRef.current) {
      restorePoseRef.current = { pitch: viewer.getPitch(), yaw: viewer.getYaw(), hfov: viewer.getHfov() };
    }
  }

  useImperativeHandle(ref, () => ({
    focus(pitch, yaw, hfov = 90) {
      const viewer = viewerRef.current;
      if (!viewer) { pendingFocusRef.current = { pitch, yaw, hfov }; return; }
      savePose(viewer);
      viewer.lookAt(pitch, yaw, fittedHfov(hfov), 720);
    },
    navigate(pitch, yaw, hfov = 96) {
      const viewer = viewerRef.current;
      if (!viewer) { pendingFocusRef.current = { pitch, yaw, hfov }; return; }
      viewer.lookAt(pitch, yaw, fittedHfov(hfov), 1050);
    },
    restore() {
      const viewer = viewerRef.current;
      const saved = restorePoseRef.current;
      if (!viewer || !saved) return;
      restorePoseRef.current = null;
      viewer.lookAt(saved.pitch, saved.yaw, saved.hfov, 720);
    },
    reset() {
      const viewer = viewerRef.current;
      if (!viewer) return;
      restorePoseRef.current = null;
      const target = entryView();
      viewer.lookAt(target.pitch, target.yaw, target.hfov, 760);
    },
    zoom(delta) {
      const viewer = viewerRef.current;
      if (viewer) viewer.setHfov(Math.max(minimumHfov(), Math.min(isCompactViewport() ? 150 : 166, viewer.getHfov() + delta)), 180);
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    let viewer: Pannellum.Viewer | null = null;
    const host = hostRef.current;

    async function initialize() {
      try {
        await loadPannellum();
        if (cancelled || !host) return;
        const initialView = entryView();

        const hotspots: Pannellum.HotspotOptions[] = displays.map((pose, slot) => ({
          id: `ornova-display-${slot + 1}`,
          type: "info",
          pitch: pose.pitch,
          yaw: pose.yaw,
          cssClass: "ornova-display-hotspot",
          createTooltipArgs: { slot },
          createTooltipFunc: (hotspot, rawArgs) => {
            const args = rawArgs as { slot: number };
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ornova-display-card";
            button.dataset.categoryId = displays[args.slot].categoryId;
            button.setAttribute("aria-label", `بازکردن ویترین ${catalogCategories.find((category) => category.id === displays[args.slot].categoryId)?.label ?? "دسته"}`);

            button.textContent = catalogCategories.find((category) => category.id === displays[args.slot].categoryId)?.label ?? "ویترین";
            hotspot.append(button);
            button.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                button.click();
              }
            });
          },
          clickHandlerArgs: { slot },
          clickHandlerFunc: (_event, rawArgs) => {
            const args = rawArgs as { slot: number };
            const poseForStand = displays[args.slot];
            const product = "productSlug" in poseForStand && poseForStand.productSlug
              ? products.find((item) => item.slug === poseForStand.productSlug)
              : undefined;
            const currentViewer = viewerRef.current;
            if (currentViewer) {
              savePose(currentViewer);
              currentViewer.lookAt(poseForStand.pitch, poseForStand.yaw, fittedHfov(86), 680);
            }
            onDisplaySelectRef.current({ categoryId: poseForStand.categoryId, product, pose: poseForStand });
          },
        }));

        hotspots.push({
          id: "ornova-closed-magazine",
          type: "info",
          pitch: -27,
          yaw: -9,
          text: "مجلهٔ گالری",
          cssClass: "ornova-magazine-hotspot",
          clickHandlerFunc: () => {
            const currentViewer = viewerRef.current;
            if (currentViewer) {
              savePose(currentViewer);
              currentViewer.lookAt(-18, 0, fittedHfov(88), 650);
            }
            onMagazineSelectRef.current();
          },
          createTooltipFunc: (hotspot) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ornova-magazine-mark";
            button.textContent = "فهرست مجموعه‌ها";
            button.setAttribute("aria-label", "بازکردن فهرست مجموعه‌ها از مجلهٔ بسته");
            hotspot.append(button);
          },
        });

        hotspots.push({
          id: "ornova-antique-phone",
          type: "info",
          pitch: -25,
          yaw: 8,
          cssClass: "ornova-phone-hotspot",
          clickHandlerFunc: () => {
            const currentViewer = viewerRef.current;
            if (currentViewer) {
              savePose(currentViewer);
              currentViewer.lookAt(-14, 10, fittedHfov(96), 650);
            }
            onPhoneSelectRef.current();
          },
          createTooltipFunc: (hotspot) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ornova-phone-mark";
            button.textContent = "ارتباط با گالری";
            button.setAttribute("aria-label", "بازکردن راه ارتباط با اُرنوا از تلفن قدیمی");
            hotspot.append(button);
          },
        });

        hotspots.push({
          id: "ornova-wall-signature",
          type: "info",
          pitch: 29,
          yaw: 0,
          cssClass: "ornova-brand-hotspot",
          createTooltipFunc: (hotspot) => {
            const brand = document.createElement("div");
            brand.className = "ornova-wall-signature";
            brand.setAttribute("role", "img");
            brand.setAttribute("aria-label", "ornova — more than metal, this is my design.");
            brand.innerHTML = ORNOVA_BRAND_MARKUP;
            hotspot.append(brand);
          },
        });

        hotspots.push({
          id: "ornova-personal-design",
          type: "info",
          pitch: 19,
          yaw: 0,
          cssClass: "ornova-personal-hotspot",
          createTooltipFunc: (hotspot) => {
            const plaque = document.createElement("div");
            plaque.className = "ornova-personal-plaque";
            plaque.textContent = "PERSONAL DESIGN";
            plaque.setAttribute("role", "img");
            plaque.setAttribute("aria-label", "اتاق طراحی اختصاصی؛ PERSONAL DESIGN");
            hotspot.append(plaque);
          },
        });

        hotspots.push({
          id: "ornova-design-studio",
          type: "info",
          pitch: 10,
          yaw: 0,
          cssClass: "ornova-studio-hotspot",
          clickHandlerFunc: () => onStudioSelectRef.current(),
          createTooltipFunc: (hotspot) => {
            const studio = document.createElement("button");
            studio.type = "button";
            studio.className = "ornova-studio-entry";
            studio.textContent = "ورود به استودیو  ↗";
            studio.setAttribute("aria-label", "بازکردن اتاق طراحی شخصی");
            hotspot.append(studio);
          },
        });

        const createdViewer = window.pannellum.viewer(host, {
          type: "equirectangular",
          panorama: panoramaUrl,
          haov: 360,
          vaov: 180,
          autoLoad: true,
          showControls: false,
          compass: false,
          mouseZoom: true,
          keyboardZoom: true,
          draggable: true,
          friction: 0.22,
          yaw: initialView.yaw,
          pitch: initialView.pitch,
          hfov: initialView.hfov,
          minYaw: -180,
          maxYaw: 180,
          minPitch: -78,
          maxPitch: 78,
          minHfov: minimumHfov(),
          maxHfov: isCompactViewport() ? 150 : 166,
          hotSpots: hotspots,
          strings: {
            loadingLabel: "گالری در حال آماده‌شدن است…",
            noPanoramaError: "تصویر گالری در دسترس نیست",
            genericWebGLError: "نمای زنده در این دستگاه باز نشد؛ از فهرست مجموعه‌ها استفاده کن.",
            textureSizeError: "اندازهٔ تصویر برای این دستگاه مناسب نیست؛ از فهرست مجموعه‌ها استفاده کن.",
          },
        });

        if (!createdViewer) throw new Error("Pannellum did not create a viewer");
        viewer = createdViewer;
        viewerRef.current = createdViewer;
        createdViewer.on("load", () => {
          if (!cancelled) {
            setLoaded(true);
            setFailed(false);
            const pendingPose = pendingFocusRef.current;
            if (pendingPose) {
              pendingFocusRef.current = null;
              savePose(createdViewer);
              createdViewer.lookAt(pendingPose.pitch, pendingPose.yaw, fittedHfov(pendingPose.hfov), 720);
            }
          }
        });
        createdViewer.on("error", () => {
          if (!cancelled) setFailed(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      viewer?.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, []);

  return (
    <div className={styles.stage}>
      <Image className={styles.preview} src={panoramaUrl} alt="" aria-hidden="true" fill sizes="100vw" priority />
      <div ref={hostRef} className={`${styles.viewer} ${failed ? styles.viewerFailed : ""}`} dir="ltr" aria-label="نمای کروی گالری اُرنوا" />
      {!loaded && !failed && <p className={styles.loading}>گالری در حال آماده‌شدن است…</p>}
      {failed && <p className={styles.fallback}>نمای ثابت گالری نمایش داده می‌شود؛ مجله و دسته‌ها همچنان در دسترس‌اند.</p>}
    </div>
  );
});
