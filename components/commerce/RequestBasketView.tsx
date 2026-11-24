"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { clearRequestItems, removeRequestItem, updateRequestItemNote, updateRequestItemQuantity } from "./RequestBasketButton";
import { getRequestItemKey, MAX_REQUEST_ITEM_NOTE_LENGTH, parseRequestBasketReview, readRequestBasketSnapshot } from "@/lib/commerce/request-basket";
import { ProductPreferencesSummary } from "./ProductPreferencesSummary";
import { productPreferenceRows } from "@/lib/commerce/product-preferences";
import type { Product } from "@/lib/constants/products";
import styles from "./RequestFlow.module.css";

const number = new Intl.NumberFormat("fa-IR");
function subscribe(onChange: () => void) {
  window.addEventListener("ornova-basket-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener("ornova-basket-updated", onChange); window.removeEventListener("storage", onChange); };
}
function snapshot() { try { return readRequestBasketSnapshot(window.localStorage); } catch { return "null"; } }
const serverSnapshot = () => null;

function BasketProductVisual({ product, trayImage, actionId, onSelect }: { product: Product; trayImage?: string; actionId: string; onSelect?: () => void }) {
  const images = product.packagingGallery ?? [];
  const [slide, setSlide] = useState(0);
  const current = images[slide % Math.max(images.length, 1)];
  const move = (step: number) => setSlide((index) => (index + step + images.length) % images.length);
  const image = current ?? (trayImage ? { src: trayImage, alt: product.name } : null);
  if (!image) return null;

  return <div
    className={`${styles.itemImage} ${current ? styles.packageCarousel : styles.basketCutout}`}
    role="group"
    aria-label={current ? `تصاویر بسته‌بندی ${product.name}` : `تصویر اثر ${product.name}`}
    data-basket-cutout={current ? undefined : product.slug}
  >
    <Image key={image.src} src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 82px, 120px" unoptimized={!current} className={current ? "object-cover" : styles.cutoutImage} />
    {onSelect && <button id={actionId} type="button" className={styles.packageImageAction} onClick={onSelect} aria-label={`بازکردن شناسنامهٔ ${product.name} در گالری`} />}
    {current?.label && <span className={styles.packageLabel}>{current.label}</span>}
    {images.length > 1 && <>
      <button type="button" className={styles.packagePrevious} onClick={() => move(-1)} aria-label={`تصویر بسته‌بندی قبلی ${product.name}`}>‹</button>
      <span className={styles.packageCount} aria-live="polite" aria-atomic="true">{number.format(slide + 1)} / {number.format(images.length)}</span>
      <button type="button" className={styles.packageNext} onClick={() => move(1)} aria-label={`تصویر بسته‌بندی بعدی ${product.name}`}>›</button>
    </>}
  </div>;
}

export function RequestBasketView({ galleryMode = false, products = [], onBrowseCatalog, onContinueRequest, continuePending = false, continueError = "", onSelectProduct }: { galleryMode?: boolean; products?: Product[]; onBrowseCatalog?: () => void; onContinueRequest?: () => void; continuePending?: boolean; continueError?: string; onSelectProduct?: (slug: string, focusId: string) => void }) {
  const serialized = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const review = serialized === null ? null : parseRequestBasketReview(serialized);
  const items = review?.items ?? [];
  const pieceCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [operationError, setOperationError] = useState("");
  const basketLabel = galleryMode ? "صندوق درخواست" : "سبد درخواست";
  function changed(success: boolean, message = galleryMode ? "تغییر انتخاب در صندوق ذخیره نشد؛ انتخاب‌های فعلی را دوباره بررسی کن." : "تغییر در سبد ذخیره نشد؛ انتخاب‌های فعلی را دوباره بررسی کن.") { setOperationError(success ? "" : message); }

  const cashierReceipt = <section className={styles.registerReceipt} aria-label="رسید موقت صندوق اُرنوا">
    <div className={styles.registerHead}><span>صندوق گالری</span><span>ORNOVA</span></div>
    <div className={styles.receiptTitle}><h2>رسید انتخاب‌ها</h2><span>{items.length ? "پیش‌نویس درخواست" : "آمادهٔ ثبت انتخاب"}</span></div>
    {items.length > 0 && <ol className={styles.receiptItems} aria-label="ریز انتخاب‌های رسید">
      {items.map((item) => {
        const preferences = productPreferenceRows(item.preferences);
        return <li key={getRequestItemKey(item)}>
          <div className={styles.receiptItemInfo}>
            <span className={styles.receiptItemCategory}>{item.category}</span>
            <strong>{item.name}</strong>
            {preferences.length > 0 && <dl>{preferences.map((row) => <div key={row.label}><dt>{row.label}</dt><dd><bdi dir="auto">{row.value}</bdi></dd></div>)}</dl>}
          </div>
          <span className={styles.receiptItemQuantity} aria-label={`تعداد ${number.format(item.quantity)}`}>× {number.format(item.quantity)}</span>
        </li>;
      })}
    </ol>}
    <dl className={styles.receiptLines}>
      <div><dt>مدل‌های انتخاب‌شده</dt><dd>{number.format(items.length)}</dd></div>
      <div><dt>تعداد قطعه‌ها</dt><dd>{number.format(pieceCount)}</dd></div>
      <div><dt>مبلغ</dt><dd>پس از بررسی</dd></div>
    </dl>
    <p className={styles.receiptFoot}>این رسید، فهرست درخواست است؛ ثبت نهایی و برآورد هزینه پس از بررسی اُرنوا انجام می‌شود.</p>
  </section>;

  if (!review || !review.valid || items.length === 0) {
    return <div className={`${styles.surface} ${styles.empty}`} data-register={galleryMode ? "true" : undefined} aria-busy={!review}>
      {galleryMode && cashierReceipt}
      <p className={styles.label}>{basketLabel}</p>
      <h1>{!review ? (galleryMode ? "رسید در حال آماده‌شدن" : "انتخاب‌های تو") : !review.valid ? `${galleryMode ? "اطلاعات صندوق" : "سبد"} کامل خوانده نشد.` : `${basketLabel} خالی است.`}</h1>
      <p role={!review ? "status" : !review.valid ? "alert" : undefined}>{!review ? "در حال خواندن انتخاب‌های همین مرورگر…" : !review.valid ? `${galleryMode ? "اطلاعات صندوق" : "دادهٔ سبد"} در این مرورگر کامل خوانده نشد. برای ادامه، دسترسی به ذخیره‌سازی مرورگر را بررسی و صفحه را دوباره باز کن.` : "از میان قطعات بگرد؛ هر انتخاب با سایز و جزئیات دلخواهت اینجا می‌ماند."}</p>
      {operationError && <p role="alert">{operationError}</p>}
      {galleryMode && onBrowseCatalog ? <button type="button" onClick={onBrowseCatalog} className={styles.primary}>دیدن آثار در مجله <span aria-hidden="true">←</span></button> : <Link href="/shop" className={styles.primary}>دیدن قطعات <span aria-hidden="true">←</span></Link>}
      {review && !review.valid && (galleryMode ? <button type="button" onClick={onContinueRequest} className={styles.textLink}>ارتباط با Ornova</button> : <Link href="/contact" className={styles.textLink}>ارتباط با Ornova</Link>)}
      <noscript><p>برای خواندن انتخاب‌های ذخیره‌شده در این مرورگر، جاوااسکریپت باید فعال باشد.</p></noscript>
    </div>;
  }

  return (
    <div className={styles.surface} data-register={galleryMode ? "true" : undefined}>
      {galleryMode && cashierReceipt}
      <div className={styles.heading}>
        <div><p className={styles.label}>{basketLabel} / Ornova by Yas</p><h1>انتخاب‌های تو.</h1></div>
        <p>قطعه‌ها و جزئیات را مرور کن.<br />قیمت و ادامهٔ سفارش، پس از بررسی درخواست هماهنگ می‌شوند.</p>
      </div>
      {operationError && <p role="alert" className={styles.error}>{operationError}</p>}
      <div className={styles.basketLayout}><section aria-label={`انتخاب‌های ${galleryMode ? "صندوق" : "سبد"}`}>
        {items.map((item, index) => {
          const product = products.find((entry) => entry.slug === item.slug);
          const lineKey = getRequestItemKey(item);
          const productActionId = `gallery-basket-product-${lineKey}`;
          const imageActionId = `${productActionId}-image`;
          const trayImage = product?.publicationStatus === "published" && product.galleryPlacementVerified === true ? product.standImage : undefined;
          const openTray = trayImage && onSelectProduct ? (focusId: string) => onSelectProduct(item.slug, focusId) : undefined;
          const editHref = product ? `/shop/${product.slug}?selection=${encodeURIComponent(lineKey)}#product-request` : null;
          return <article key={lineKey} aria-label={`انتخاب ${number.format(index + 1)}، ${item.name}`} className={styles.item}>
            <div className={styles.itemTop}>
              {product && (galleryMode
                ? <BasketProductVisual product={product} trayImage={trayImage} actionId={imageActionId} onSelect={openTray ? () => openTray(imageActionId) : undefined} />
                : <Link href={`/shop/${product.slug}`} className={styles.itemImage}><Image src={product.image} alt={product.name} fill sizes="(max-width: 760px) 82px, 120px" className="object-cover" /></Link>)}
              <div className={styles.itemIdentity}><p className={styles.label}>{item.category} · انتخاب {number.format(index + 1)}</p><h2>{item.name}</h2>
                <ProductPreferencesSummary value={item.preferences} />
                {editHref && product && (galleryMode
                  ? openTray && <button id={productActionId} type="button" onClick={() => openTray(productActionId)} className={`${styles.textLink} ${styles.textLinkButton}`}>دیدن شناسنامه در گالری <span aria-hidden="true">↖</span></button>
                  : <a href={editHref} className={styles.textLink}>ویرایش همین انتخاب <span aria-hidden="true">↖</span></a>)}
                {!product && <p className={styles.label}>این مدل در فهرست فعلی فروشگاه نیست؛ نام ذخیره‌شده در همین مرورگر نمایش داده می‌شود.</p>}
              </div>
            </div>
            <div className={styles.itemControls}><div className={styles.quantity}><span>تعداد</span><button type="button" aria-label={`کم‌کردن تعداد انتخاب ${number.format(index + 1)}`} disabled={item.quantity <= 1} onClick={() => changed(updateRequestItemQuantity(getRequestItemKey(item), item.quantity - 1))}>−</button><span aria-live="polite" aria-atomic="true">{number.format(item.quantity)}</span><button type="button" aria-label={`زیادکردن تعداد انتخاب ${number.format(index + 1)}`} disabled={item.quantity >= 20} onClick={() => changed(updateRequestItemQuantity(getRequestItemKey(item), item.quantity + 1))}>＋</button></div><button type="button" className={styles.remove} onClick={() => changed(removeRequestItem(getRequestItemKey(item)))}>حذف این انتخاب</button></div>
            <details className={styles.note}><summary>یادداشت این انتخاب <small>{item.note?.trim() ? "یادداشت دارد" : "اختیاری"} <span aria-hidden="true">＋</span></small></summary><label><span className="sr-only">یادداشت این انتخاب</span><textarea value={item.note ?? ""} maxLength={MAX_REQUEST_ITEM_NOTE_LENGTH} rows={2} aria-describedby={`basket-note-count-${index}`} onChange={(event) => changed(updateRequestItemNote(getRequestItemKey(item), event.target.value))} placeholder="نکته‌ای که می‌خواهی همراه همین انتخاب بررسی شود." /></label><small id={`basket-note-count-${index}`}>{number.format((item.note ?? "").length)} از {number.format(MAX_REQUEST_ITEM_NOTE_LENGTH)} نویسه</small></details>
          </article>;
        })}
        <div className={styles.listFooter}>{galleryMode && onBrowseCatalog ? <button type="button" onClick={onBrowseCatalog} className={styles.textLink}>ادامهٔ دیدن آثار <span aria-hidden="true">←</span></button> : <Link href="/shop" className={styles.textLink}>ادامهٔ دیدن قطعات <span aria-hidden="true">←</span></Link>}<button type="button" className={styles.remove} onClick={() => changed(clearRequestItems(), galleryMode ? "پاک‌سازی انتخاب‌های صندوق کامل تأیید نشد؛ ممکن است یادآور قدیمی در مرورگر مانده باشد." : "پاک‌سازی سبد کامل تأیید نشد؛ ممکن است یادآور قدیمی در مرورگر مانده باشد.")}>{galleryMode ? "پاک‌کردن انتخاب‌ها" : "پاک‌کردن سبد"}</button></div>
      </section>
        <aside className={styles.summary} aria-label={`خلاصهٔ ${galleryMode ? "صندوق" : "سبد"}`}><p className={styles.label}>قدم بعد</p><h2>برای بررسی آماده‌اش کن.</h2><dl><div><dt>انتخاب‌های مستقل</dt><dd>{number.format(items.length)}</dd></div><div><dt>مجموع تعداد</dt><dd>{number.format(items.reduce((sum, item) => sum + item.quantity, 0))}</dd></div></dl><p>{galleryMode ? "ادامه، ورود و کامل‌بودن نشانی را بررسی می‌کند؛ سپس همین انتخاب‌ها را برای ثبت درخواست به تلفن گالری می‌برد. پرداخت در این مرحله انجام نمی‌شود." : "در فرم بعد، توضیح و راه ارتباطی‌ات را می‌نویسی. ارسال درخواست پس از ورود انجام می‌شود."}</p>{galleryMode && onContinueRequest ? <button type="button" onClick={onContinueRequest} disabled={continuePending} aria-busy={continuePending} className={styles.primary}>{continuePending ? "در حال بررسی حساب و نشانی…" : "ادامه برای ثبت درخواست"} <span aria-hidden="true">←</span></button> : <Link href="/contact?from=request-basket" className={styles.primary}>ادامه به فرم درخواست <span aria-hidden="true">←</span></Link>}{continueError && <p className={styles.checkoutError} role="alert">{continueError}</p>}<p className={styles.hint}>انتخاب‌ها فعلاً در همین مرورگر نگه داشته می‌شوند.</p></aside>
      </div>
    </div>
  );
}
