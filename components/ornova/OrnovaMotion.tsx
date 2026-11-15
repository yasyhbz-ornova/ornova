"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import styles from "./OrnovaHome.module.css";

const slides = [
  { id: "beginning", label: "آغاز" },
  { id: "pieces", label: "قطعات" },
  { id: "forms", label: "فرم‌ها" },
  { id: "your-idea", label: "ایدهٔ تو" },
];
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeReady = () => () => {};
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getReduced = () => window.matchMedia(motionQuery).matches;
const serverReduced = () => true;
const ready = () => true;
const notReady = () => false;
const number = new Intl.NumberFormat("fa-IR");

export function OrnovaMotion({ children }: { children: ReactNode }) {
  const enhanced = useSyncExternalStore(subscribeReady, ready, notReady);
  const reduced = useSyncExternalStore(subscribeMotion, getReduced, serverReduced);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const enabled = enhanced && !reduced && !paused;

  useEffect(() => {
    const root = rootRef.current;
    const deck = deckRef.current;
    if (!root || !deck || !enhanced) return;
    const sections = Array.from(deck.querySelectorAll<HTMLElement>("[data-slide]"));
    let current = -1;
    let frame = 0;
    const sync = () => {
      frame = 0;
      const bounds = deck.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const index = sections.findIndex((section) => {
        const box = section.getBoundingClientRect();
        return box.top <= center && box.bottom > center;
      });
      if (index < 0 || current === index) return;
      root.dataset.direction = index < current ? "backward" : "forward";
      sections.forEach((section, i) => { section.dataset.current = String(i === index); });
      current = index;
      setActive(index);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const size = () => {
      const header = document.querySelector(".site-header");
      root.style.setProperty("--landing-header", `${header?.getBoundingClientRect().height ?? 78}px`);
      schedule();
    };
    const headerObserver = new ResizeObserver(size);
    const header = document.querySelector(".site-header");
    if (header) headerObserver.observe(header);
    size();
    const initial = sections.find((section) => `#${section.id}` === window.location.hash);
    if (initial) deck.scrollTop = initial.offsetTop;
    deck.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", size);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      headerObserver.disconnect();
      deck.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", size);
      window.removeEventListener("hashchange", schedule);
    };
  }, [enhanced]);

  function go(index: number, focusHeading = false) {
    const deck = deckRef.current;
    const section = deck?.querySelector<HTMLElement>(`#${slides[index]?.id}`);
    if (!deck || !section) return;
    deck.scrollTo({ top: section.offsetTop, behavior: enabled ? "smooth" : "instant" });
    if (focusHeading) section.querySelector<HTMLElement>("h1, h2")?.focus({ preventScroll: true });
  }

  return <div ref={rootRef} className={styles.world} data-enhanced={enhanced} data-motion={enabled ? "on" : "off"}>
    <div ref={deckRef} className={styles.deck} role="region" aria-label="صحنه‌های جهان نقرهٔ یاس" tabIndex={enhanced ? 0 : undefined}
      onClick={(event) => {
        if (!enhanced || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
        const index = slides.findIndex((slide) => anchor?.getAttribute("href") === `#${slide.id}`);
        if (index < 0) return;
        event.preventDefault();
        go(index, true);
      }}
      onKeyDown={(event) => {
        // Links retain their native keys; only the focused presentation region owns paging.
        if (event.target !== event.currentTarget || !enhanced) return;
        const section = deckRef.current?.querySelector<HTMLElement>("[data-current='true']");
        const deck = deckRef.current;
        const forward = event.key === "PageDown" || event.key === "ArrowDown";
        const backward = event.key === "PageUp" || event.key === "ArrowUp";
        if (deck && section && ((forward && deck.scrollTop + deck.clientHeight < section.offsetTop + section.offsetHeight - 2)
          || (backward && deck.scrollTop > section.offsetTop + 2))) return;
        const index = event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1
          : event.key === "PageDown" || event.key === "ArrowDown" ? Math.min(active + 1, slides.length - 1)
          : event.key === "PageUp" || event.key === "ArrowUp" ? Math.max(active - 1, 0) : -1;
        if (index < 0) return;
        event.preventDefault();
        go(index);
      }}>
      {children}
    </div>
    <div className={styles.slideBar}>
      <nav className={styles.slideNav} aria-label="بخش‌های صفحهٔ اصلی">{slides.map((slide, index) =>
        <a key={slide.id} href={`#${slide.id}`} aria-label={`رفتن به بخش ${slide.label}`} aria-current={active === index ? "step" : undefined}
          onClick={(event) => {
            if (!enhanced || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); go(index, true);
          }}><span className={styles.navNumber} aria-hidden="true">{number.format(index + 1)}</span><span className={styles.navName}>{slide.label}</span></a>
      )}</nav>
      {enhanced && <>
        <div className={styles.slideControls}>
          <button type="button" aria-label="بخش قبلی" disabled={active === 0} onClick={() => go(active - 1)}>↑</button>
          <button type="button" aria-label="بخش بعدی" disabled={active === slides.length - 1} onClick={() => go(active + 1)}>↓</button>
        </div>
        <button type="button" className={styles.motionControl} disabled={reduced} aria-pressed={paused || reduced} aria-label={reduced ? "حرکت مطابق تنظیمات دستگاه خاموش است" : paused ? "فعال‌کردن حرکت" : "توقف حرکت"} onClick={() => setPaused((value) => !value)}>
          <span aria-hidden="true">{enabled ? "Ⅱ" : "▷"}</span><span className={styles.motionLabel}>{reduced ? "حرکت خاموش" : paused ? "فعال‌کردن حرکت" : "توقف حرکت"}</span>
        </button>
        <p className={styles.screenReader} role="status" aria-atomic="true">بخش {number.format(active + 1)} از {number.format(slides.length)}: {slides[active].label}</p>
      </>}
    </div>
  </div>;
}
