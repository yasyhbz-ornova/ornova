import Image from "next/image";
import { displayDossierField } from "@/lib/catalog/dossier-fields";
import { OrnovaSymbol } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const portraitTray = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v2.webp";
const desktopTray = "/images/ornova/gallery/review/ornova-velvet-tray-desktop-v1.webp";

export function GalleryTrayBackdrop({ portrait = false }: { portrait?: boolean }) {
  return <picture className={styles.seatedPicture}>
    {!portrait && <source media="(max-width: 700px) and (orientation: portrait)" srcSet={portraitTray} />}
    <Image className={styles.architecture} src={portrait ? portraitTray : desktopTray} alt="" fill sizes={portrait ? "(max-width: 500px) 90vw, 496px" : "100vw"} unoptimized loading="eager" />
  </picture>;
}

export function GalleryTrayDossier({ name, details = [], heading: Heading = "h1", live }: {
  name: string;
  details?: readonly { label: string; value: string }[];
  heading?: "h1" | "h2";
  live?: "off" | "polite";
}) {
  const material = displayDossierField(details, "material");
  const stone = displayDossierField(details, "stone");
  const stoneColor = displayDossierField(details, "stoneColor");
  const weight = displayDossierField(details, "weight");
  const dimensions = displayDossierField(details, "dimensions");

  return <article className={styles.dossier} tabIndex={0} aria-live={live} aria-label="شناسنامهٔ اثر روی میز">
    <header className={styles.dossierHeader}>
      <OrnovaSymbol className={styles.dossierSymbol} />
      <span>شناسنامهٔ اثر</span>
    </header>
    <Heading className={styles.workTitle}>{name}</Heading>
    <dl className={styles.workDetails}>
      <div><dt>جنس</dt><dd>{material || "نامشخص"}</dd></div>
      <div><dt>سنگ</dt><dd>{stone || "نامشخص"}</dd></div>
      <div><dt>وزن</dt><dd>{weight || "نامشخص"}</dd></div>
      {stoneColor && <div><dt>رنگ سنگ</dt><dd>{stoneColor}</dd></div>}
      {dimensions && <div className={styles.dossierWideDetail}><dt>ابعاد</dt><dd>{dimensions}</dd></div>}
    </dl>
  </article>;
}
