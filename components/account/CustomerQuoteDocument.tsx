import Link from "next/link";
import type { CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";
import { InquiryQuoteCard } from "@/components/commerce/InquiryQuoteCard";
import { PrintDocumentButton } from "./PrintDocumentButton";
import { AcceptQuoteButton } from "./AcceptQuoteButton";
import styles from "./CustomerQuoteDocument.module.css";

// CSS string escapes keep source references as text, including quotes/control characters.
function cssText(value: string) {
  return `"${Array.from(value, character => `\\${character.codePointAt(0)!.toString(16)} `).join("")}"`;
}

export function CustomerQuoteDocument({ quote, isPreviousVersion, checkedAt, embedded = false, onBack, onAccepted }: { quote: CustomerQuoteDTO; isPreviousVersion: boolean; checkedAt: string; embedded?: boolean; onBack?(): void; onAccepted?(acceptedAt: string): void }) {
  const received = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(checkedAt));
  const reference = `${quote.source_quote_no} · نسخهٔ ${quote.source_revision.toLocaleString("fa-IR")}${isPreviousVersion ? " · نسخهٔ پیشین" : ""}`;
  const marginStyle = `@media print { @page ornova-quote {
    @top-center { content: ${cssText(reference)}; font-family: var(--font-ornova-text), sans-serif; font-size: 8pt; direction: rtl; white-space: pre-wrap; overflow-wrap: anywhere; }
    @bottom-center { content: ${cssText("پیشنهاد قیمت · صفحهٔ ")} counter(page, persian) ${cssText(" از ")} counter(pages, persian); font-family: var(--font-ornova-text), sans-serif; font-size: 8pt; direction: rtl; }
  } }`;
  return <div className={`${styles.document} ${embedded ? styles.embedded : ""}`}>
    <style>{marginStyle}</style>
    <nav className={styles.tools} aria-label="گزینه‌های سند">{embedded ? <button type="button" onClick={onBack}>بازگشت به سوابق حساب</button> : <Link href="/account">بازگشت به پرونده‌های من</Link>}<PrintDocumentButton /></nav>
    <div className={styles.sheet}>
      <header className={styles.heading}><p lang="en" dir="ltr">Ornova by Yas</p><h1>پیشنهاد قیمت</h1><p>نسخهٔ ثبت‌شده در پروندهٔ شما</p></header>
      <InquiryQuoteCard quote={quote} now={checkedAt} isPreviousVersion={isPreviousVersion} />
      {!isPreviousVersion && !quote.withdrawn_at && !quote.accepted_at && Date.parse(quote.payload.valid_until) > Date.parse(checkedAt) && <div className={styles.acceptance}><AcceptQuoteButton inquiryId={quote.inquiry_id} quoteId={quote.id} onAccepted={onAccepted} /></div>}
      <section className={styles.record} aria-label="مرجع نسخه">
        <p>مبلغ مرجع این نسخه: <bdi>{new Intl.NumberFormat("fa-IR").format(BigInt(quote.payload.total_rial))} ریال</bdi></p>
        <p>زمان دریافت و بررسی وضعیت: {received}، به وقت تهران</p>
        <p>وضعیت نشان‌داده‌شده مربوط به زمان دریافت این صفحه است. نسخهٔ چاپی، تغییر یا پس‌گرفتن پیشنهاد در آینده را نشان نمی‌دهد؛ برای ادامه، پروندهٔ حساب را بررسی کنید.</p>
      </section>
      <footer className={styles.signature}><span>Ornova by Yas</span><span>پیشنهاد قیمت · بدون تأیید پرداخت</span></footer>
    </div>
    <p className={styles.screenNote}>با انتخاب چاپ، می‌توانید از گزینهٔ ذخیره به‌صورت پی‌دی‌اف در مرورگرتان استفاده کنید. فایل را در محل امن نگه دارید.</p>
  </div>;
}
