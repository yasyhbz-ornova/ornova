"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { CatalogDirectory } from "@/components/commerce/CatalogDirectory";
import styles from "./HeaderMenu.module.css";

export function HeaderMenu({ mobile = false }: { mobile?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !details!.contains(event.target)) details!.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details!.open) {
        details!.open = false;
        details!.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details ref={ref} className={`${styles.menu} ${mobile ? styles.mobile : styles.desktop}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }}>
    <summary className={styles.trigger}>{mobile ? "فهرست" : "فروشگاه"}<span aria-hidden="true">⌄</span></summary>
    <div className={styles.panel} onClick={(event) => {
      if (event.target instanceof Element && event.target.closest("a") && ref.current) ref.current.open = false;
    }}>
      {mobile && <nav aria-label="ناوبری موبایل" className={styles.mobileLinks}>
        <Link href="/">خانه</Link><Link href="/custom-design">طراحی اختصاصی</Link><Link href="/ring-builder">طراحی انگشتر</Link><Link href="/guide">راهنما</Link><Link href="/?galleryPanel=basket">صندوق درخواست</Link>
      </nav>}
      <div className={styles.top}><Link href="/shop">مشاهدهٔ همهٔ قطعات <span aria-hidden="true">←</span></Link><span>فروشگاه</span></div>
      <CatalogDirectory label={mobile ? "دسته‌های فروشگاه در موبایل" : "دسته‌های فروشگاه در منو"} />
    </div>
  </details>;
}
