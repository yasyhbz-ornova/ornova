"use client";

import { useState } from "react";
import Link from "next/link";
import { InquiryConversation } from "@/components/account/InquiryConversation";
import { getInquiryStatusLabel } from "@/lib/commerce/inquiry-status";
import { ProductPreferencesSummary } from "@/components/commerce/ProductPreferencesSummary";
import { InquiryQuoteEditor } from "@/components/admin/InquiryQuoteEditor";
import type { CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";

type InquiryStatus = "received" | "reviewing" | "needs_info" | "closed";
type StaffInquiry = {
  id: string;
  status: string;
  created_at: string;
  message: string;
  contact: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_design_note: string | null;
  items: { product_name: string; quantity: number; preferences: unknown }[];
  files: { id: string; original_name: string }[];
};

const statuses: { value: InquiryStatus; label: string }[] = [
  { value: "received", label: "دریافت شد" },
  { value: "reviewing", label: "در حال بررسی" },
  { value: "needs_info", label: "نیاز به اطلاعات" },
  { value: "closed", label: "بسته شده" },
];
function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));
}

export function InquiryDesk({ inquiries, quotes, quotesError, quoteReadAt, quoteEnabled, initialInquiryId }: { inquiries: StaffInquiry[]; quotes: CustomerQuoteDTO[]; quotesError: boolean; quoteReadAt: string; quoteEnabled: boolean; initialInquiryId?: string }) {
  const [records, setRecords] = useState(inquiries);
  const [selectedId, setSelectedId] = useState(initialInquiryId && inquiries.some(item => item.id === initialInquiryId) ? initialInquiryId : inquiries[0]?.id ?? "");
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const [statusDraft, setStatusDraft] = useState(selected?.status ?? "received");
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectRecord(record: StaffInquiry) {
    setSelectedId(record.id);
    setStatusDraft(record.status);
    setFeedback(null);
    setError(null);
  }

  async function updateStatus() {
    if (!selected || statusDraft === selected.status) return;
    setPending(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/inquiries/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "تغییر وضعیت انجام نشد.");
      setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, status: statusDraft } : item));
      setFeedback("وضعیت ذخیره شد و در تاریخچه‌ی پرونده ثبت شد.");
      setReloadToken((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  if (!records.length) return <div className="account-empty"><p>درخواستی برای بررسی ثبت نشده است.</p></div>;

  return (
    <div className="inquiry-desk">
      <nav className="inquiry-desk-list" aria-label="پرونده‌های درخواست">
        {records.map((item) => (
          <button key={item.id} type="button" aria-pressed={item.id === selectedId} onClick={() => selectRecord(item)}>
            <span>{item.customer_name || item.contact || "مشتری Ornova"}</span>
            <small>{getInquiryStatusLabel(item.status)} · {formatDate(item.created_at)}</small>
          </button>
        ))}
      </nav>

      {selected && <article className="inquiry-desk-detail">
        <header>
          <p className="ritual-label">پرونده‌ی درخواست / {formatDate(selected.created_at)}</p>
          <h2>{selected.customer_name || "درخواست مشتری"}</h2>
          <p className="inquiry-desk-contact">{selected.contact || selected.customer_phone || "راه تماس ثبت نشده"}</p>
          <Link href={`/admin/pricing?inquiry=${encodeURIComponent(selected.id)}`} className="mt-3 inline-block text-sm text-sapphire underline underline-offset-4">محاسبه و تاریخچهٔ قیمت این پرونده</Link>
        </header>
        <p className="inquiry-desk-original-message">{selected.message}</p>
        {selected.customer_design_note && <section className="border-y border-silver py-4" aria-label="یادداشت سلیقه‌ی طراحی مشتری">
          <h3 className="text-sm font-medium text-graphite">یادداشت سلیقه برای طراحی</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-graphite/70">{selected.customer_design_note}</p>
        </section>}
        {selected.items.length > 0 && <ul className="inquiry-desk-items">{selected.items.map((item, index) => <li key={`${item.product_name}-${index}`}><div>{item.product_name}<ProductPreferencesSummary value={item.preferences} /></div><span>تعداد {item.quantity}</span></li>)}</ul>}
        {selected.files.length > 0 && <section className="inquiry-desk-items" aria-label="فایل‌های مرجع پرونده"><h3>فایل‌های مرجع</h3><ul>{selected.files.map((file) => <li key={file.id}><a href={`/api/inquiries/${selected.id}/files?fileId=${encodeURIComponent(file.id)}`}>{file.original_name}</a></li>)}</ul></section>}
        <div className="inquiry-status-editor">
          <label htmlFor="inquiry-status">مرحله‌ی پرونده</label>
          <select id="inquiry-status" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as InquiryStatus | string)}>
            {!statuses.some((status) => status.value === selected.status) && <option value={selected.status} disabled>{getInquiryStatusLabel(selected.status)} · جزئیات باید در پرونده ثبت شود</option>}
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <button type="button" disabled={pending || statusDraft === selected.status} onClick={updateStatus}>{pending ? "در حال ذخیره…" : "ثبت مرحله"}</button>
        </div>
        {feedback && <p role="status" className="inquiry-feedback">{feedback}</p>}
        {error && <p role="alert" className="inquiry-feedback">{error}</p>}
        {quotesError ? <p role="alert" className="my-6 text-sm leading-7">پیشنهادهای قیمت فعلاً دریافت نشدند؛ انتشار تا بررسی اتصال و ساختار داده انجام نمی‌شود.</p> : <InquiryQuoteEditor key={selected.id} inquiryId={selected.id} customerLabel={selected.customer_name || selected.contact || "مشتری Ornova"} quotes={quotes.filter(quote => quote.inquiry_id === selected.id)} now={quoteReadAt} enabled={quoteEnabled && selected.status !== "closed"} />}
        <InquiryConversation key={selected.id} inquiryId={selected.id} status={selected.status} viewer="staff" reloadToken={reloadToken} />
      </article>}
    </div>
  );
}
