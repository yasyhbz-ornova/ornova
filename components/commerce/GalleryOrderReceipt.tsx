"use client";

import { useRef } from "react";
import type { InquiryReceipt } from "@/lib/commerce/inquiry-receipt";
import { productPreferenceRows } from "@/lib/commerce/product-preferences";
import { isCanonicalRial } from "@/lib/commerce/quote-money";
import { getRequestItemKey } from "@/lib/commerce/request-basket";
import { OrnovaSymbol } from "@/components/ornova/OrnovaBrandMark";
import { GalleryEnvelope } from "./GalleryEnvelope";
import styles from "./GalleryOrderReceipt.module.css";

const countFormat = new Intl.NumberFormat("fa-IR");
const archiveNumberFormat = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
const dateFormat = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

const standaloneStyle = `
  :root { color-scheme: light; font: 16px/1.85 Tahoma, Arial, sans-serif; color: #312d29; background: #f3eee5; }
  body { margin: 1.5rem; }
  article { max-width: 36rem; margin: auto; padding: clamp(1rem, 4vw, 2rem); border: 1px solid #b9ad99; background: #fffdf8; overflow-wrap: anywhere; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .8rem; padding-bottom: 1rem; border-bottom: 1px solid #b9ad99; }
  header p { margin: 0; width: fit-content; font: .9rem Georgia, serif; }
  [data-receipt-stamp] { display: grid; place-items: center; padding: .35rem .5rem; border: 3px double #775048; border-radius: 50%; color: #775048; font-weight: bold; }
  [data-receipt-stamp] svg { width: 1.4rem; height: 1.45rem; }
  h1, h2 { font-size: 1.2rem; margin: .35rem 0 0; }
  h3 { margin: 1rem 0 .35rem; font-size: 1rem; }
  dl { margin-block: .75rem; }
  dl div { display: flex; flex-wrap: wrap; gap: .1rem .6rem; }
  dt { color: #565148; }
  dd { min-width: 0; margin: 0; white-space: pre-wrap; }
  ol { margin: 0; padding: 0; list-style: none; }
  li { padding: .65rem 0; border-block-start: 1px solid #d7cbb9; break-inside: avoid; }
  li strong { margin-inline-end: .65rem; }
  li p { margin-block: .4rem 0; white-space: pre-wrap; }
  [data-receipt-total] { padding-block-start: .75rem; border-block-start: 1px solid #b9ad99; break-inside: avoid; }
  [data-receipt-total] dd { font-weight: bold; }
  @page { margin: 17mm; }
  @media print {
    :root, article { background: white; }
    body { margin: 0; font-size: 11pt; }
    article { max-width: none; padding: 0; border: 0; }
    header, h3 { break-after: avoid; }
  }
`;

export function GalleryOrderReceipt({ receipt, archiveTitle, archiveNumber, registeredAt, acceptedTotalRial, showEnvelope = false }: {
  receipt: InquiryReceipt;
  archiveTitle?: string;
  archiveNumber?: string;
  registeredAt: string;
  acceptedTotalRial?: string;
  showEnvelope?: boolean;
}) {
  const sheet = useRef<HTMLElement>(null);
  const timestamp = new Date(registeredAt);
  const confirmedAt = Number.isNaN(timestamp.getTime()) ? null : dateFormat.format(timestamp);
  const confirmedTotal = isCanonicalRial(acceptedTotalRial) ? countFormat.format(BigInt(acceptedTotalRial)) : null;

  function downloadReceipt() {
    if (!sheet.current) return;

    // The browser escapes the React-rendered text nodes and attributes during serialization.
    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>رسید ثبت درخواست | Ornova by Yas</title>
<style>${standaloneStyle}</style>
</head>
<body>${sheet.current.outerHTML}</body>
</html>`;
    const href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `ornova-receipt-${receipt.id.replace(/[^a-z0-9-]/gi, "")}.html`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  const paper = (
    <article ref={sheet} className={styles.sheet} aria-label="رسید ثبت درخواست اُرنوا">
      <header className={styles.heading}>
        <div>
          <p lang="en" dir="ltr">Ornova by Yas</p>
          <h2>رسید ثبت درخواست</h2>
        </div>
        <span className={styles.stamp} data-receipt-stamp><OrnovaSymbol />ثبت شد</span>
      </header>
      <dl className={styles.metadata}>
        <div><dt>شناسهٔ پیگیری</dt><dd><bdi dir="ltr" className={styles.identifier}>{receipt.id}</bdi></dd></div>
        {confirmedAt && <div><dt>زمان تأیید ثبت</dt><dd><time dateTime={timestamp.toISOString()}>{confirmedAt}</time> به وقت تهران</dd></div>}
        {archiveTitle?.trim() && <div><dt>ارجاع به آرشیو</dt><dd><bdi dir="auto">{archiveTitle}</bdi>{archiveNumber && ` · عکس ${archiveNumberFormat.format(Number(archiveNumber))}`}</dd></div>}
      </dl>
      {receipt.items.length > 0 && <>
        <h3 className={styles.itemsHeading}>قطعه‌های درخواست</h3>
        <ol className={styles.items} role="list">
          {receipt.items.map((item) => {
            const preferences = productPreferenceRows(item.preferences);

            return (
              <li key={getRequestItemKey(item)}>
                <div className={styles.itemHeading}>
                  <strong><bdi dir="auto">{item.name}</bdi></strong>
                  <span>تعداد {countFormat.format(item.quantity)}</span>
                </div>
                {preferences.length > 0 && <dl className={styles.preferences}>
                  {preferences.map(({ label, value }) => (
                    <div key={label}><dt>{label}</dt><dd><bdi dir="auto">{value}</bdi></dd></div>
                  ))}
                </dl>}
                {item.note && <p className={styles.note}>یادداشت همراه <bdi dir="auto">{item.note}</bdi></p>}
              </li>
            );
          })}
        </ol>
      </>}
      {confirmedTotal !== null && <dl className={styles.total} data-receipt-total>
        <div><dt>مبلغ تأییدشده</dt><dd><bdi>{confirmedTotal}</bdi> ریال</dd></div>
      </dl>}
    </article>
  );

  const actions = (
    <div className={styles.actions}>
      <button type="button" onClick={downloadReceipt}>دریافت رسید</button>
      <p>برای چاپ، فایل رسید را در مرورگر باز کنید.</p>
    </div>
  );

  return <div className={styles.receipt} dir="rtl">
    {showEnvelope ? <GalleryEnvelope footer={actions}>{paper}</GalleryEnvelope> : <>{paper}{actions}</>}
  </div>;
}
