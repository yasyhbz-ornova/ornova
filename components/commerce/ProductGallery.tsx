"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./ProductDetail.module.css";

type GalleryImage = { src: string; alt: string; label?: string; notice?: string };
const number = new Intl.NumberFormat("fa-IR");
const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}
function getMotionPreferenceSnapshot() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

export function ProductGallery({ images, name, allowOriginalImageOpen = true, standImage, turntableVideo, displayKind, galleryScene = false }: { images: GalleryImage[]; name: string; allowOriginalImageOpen?: boolean; standImage?: string; turntableVideo?: string; displayKind?: string; galleryScene?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTurntable, setShowTurntable] = useState(Boolean(turntableVideo));
  const [turntableUnavailable, setTurntableUnavailable] = useState(false);
  const [manualRotation, setManualRotation] = useState<boolean | null>(null);
  const prefersReducedMotion = useSyncExternalStore(subscribeToMotionPreference, getMotionPreferenceSnapshot, () => true);
  const isRotating = manualRotation ?? (Boolean(turntableVideo) && !prefersReducedMotion);
  const turntableRef = useRef<HTMLVideoElement>(null);
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  const activeImage = images[activeIndex] ?? images[0];
  const displayTurntable = Boolean(turntableVideo && showTurntable && !turntableUnavailable);
  const showImage = useCallback((index: number) => {
    if (images.length) setActiveIndex((index + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const video = turntableRef.current;
    if (!video || !showTurntable) return;
    if (isRotating) void video.play().catch(() => setManualRotation(false));
    else video.pause();
  }, [isRotating, showTurntable]);

  function handleGalleryKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || images.length < 2) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showImage(activeIndex + 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showImage(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      showImage(0);
    } else if (event.key === "End") {
      event.preventDefault();
      showImage(images.length - 1);
    }
  }

  if (!activeImage && !turntableVideo && !standImage) return <p className={styles.noImage}>تصویر مستقل و تأییدشدهٔ این اثر برای نمایش روی استند هنوز آماده نیست.</p>;

  return (
    <div className={styles.gallery} data-gallery-scene={galleryScene ? "true" : undefined} role="group" tabIndex={images.length > 1 ? 0 : undefined} aria-label={`گالری تصاویر ${name}`} onKeyDown={handleGalleryKeyDown}>
      <div className={styles.frame} data-gallery-frame>
        {displayTurntable ? <><video ref={turntableRef} key={turntableVideo} src={turntableVideo} poster={images[0]?.src ?? standImage} loop muted playsInline preload="metadata" aria-label={`نمای چرخش ۳۶۰ درجهٔ ${name}`} className={styles.turntable} onError={() => { setTurntableUnavailable(true); setShowTurntable(false); setManualRotation(false); }}>مرورگر شما پخش نمای چرخشی را پشتیبانی نمی‌کند.</video><button type="button" className={styles.rotationToggle} onClick={() => setManualRotation(!isRotating)} aria-pressed={isRotating}>{isRotating ? "توقف چرخش" : "چرخاندن اثر"}</button></> : standImage ? <div className={styles.standStage} data-display-kind={displayKind} role="img" aria-label={`${name} روی پایهٔ نمایش اُرنوا`}><span className={styles.standPedestal} aria-hidden="true" /><Image src={standImage} alt="" fill priority sizes="(max-width: 760px) 80vw, 55vw" className={styles.standPiece} /></div> : activeImage ? <Image key={activeImage.src} src={activeImage.src} alt={activeImage.alt || name} fill loading="eager" sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 650px" className={styles.photo} /> : null}
        {!displayTurntable && !standImage && activeImage?.label && <div className="absolute inset-x-3 bottom-3 z-10 rounded-sm border border-white/70 bg-white/95 px-3 py-2 text-right text-xs leading-6 text-graphite shadow-sm">
          <strong className="block font-medium">{activeImage.label}</strong>
          {activeImage.notice && <span>{activeImage.notice}</span>}
        </div>}
        {!displayTurntable && !standImage && images.length > 1 && (
          <>
            <button type="button" disabled={!hydrated} className={`${styles.control} ${styles.previous}`} onClick={() => showImage(activeIndex - 1)} aria-label="تصویر قبلی">→</button>
            <button type="button" disabled={!hydrated} className={`${styles.control} ${styles.next}`} onClick={() => showImage(activeIndex + 1)} aria-label="تصویر بعدی">←</button>
          </>
        )}
      </div>
      <div className={styles.caption}>
        {turntableVideo && <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب نمای محصول"><button type="button" aria-pressed={displayTurntable} disabled={turntableUnavailable} onClick={() => setShowTurntable(true)} className="min-h-11 border-b border-silver px-2 text-sapphire disabled:cursor-not-allowed disabled:opacity-60">{turntableUnavailable ? "چرخش ۳۶۰ درجه آماده نیست" : "چرخش ۳۶۰ درجه"}</button>{standImage ? <button type="button" aria-pressed={!displayTurntable} onClick={() => setShowTurntable(false)} className="min-h-11 border-b border-silver px-2">نمای روی استند</button> : activeImage && <button type="button" aria-pressed={!displayTurntable} onClick={() => setShowTurntable(false)} className="min-h-11 border-b border-silver px-2">تصاویر محصول</button>}</div>}
        {turntableUnavailable && <span className={styles.mediaStatus} role="status">فایل چرخش در دسترس نیست؛ نمای ثابت همین اثر نمایش داده شده است.</span>}
        {!displayTurntable && standImage && !galleryScene && <span>نمای اثر روی استند اُرنوا</span>}
        {!displayTurntable && !standImage && activeImage && <><span aria-live="polite" aria-atomic="true">تصویر {number.format(activeIndex + 1)} از {number.format(images.length)}</span>{allowOriginalImageOpen && <a href={activeImage.src} target="_blank" rel="noopener noreferrer">دیدن تصویر کامل <span aria-hidden="true">↗</span><span className="sr-only"> در زبانهٔ جدید</span></a>}</>}
      </div>
      {!displayTurntable && !standImage && images.length > 1 && (
        <div className={styles.rail} role="group" aria-label={`تصاویر ${name}`}>
          {images.map((image, index) => (
            allowOriginalImageOpen ? <a
              key={image.src}
              href={image.src}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                event.preventDefault(); showImage(index);
              }}
              aria-label={`نمایش تصویر ${number.format(index + 1)} از ${number.format(images.length)}: ${image.alt}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={styles.thumb}
            >
              <Image src={image.src} alt="" fill loading={activeIndex === index ? "eager" : "lazy"} sizes="96px" className="object-cover" />
            </a> : <button
              key={image.src}
              type="button"
              onClick={() => showImage(index)}
              aria-label={`نمایش تصویر ${number.format(index + 1)} از ${number.format(images.length)}: ${image.alt}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={styles.thumb}
            >
              <Image src={image.src} alt="" fill loading={activeIndex === index ? "eager" : "lazy"} sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
