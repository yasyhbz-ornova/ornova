"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReceiptDetail, ReceiptList } from "@/lib/account/inquiry-receipts";
import { getInquiryStatusLabel } from "@/lib/commerce/inquiry-status";
import { GalleryOrderReceipt } from "./GalleryOrderReceipt";
import styles from "./GalleryCashierReceipts.module.css";

type Result = { kind: "loading" | "guest" | "missing" | "error" } | { kind: "list"; data: ReceiptList } | { kind: "detail"; data: ReceiptDetail };
const day = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });
const number = new Intl.NumberFormat("fa-IR");
const photoNumber = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 });

export function GalleryCashierReceipts({ selection, onSelectReceipt, onOpenAccount }: { selection?: string; onSelectReceipt(id?: string): void; onOpenAccount?: () => void }) {
  const [result, setResult] = useState<Result>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const returnToReceipt = useRef<string | undefined>(undefined);
  const focusReceiptDetail = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    async function readReceipts() {
      setResult({ kind: "loading" });
      try {
        const query = selection ? `receiptId=${encodeURIComponent(selection)}` : `page=${page}`;
        const response = await fetch(`/api/account/inquiries?view=receipts&${query}`, { cache: "no-store", signal: controller.signal });
        if (!active) return;
        if (response.status === 401) { setResult({ kind: "guest" }); return; }
        if (response.status === 404 || response.status === 400) { setResult({ kind: "missing" }); return; }
        if (!response.ok) throw new Error("Receipt read failed");
        const data = await response.json() as ReceiptDetail | ReceiptList;
        if (!active) return;
        if (selection && "receipt" in data && data.receipt.id === selection.toLowerCase()) setResult({ kind: "detail", data });
        else if (!selection && "receipts" in data && Array.isArray(data.receipts)) setResult({ kind: "list", data });
        else throw new Error("Invalid receipt result");
      } catch {
        if (active) setResult({ kind: "error" });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void readReceipts();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [page, selection, retry]);

  function openList() {
    returnToReceipt.current = selection;
    onSelectReceipt();
  }
  return <section className={styles.paper} aria-labelledby="cashier-saved-title">
    <h2 id="cashier-saved-title">رسیدهای ثبت‌شده</h2>
    {result.kind === "loading" && <p role="status">در حال بازکردن رسیدها…</p>}
    {result.kind === "guest" && <><p>رسیدها در دفتر شخصی اُرنوا نگه‌داری می‌شوند.</p>{onOpenAccount && <button type="button" className={styles.action} onClick={onOpenAccount}>ورود به دفتر شخصی</button>}</>}
    {result.kind === "error" && <><p role="alert">رسیدها فعلاً در دسترس نیستند.</p><button type="button" className={styles.action} onClick={() => setRetry((value) => value + 1)}>تلاش دوباره</button></>}
    {result.kind === "missing" && <><p role="alert">این رسید در دفتر تو پیدا نشد.</p><button type="button" className={styles.action} onClick={openList}>دیدن همهٔ رسیدها</button></>}
    {result.kind === "detail" && <>
      <button type="button" className={styles.action} onClick={openList} ref={(element) => {
        if (element && focusReceiptDetail.current) {
          focusReceiptDetail.current = false;
          element.focus();
        }
      }}>بازگشت به فهرست رسیدها</button>
      <GalleryOrderReceipt
        key={result.data.receipt.id}
        receipt={result.data.receipt}
        archiveTitle={result.data.archiveTitle ?? undefined}
        archiveNumber={result.data.archiveNumber ?? undefined}
        registeredAt={result.data.registeredAt}
        acceptedTotalRial={result.data.price.kind === "accepted" ? result.data.price.totalRial : undefined}
        showEnvelope
      />
      <p>{getInquiryStatusLabel(result.data.status)}</p>
      {result.data.price.kind === "accepted" && <Link className={styles.action} href={`/account/inquiries/${result.data.receipt.id}/quotes/${result.data.price.quoteId}`}>بازکردن برگهٔ مبلغ تأییدشده</Link>}
      {result.data.price.kind === "pending" && <p>مبلغ بعد از بررسی سفارش در همین صندوق در دسترس قرار می‌گیرد.</p>}
      {result.data.price.kind === "unavailable" && <p role="status">برگهٔ مبلغ موقتاً در دسترس نیست.</p>}
    </>}
    {result.kind === "list" && <>
      {result.data.receipts.length > 0 ? <ul className={styles.index}>{result.data.receipts.map((receipt) => <li key={receipt.id}><button
        type="button"
        onClick={() => { focusReceiptDetail.current = true; onSelectReceipt(receipt.id); }}
        ref={(element) => {
          if (element && returnToReceipt.current === receipt.id) {
            returnToReceipt.current = undefined;
            element.focus();
          }
        }}
      >
        <strong>{receipt.workName ?? "رسید درخواست"}{receipt.additionalWorks > 0 && ` و ${number.format(receipt.additionalWorks)} اثر دیگر`}</strong>
        <span className={styles.receiptMeta}>
          <span>{getInquiryStatusLabel(receipt.status)}</span>
          <time dateTime={receipt.created_at}>{day.format(new Date(receipt.created_at))}</time>
          {receipt.archiveNumber && <span>عکس {photoNumber.format(Number(receipt.archiveNumber))}</span>}
          <span>رسید <bdi dir="ltr">{receipt.id.slice(0, 8)}</bdi></span>
        </span>
      </button></li>)}</ul> : <p>هنوز رسیدی در صندوق ثبت نشده است.</p>}
      {(page > 1 || result.data.hasMore) && <nav className={styles.pages} aria-label="صفحه‌های رسیدها">
        <button type="button" className={styles.action} disabled={page <= 1} onClick={() => setPage(page - 1)}>صفحهٔ قبل</button>
        <button type="button" className={styles.action} disabled={!result.data.hasMore} onClick={() => setPage(page + 1)}>صفحهٔ بعد</button>
      </nav>}
    </>}
  </section>;
}
