"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./GalleryEnvelope.module.css";

const REVEAL_DELAY_MS = 1800;

export function GalleryEnvelope({ children }: { children: ReactNode }) {
  const controlsId = useId();
  const revealTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      revealTimer.current = null;
      setOpen(true);
    }, reducedMotion ? 0 : REVEAL_DELAY_MS);
    revealTimer.current = timer;
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
    setOpen((current) => !current);
  }

  return (
    <div className={styles.envelope} dir="rtl">
      <button
        type="button"
        className={styles.pocket}
        aria-controls={controlsId}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={styles.photo} aria-hidden="true" />
        <span className={styles.action}>{open ? "بستن پاکت صندوق" : "بازکردن پاکت صندوق"}</span>
      </button>
      <div id={controlsId} className={styles.reveal} inert={!open}>
        <div className={styles.track}>
          <div className={styles.paper}>{children}</div>
        </div>
      </div>
    </div>
  );
}
