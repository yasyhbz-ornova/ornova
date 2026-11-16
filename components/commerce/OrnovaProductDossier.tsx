"use client";

import { ProductGallery } from "@/components/commerce/ProductGallery";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { OrnovaBrandMark } from "@/components/ornova/OrnovaBrandMark";
import type { Product } from "@/lib/constants/products";
import styles from "./ProductDossier.module.css";

const number = new Intl.NumberFormat("fa-IR");
const unknownStoneValues = new Set([
  "پس از بررسی درخواست مشخص می‌شود",
  "جزئیات پس از بررسی درخواست اعلام می‌شود",
  "بدون سنگ",
  "ندارد",
]);

function isConfirmedValue(value: string | undefined) {
  if (!value) return false;
  return !/(?:پس از|نیازمند تأیید|نیاز به تأیید|مشخص نمی‌شود|نامشخص|در انتظار تأیید)/u.test(value);
}

export function OrnovaProductDossier({
  product,
  onPrevious,
  onNext,
  productPosition,
  totalProducts,
  onAddToBasket,
}: {
  product: Product;
  onPrevious(): void;
  onNext(): void;
  productPosition: number;
  totalProducts: number;
  onAddToBasket?: () => void;
}) {
  const stone = product.details.find((detail) => detail.label === "سنگ")?.value;
  const knownStone = stone && !unknownStoneValues.has(stone) && isConfirmedValue(stone) ? stone : undefined;
  const material = product.details.find((detail) => detail.label === "جنس")?.value;
  const dossierFields: [string, string | undefined][] = [
    ["Design Name", product.name],
    ["Material", isConfirmedValue(material) ? material : undefined],
    ["Stone", stone === "بدون سنگ" || stone === "ندارد" ? "None" : knownStone],
  ];
  const additionalDetails = product.details.filter((detail) =>
    detail.label !== "جنس" &&
    detail.label !== "سنگ" &&
    detail.label !== "وضعیت سفارش" &&
    detail.label !== "سایز" &&
    isConfirmedValue(detail.value) &&
    !(detail.label === "رنگ سنگ" && (stone === "بدون سنگ" || stone === "ندارد")),
  );

  return (
    <article className={styles.dossier} data-dossier-content>
      <div className={styles.visual}>
        <ProductGallery key={product.slug} images={product.turntableVideo ? product.gallery : []} name={product.name} allowOriginalImageOpen={false} standImage={product.standImage} turntableVideo={product.turntableVideo} displayKind={product.categoryId} galleryScene />
      </div>
      <div className={styles.copy}>
        <div className={styles.card} dir="ltr" aria-label={`شناسنامهٔ طرح ${product.name}`}>
          <OrnovaBrandMark className={styles.brand} />
          <h2>Jewelry Dossier</h2>
          <dl>
            {dossierFields.map(([label, value]) => (
              <div key={label}><dt>{label}:</dt><dd dir="auto" aria-label={value ? undefined : "ثبت نشده"}>{label === "Design Name" ? <h1 id="product-dossier-title" tabIndex={-1} className={styles.title}>{value}</h1> : <span>{value}</span>}</dd></div>
            ))}
          </dl>
          <p className={styles.description} dir="rtl">{product.description}</p>
          {additionalDetails.length > 0 && <dl className={styles.specifications} dir="rtl" aria-label="جزئیات ثبت‌شدهٔ اثر">
            {additionalDetails.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
          </dl>}
          <p className={styles.motto}>A small object for a slower life.</p>
          {totalProducts > 1 && (
            <div className={styles.navigation} dir="rtl">
              <button type="button" onClick={onPrevious}>اثر پیشین <span aria-hidden="true">←</span></button>
              <span>{number.format(Math.max(1, productPosition))} / {number.format(totalProducts)}</span>
              <button type="button" onClick={onNext}>اثر بعدی <span aria-hidden="true">→</span></button>
            </div>
          )}
          <div className={styles.actions} dir="rtl">
            <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="افزودن به صندوق درخواست خرید" onAdded={onAddToBasket} />
          </div>
        </div>
      </div>
    </article>
  );
}
