"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { GalleryTrayBackdrop, GalleryTrayDossier, galleryTrayWorkImage } from "@/components/ornova/GalleryTray";
import styles from "@/components/ornova/GalleryShowcaseConcept.module.css";
import { drawTrayImage, visibleTrayCrop, type TrayCrop } from "@/lib/catalog/rotate-tray-image";

const previews = {
  phone: { label: "گوشی", width: 390, height: 844 },
  desktop: { label: "دسکتاپ", width: 1440, height: 900 },
} as const;
const number = new Intl.NumberFormat("fa-IR", { useGrouping: false });

export function CatalogTrayPreview({ name, categoryId, details, path, imageReady, busy, onImageLoad, onImageError, onApplyImage }: {
  name: string;
  categoryId: string;
  details: readonly { label: string; value: string }[];
  path: string | null;
  imageReady: boolean;
  busy: boolean;
  onImageLoad(image: HTMLImageElement): void;
  onImageError(): void;
  onApplyImage(image: HTMLImageElement, turns: number, crop?: TrayCrop): Promise<void>;
}) {
  const [layout, setLayout] = useState<keyof typeof previews>("phone");
  const [scale, setScale] = useState(0);
  const [cardScrolls, setCardScrolls] = useState(false);
  const [adjustment, setAdjustment] = useState<{ path: string | null; turns: number; crop?: TrayCrop; note?: string }>({ path, turns: 0 });
  if (adjustment.path !== path) setAdjustment({ path, turns: 0 });
  const { turns, crop, note } = adjustment.path === path ? adjustment : { turns: 0, crop: undefined, note: undefined };
  const swapAxes = turns % 2 === 1;
  const frame = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const croppedPhoto = useRef<HTMLCanvasElement>(null);
  const { width, height } = previews[layout];

  function turn(step: number) {
    setAdjustment({ path, turns: (turns + step + 4) % 4, crop });
  }

  function centerWork() {
    if (!photo.current) return;
    try {
      const bounds = visibleTrayCrop(photo.current);
      setAdjustment({ path, turns, crop: bounds ?? undefined, note: bounds ? undefined : "اثر در مرکزِ کادر است و حاشیه‌ای برای برش ندارد." });
    } catch (error) {
      setAdjustment({ path, turns, note: error instanceof Error ? error.message : "تنظیم کادر تصویر ممکن نشد." });
    }
  }

  useLayoutEffect(() => {
    if (crop && croppedPhoto.current && photo.current) drawTrayImage(croppedPhoto.current, photo.current, 0, crop);
  }, [crop]);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => setScale(element.clientWidth / width);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  useLayoutEffect(() => {
    const card = frame.current?.querySelector("article");
    if (!card) return;
    let active = true;
    const measure = () => { if (active) setCardScrolls(card.scrollHeight > card.clientHeight + 1); };
    measure();
    void document.fonts.ready.then(measure);
    return () => { active = false; };
  }, [details, layout, name]);

  return <figure className="mt-4 min-w-0" aria-label="پیش‌نمایش سینی در گالری">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex gap-1" role="group" aria-label="قاب پیش‌نمایش سینی">
        {Object.entries(previews).map(([id, preview]) => <button
          key={id}
          type="button"
          aria-pressed={layout === id}
          className="min-h-11 rounded border border-silver px-3 text-sm text-sapphire aria-pressed:border-sapphire aria-pressed:bg-ivory-soft"
          onClick={() => setLayout(id as keyof typeof previews)}
        >{preview.label}</button>)}
      </div>
      <p className="text-xs text-graphite/70"><bdi dir="ltr">{number.format(width)} × {number.format(height)}</bdi> پیکسل</p>
    </div>
    {path && imageReady && <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="تنظیم عکس روی سینی">
      <button type="button" disabled={busy} className="min-h-11 border-b border-silver px-2 text-sm text-sapphire disabled:opacity-50" onClick={() => turn(-1)}>۹۰° چپ</button>
      <button type="button" disabled={busy} className="min-h-11 border-b border-silver px-2 text-sm text-sapphire disabled:opacity-50" onClick={() => turn(1)}>۹۰° راست</button>
      <button type="button" disabled={busy || !!crop} className="min-h-11 border-b border-silver px-2 text-sm text-sapphire disabled:opacity-50" onClick={centerWork}>وسط‌چین کردن اثر</button>
      {turns !== 0 && <button type="button" disabled={busy} className="min-h-11 border-b border-silver px-2 text-sm text-sapphire disabled:opacity-50" onClick={() => setAdjustment({ path, turns: 0, crop })}>بازنشانی زاویه</button>}
      {crop && <button type="button" disabled={busy} className="min-h-11 border-b border-silver px-2 text-sm text-sapphire disabled:opacity-50" onClick={() => setAdjustment({ path, turns })}>بازنشانی کادر</button>}
      {(turns !== 0 || crop) && <button type="button" disabled={busy} className="min-h-11 rounded border border-sapphire px-2 text-sm text-sapphire disabled:opacity-50" onClick={() => { if (photo.current) void onApplyImage(photo.current, turns, crop); }}>{busy ? "در حال آماده‌سازی…" : crop ? "استفاده از این کادر" : "استفاده از این چرخش"}</button>}
      {(turns !== 0 || crop || note) && <span className="basis-full text-xs text-graphite/70" role="status">
        {crop && "حاشیهٔ شفاف در پیش‌نمایش کم شد."}
        {crop && turns !== 0 && " · "}
        {turns !== 0 && `زاویهٔ موقت پیش‌نمایش ${number.format(turns * 90)} درجه`}
        {turns !== 0 && note && " · "}{note}
      </span>}
    </div>}
    <div ref={frame} className={styles.staffTrayPreview} style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}>
      <div className={`${styles.staffTrayStage} ${styles.trayViewport}`} data-tray-preview={layout} style={{ width, height, transform: `scale(${scale})` }}>
        <GalleryTrayBackdrop layout={layout} />
        <div className={styles.tableComposition}>
          <div className={styles.tableDisplay} data-tray-category={categoryId}>
            {path && <div className={styles.tableProduct}>
              <div className={styles.catalogCutout}>
                <div className={styles.staffTrayImage} style={{
                  width: swapAxes ? "100cqh" : "100%",
                  height: swapAxes ? "100cqw" : "100%",
                  rotate: `${turns * 90}deg`,
                }}>
                  <Image
                    ref={photo}
                    key={path}
                    src={galleryTrayWorkImage(path)}
                    alt="پیش‌نمایش تصویر اثر روی سینی"
                    fill
                    sizes={layout === "phone" ? "240px" : "384px"}
                    loading="eager"
                    unoptimized
                    style={{ visibility: imageReady && !crop ? "visible" : "hidden" }}
                    onLoad={(event) => onImageLoad(event.currentTarget)}
                    onError={onImageError}
                  />
                  {crop && <canvas ref={croppedPhoto} role="img" aria-label="پیش‌نمایش تصویر اثر روی سینی" />}
                </div>
              </div>
            </div>}
          </div>
          <div className={styles.tablePaper}><GalleryTrayDossier name={name} details={details} heading="h2" /></div>
        </div>
      </div>
    </div>
    {cardScrolls && <p className="mt-2 text-xs leading-6 text-sapphire" role="status">برای خواندن تمام شناسنامه در این قاب، داخل کارت پیمایش کنید.</p>}
  </figure>;
}
