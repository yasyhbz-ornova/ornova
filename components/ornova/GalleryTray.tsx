import Image from "next/image";
import { displayDossierField } from "@/lib/catalog/dossier-fields";
import { OrnovaSymbol } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const staffTray = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v2.webp";
const desktopTray = "/images/ornova/gallery/review/ornova-velvet-tray-desktop-v1.webp";
const portraitTrayAvifSmall = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-460.avif";
const portraitTrayAvifLarge = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-768.avif";
const portraitTrayWebpSmall = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-460.webp";
const portraitTrayWebpLarge = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-768.webp";
const portraitMedia = "(max-width: 700px) and (orientation: portrait)";

export function GalleryTrayBackdrop({ portrait = false }: { portrait?: boolean }) {
  return <picture className={styles.seatedPicture}>
    {!portrait && <>
      <source media={portraitMedia} type="image/avif" srcSet={`${portraitTrayAvifSmall} 460w, ${portraitTrayAvifLarge} 768w`} sizes="100vw" />
      <source media={portraitMedia} srcSet={`${portraitTrayWebpSmall} 460w, ${portraitTrayWebpLarge} 768w`} sizes="100vw" />
    </>}
    <Image className={styles.architecture} src={portrait ? staffTray : desktopTray} alt="" fill sizes={portrait ? "(max-width: 500px) 90vw, 496px" : "100vw"} unoptimized loading="eager" />
  </picture>;
}

const archiveNumber = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

export function GalleryTrayDossier({ name, details = [], archive, heading: Heading = "h1", live }: {
  name: string;
  details?: readonly { label: string; value: string }[];
  archive?: { number: string; category?: string; month?: string };
  heading?: "h1" | "h2";
  live?: "off" | "polite";
}) {
  const material = displayDossierField(details, "material");
  const stone = displayDossierField(details, "stone");
  const stoneColor = displayDossierField(details, "stoneColor");
  const weight = displayDossierField(details, "weight");
  const dimensions = displayDossierField(details, "dimensions");

  return <article className={styles.dossier} data-archive-card={Boolean(archive) || undefined} tabIndex={0} aria-live={live} aria-label="شناسنامهٔ اثر روی میز">
    <header className={styles.dossierHeader}>
      <OrnovaSymbol className={styles.dossierSymbol} />
      <span>شناسنامهٔ اثر</span>
      {archive && <span className={styles.dossierArchiveNumber}>آرشیو {archiveNumber.format(Number(archive.number))}</span>}
    </header>
    <Heading className={styles.workTitle}>{name}</Heading>
    <dl className={styles.workDetails}>
      {archive
        ? <>
            {archive.category && <div className={styles.dossierWideDetail}><dt>دسته</dt><dd>{archive.category}</dd></div>}
            {archive.month && <div className={styles.dossierWideDetail}><dt>ماه تولد</dt><dd>{archive.month}</dd></div>}
          </>
        : <>
            <div><dt>جنس</dt><dd>{material || "نامشخص"}</dd></div>
            <div><dt>سنگ</dt><dd>{stone || "نامشخص"}</dd></div>
            <div><dt>وزن</dt><dd>{weight || "نامشخص"}</dd></div>
            {stoneColor && <div><dt>رنگ سنگ</dt><dd>{stoneColor}</dd></div>}
            {dimensions && <div className={styles.dossierWideDetail}><dt>ابعاد</dt><dd>{dimensions}</dd></div>}
          </>}
    </dl>
  </article>;
}
