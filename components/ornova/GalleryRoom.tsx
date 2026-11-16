"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { galleryRoomStands, type GalleryRoomStand } from "@/lib/constants/gallery-room";
import { OrnovaBrandMark } from "./OrnovaBrandMark";
import styles from "./GalleryRoom.module.css";
import { GalleryStandSurface } from "./GalleryStandSurface";
import type { GalleryRoomSample } from "@/lib/constants/gallery-room-samples";

type Props = {
  activeCategory?: string;
  panelOpen: boolean;
  standIndices: Record<string, number>;
  samplesByCategory: Record<string, GalleryRoomSample[]>;
  onSelectStand: (stand: GalleryRoomStand) => void;
  onStandIntent: (stand: GalleryRoomStand) => void;
  onCancelIntent: () => void;
  onSelectObject: (object: "magazine" | "contact" | "basket" | "studio") => void;
};

export function GalleryRoom({ activeCategory, panelOpen, standIndices, samplesByCategory, onSelectStand, onStandIntent, onCancelIntent, onSelectObject }: Props) {
  const [view, setView] = useState<"entry" | "left" | "right">("entry");
  const stand = galleryRoomStands.find((item) => item.categoryId === activeCategory);
  const focusX = stand?.x ?? (view === "left" ? 25 : view === "right" ? 75 : 50);
  const focusY = stand?.y ?? 50;
  const cameraStyle = { "--focus-x": `${focusX}%`, "--focus-y": `${focusY}%`, "--focus-screen-x": "69%" } as CSSProperties;

  return <section className={styles.room} data-view={view} data-focused-category={activeCategory} data-focused={stand ? "true" : undefined} aria-label="گالری اُرنوا؛ شش ویترین و کارگاه طراحی" style={cameraStyle}>
    <div className={styles.canvas} inert={panelOpen}>
      <Image className={styles.architecture} src="/images/ornova/gallery/review/entry-six-empty-niches-v1.webp" alt="سالن اُرنوا با طاقچه‌های نامتقارن، نور گرم، کارگاه طراحی و فرش گرد ایرانی" width={1672} height={941} sizes="(max-width: 800px) 220vw, 180vw" priority />
      <div className={styles.wallMark}><OrnovaBrandMark className={styles.brand} /></div>
      {galleryRoomStands.map((item) => {
        const [bx, by, bw, bh] = item.bounds;
        const [iw, ih] = item.image;
        const src = `/images/ornova/gallery/stands/${item.asset}`;
        const objectStyle = {
          left: `${item.x}%`, bottom: `${100 - item.shelf}%`, width: `${item.width}%`,
          aspectRatio: `${bw} / ${bh}`,
          "--asset-width": `${iw / bw * 100}%`, "--asset-height": `${ih / bh * 100}%`,
          "--asset-left": `${-bx / bw * 100}%`, "--asset-top": `${-by / bh * 100}%`,
        } as CSSProperties;
        return <div className={styles.display} key={item.id} data-category-id={item.categoryId} style={objectStyle}>
          <button className={styles.stand} data-stand-id={item.id} type="button" aria-label={`بازکردن ویترین ${item.label}`} onPointerEnter={(event) => { if (event.pointerType === "mouse") onStandIntent(item); }} onPointerLeave={onCancelIntent} onPointerCancel={onCancelIntent} onClick={() => { onCancelIntent(); onSelectStand(item); }}>
            <Image className={styles.standAsset} src={src} alt="" width={iw} height={ih} sizes="(max-width: 800px) 40vw, 16vw" />
            <GalleryStandSurface stand={item} sample={samplesByCategory[item.categoryId]?.[(standIndices[item.categoryId] ?? 0) % (samplesByCategory[item.categoryId]?.length || 1)]} />
          </button>
          <button className={styles.label} type="button" onClick={() => { onCancelIntent(); onSelectStand(item); }} aria-label={`دستهٔ ${item.label}`}>{item.label}</button>
        </div>;
      })}
      <button className={`${styles.object} ${styles.magazine}`} type="button" onClick={() => onSelectObject("magazine")} aria-label="مجله؛ دسته‌ها و کالکشن‌ها" />
      <button className={`${styles.object} ${styles.telephone}`} type="button" onClick={() => onSelectObject("contact")} aria-label="تلفن؛ پشتیبانی و ارتباط با اُرنوا" />
      <button className={`${styles.object} ${styles.cashier}`} type="button" onClick={() => onSelectObject("basket")} aria-label="صندوق گالری؛ انتخاب‌ها و سفارش" />
      <button className={styles.workshop} type="button" onClick={() => onSelectObject("studio")} aria-label="اتاق طراحی شخصی"><span>طراحی شخصی</span></button>
    </div>
    {!panelOpen && <nav className={styles.views} aria-label="نمای سالن">
      <button type="button" aria-pressed={view === "right"} onClick={() => { onCancelIntent(); setView("right"); }}>ویترین‌های راست <span aria-hidden="true">↗</span></button>
      {view !== "entry" && <button type="button" onClick={() => { onCancelIntent(); setView("entry"); }}>نمای ورودی</button>}
      <button type="button" aria-pressed={view === "left"} onClick={() => { onCancelIntent(); setView("left"); }}><span aria-hidden="true">↖</span> ویترین‌های چپ</button>
    </nav>}
  </section>;
}
