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
  const dossierFields: [string, string][] = [["Design Name", product.name]];
  if (isConfirmedValue(material)) dossierFields.push(["Material", material!]);
  if (stone === "بدون سنگ" || stone === "ندارد") dossierFields.push(["Stone", "None"]);
  else if (knownStone) dossierFields.push(["Stone", knownStone]);
  const additionalDetails = product.details.filter((detail) =>
    detail.label !== "جنس" &&
    detail.label !== "سنگ" &&
    isConfirmedValue(detail.value) &&
    !(detail.label === "رنگ سنگ" && (stone === "بدون سنگ" || stone === "ندارد")),
  );

  return (
    <article className={styles.dossier} data-dossier-content>
      <div className={styles.visual}>
        <ProductGallery key={product.slug} images={product.turntableVideo ? product.gallery : []} name={product.name} allowOriginalImageOpen={false} standImage={product.standImage} turntableVideo={product.turntableVideo} displayKind={product.categoryId} galleryScene />
        <aside className={styles.mediaNote} aria-label="وضعیت نمای محصول">
          {product.turntableVideo
            ? <p><span aria-hidden="true">۳۶۰°</span> چرخش پیوستهٔ همین مدل در دسترس است.</p>
            : <p><span aria-hidden="true">۳۶۰°</span> نمای چرخشِ این اثر هنوز آماده نیست؛ برای نمایش دقیق، مدل یا رندرهای چندزاویه‌ایِ همین محصول لازم است.</p>}
          {product.gallery[0]?.notice && <p>{product.gallery[0].label}: {product.gallery[0].notice}</p>}
        </aside>
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>ویترین <span aria-hidden="true">·</span> {product.category}</p>
        <h1 id="product-dossier-title" tabIndex={-1} className={styles.title}>{product.name}</h1>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.card} dir="ltr">
          <OrnovaBrandMark className={styles.brand} />
          <h2><small>Jewelry Dossier</small></h2>
          <dl>
            {dossierFields.map(([label, value]) => (
              <div key={label}><dt>{label}:</dt><dd>{value}<i /></dd></div>
            ))}
          </dl>
          <p className={styles.motto}>A small object for a slower life.</p>
        </div>
        {additionalDetails.length > 0 && <section className={styles.specifications} aria-labelledby="product-specifications-title">
          <div className={styles.specificationHeading}>
            <span aria-hidden="true">✳</span>
            <h2 id="product-specifications-title">جزئیات ثبت‌شدهٔ اثر</h2>
            <p>بر پایهٔ اطلاعات موجود برای همین محصول</p>
          </div>
          <dl>
            {additionalDetails.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
          </dl>
        </section>}
        {product.packagingGallery?.length
          ? <p className={styles.packageNote}>عکس‌های بسته‌بندیِ همین اثر پس از افزودن به صندوق، به‌صورت اسلایدی نمایش داده می‌شوند.</p>
          : <p className={styles.packageNote}>عکسِ همین اثر در بسته‌بندی اُرنوا هنوز آماده نشده است؛ تصویر عمومی بسته‌بندی را به‌جای آن نشان نمی‌دهیم.</p>}
        {totalProducts > 1 && (
          <div className={styles.navigation}>
            <button type="button" onClick={onPrevious}>اثر پیشین <span aria-hidden="true">←</span></button>
            <span>{number.format(Math.max(1, productPosition))} / {number.format(totalProducts)}</span>
            <button type="button" onClick={onNext}>اثر بعدی <span aria-hidden="true">→</span></button>
          </div>
        )}
        <div className={styles.actions}>
          <RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="افزودن به صندوق گالری" onAdded={onAddToBasket} />
        </div>
      </div>
    </article>
  );
}
