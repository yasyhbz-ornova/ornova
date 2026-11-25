import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./GalleryRoomGuide.module.css";

const stops = [
  { id: "showcase", name: "ویترین", instruction: "برای دیدن محصولات، روی جعبهٔ دستهٔ موردنظرت بزن." },
  { id: "magazine", name: "مجلهٔ مجموعه‌ها", instruction: "مجله را باز کن و فهرست آثار و مجموعه‌ها را ورق بزن." },
  { id: "cashier", name: "صندوق", instruction: "انتخاب‌ها و رسیدهای سفارش را در صندوق ببین." },
  { id: "phone", name: "تلفن گالری", instruction: "تلفن را بردار تا دفترچهٔ تماس و راه‌های ارتباط با اُرنوا باز شود." },
  { id: "studio", name: "کارگاه", instruction: "برای ورود به دفتر شخصی یا ثبت ایدهٔ سفارش، از این در وارد کارگاه شو." },
] as const;

export type GalleryGuideStop = (typeof stops)[number]["id"];
const storageKey = "ornova.gallery.guide.v1";
const changeEvent = "ornova:gallery-guide-change";
const compactGuide = "(max-width: 700px), (max-height: 430px) and (pointer: coarse)";
let lastStep = 0;
let guideRequested = false;

function subscribe(listener: () => void) {
  const compact = window.matchMedia(compactGuide);
  compact.addEventListener("change", listener);
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    compact.removeEventListener("change", listener);
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function getStep() {
  if (!guideRequested && window.matchMedia(compactGuide).matches) return stops.length;
  let saved: string | null;
  try {
    saved = window.localStorage.getItem(storageKey);
  } catch {
    return lastStep;
  }
  if (saved === null) return lastStep;
  const step = Number(saved);
  return Number.isInteger(step) && step >= 0 && step <= stops.length ? step : 0;
}

function setStep(step: number) {
  lastStep = step;
  try {
    window.localStorage.setItem(storageKey, String(step));
  } catch {
    // Keep the guide usable for the current visit when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function useGalleryRoomGuide() {
  const step = useSyncExternalStore(subscribe, getStep, () => -1);
  return {
    step,
    stop: stops[step]?.id,
    follow(stop: GalleryGuideStop) {
      const current = getStep();
      if (stops[current]?.id === stop) setStep(current + 1);
    },
    dismiss() {
      if (!stops[getStep()]) return false;
      setStep(stops.length);
      return true;
    },
  };
}

export function GalleryRoomGuide({ step }: { step: number }) {
  const primaryControl = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    primaryControl.current?.focus({ preventScroll: true });
  }, [step]);

  function switchGuide(next: number) {
    restoreFocus.current = true;
    setStep(next);
  }

  if (step < 0) return null;
  const stop = stops[step];
  if (!stop) {
    return <button ref={primaryControl} type="button" className={styles.replay} aria-label="راهنمای بازدید" onClick={() => {
      guideRequested = true;
      switchGuide(0);
    }}><span>راهنمای بازدید</span></button>;
  }
  const isLast = step === stops.length - 1;

  return (
    <aside className={styles.note} data-guide-stop={stop.id} aria-label="راهنمای بازدید">
      <div aria-live="polite" aria-atomic="true">
        <h2>{stop.name}</h2>
        <p>{stop.instruction}</p>
      </div>
      <div className={styles.controls}>
        <button ref={primaryControl} type="button" onClick={() => isLast ? switchGuide(stops.length) : setStep(step + 1)}>{isLast ? "پایان راهنما" : "بخش بعدی"}</button>
        <button type="button" aria-disabled={step === 0 || undefined} onClick={() => { if (step > 0) setStep(step - 1); }}>قبلی</button>
        {!isLast && <button type="button" onClick={() => switchGuide(stops.length)}>رد کردن راهنما</button>}
      </div>
    </aside>
  );
}
