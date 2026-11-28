import Image from "next/image";
import { displayDossierField, incompleteDossierFields, type DossierFieldId } from "@/lib/catalog/dossier-fields";
import { OrnovaSymbol } from "./OrnovaBrandMark";
import styles from "./GalleryShowcaseConcept.module.css";

const desktopTray = "/images/ornova/gallery/review/ornova-velvet-tray-desktop-v1.webp";
const portraitTrayAvifSmall = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-460.avif";
const portraitTrayAvifLarge = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-768.avif";
const portraitTrayWebpSmall = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-460.webp";
const portraitTrayWebpLarge = "/images/ornova/gallery/review/ornova-velvet-tray-mobile-v3-768.webp";
const portraitMedia = "(max-width: 700px) and (orientation: portrait)";

export function GalleryTrayBackdrop({ layout = "responsive" }: { layout?: "responsive" | "phone" | "desktop" }) {
  const media = layout === "responsive" ? portraitMedia : undefined;
  const sizes = layout === "phone" ? "390px" : "100vw";
  return <picture className={styles.seatedPicture}>
    {layout !== "desktop" && <>
      <source media={media} type="image/avif" srcSet={`${portraitTrayAvifSmall} 460w, ${portraitTrayAvifLarge} 768w`} sizes={sizes} />
      <source media={media} srcSet={`${portraitTrayWebpSmall} 460w, ${portraitTrayWebpLarge} 768w`} sizes={sizes} />
    </>}
    <Image className={styles.architecture} src={layout === "phone" ? portraitTrayWebpSmall : desktopTray} alt="" fill sizes={sizes} unoptimized loading="eager" />
  </picture>;
}

const archiveNumber = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
const trayFields: readonly { id: DossierFieldId; label: string }[] = [
  { id: "material", label: "جنس" },
  { id: "stone", label: "سنگ" },
  { id: "stoneColor", label: "رنگ سنگ" },
  { id: "weight", label: "وزن" },
  { id: "dimensions", label: "ابعاد" },
];

export function GalleryTrayDossier({ name, details = [], month, archive, heading: Heading = "h1", live }: {
  name: string;
  details?: readonly { label: string; value: string }[];
  month?: string;
  archive?: { number: string; category?: string; month?: string };
  heading?: "h1" | "h2";
  live?: "off" | "polite";
}) {
  const pending = archive ? [] : incompleteDossierFields(details);
  const recorded = archive ? [] : trayFields.flatMap(({ id, label }) => {
    const value = displayDossierField(details, id);
    return value && !pending.includes(id) ? [{ id, label, value }] : [];
  });

  return <article className={styles.dossier} data-archive-card={Boolean(archive) || undefined} data-compact-catalog={!archive && recorded.length + Number(Boolean(month)) <= 2 || undefined} tabIndex={0} aria-live={live} aria-label="شناسنامهٔ اثر روی میز">
    <header className={styles.dossierHeader}>
      <OrnovaSymbol className={styles.dossierSymbol} />
      <span>شناسنامهٔ اثر</span>
      {archive && <span className={styles.dossierArchiveNumber}>آرشیو {archiveNumber.format(Number(archive.number))}</span>}
    </header>
    <Heading className={styles.workTitle}>{name}</Heading>
    <dl className={styles.workDetails}>
      {month && <div className={styles.dossierWideDetail}><dt>ماه تولد</dt><dd>{month}</dd></div>}
      {archive
        ? <>
            {archive.category && <div className={styles.dossierWideDetail}><dt>دسته</dt><dd>{archive.category}</dd></div>}
            {archive.month && <div className={styles.dossierWideDetail}><dt>ماه تولد</dt><dd>{archive.month}</dd></div>}
          </>
        : recorded.map(({ id, label, value }) => <div key={id} className={id === "dimensions" ? styles.dossierWideDetail : undefined}>
            <dt>{label}</dt><dd>{value}</dd>
          </div>)}
    </dl>
    {pending.length > 0 && <p className={styles.dossierPending}>جزئیات تکمیلی پس از بررسی</p>}
  </article>;
}
