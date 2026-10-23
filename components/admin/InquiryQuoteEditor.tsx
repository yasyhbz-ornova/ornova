"use client";

import { useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";
import { createQuoteEditorState, quoteEditorReducer } from "@/lib/commerce/quote-editor-state";
import { formatRialAsToman, parseRialInput } from "@/lib/commerce/quote-money";
import { InquiryQuoteCard, InquiryQuoteList } from "@/components/commerce/InquiryQuoteCard";

type Row = { description: string; quantity: string; amount_rial: string };
const fieldClass = "mt-2 min-h-11 w-full min-w-0 border border-silver bg-ivory p-3 text-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-sapphire";
const emptyRow = (): Row => ({ description: "", quantity: "1", amount_rial: "" });
function dateInput(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : value; }
function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const canonical = parseRialInput(value);
  return <label className="block min-w-0 text-sm">{label} ـ ریال<input className={fieldClass} inputMode="numeric" required value={value} onChange={event => onChange(event.target.value)} /><span className="mt-1 block min-h-5 text-xs text-graphite/60">{canonical !== null ? formatRialAsToman(canonical) : "مبلغ صحیح ریالی را وارد کنید"}</span></label>;
}
export function InquiryQuoteEditor({ inquiryId, customerLabel, quotes, now, enabled }: { inquiryId: string; customerLabel: string; quotes: CustomerQuoteDTO[]; now: string; enabled: boolean }) {
  const router = useRouter(), alertRef = useRef<HTMLParagraphElement>(null), activeRequest = useRef(false);
  const [state, dispatch] = useReducer(quoteEditorReducer, inquiryId, createQuoteEditorState);
  const [fields, setFields] = useState({ source_quote_no: "", source_order_no: "", source_revision: "1", issued_at: "", valid_until: "", discount_rial: "", tax_rial: "", total_rial: "" });
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [withdrawal, setWithdrawal] = useState({ id: "", reason: "", pending: false, error: "" });
  const edit = () => dispatch({ type: "edit" });
  function field(key: keyof typeof fields, value: string) { setFields(current => ({ ...current, [key]: value })); edit(); }
  function row(index: number, key: keyof Row, value: string) { setRows(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); edit(); }
  function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "review", now: new Date().toISOString(), payload: { ...fields, version: 1, source_revision: Number(parseRialInput(fields.source_revision)), issued_at: dateInput(fields.issued_at), valid_until: dateInput(fields.valid_until),
      lines: rows.map(item => ({ description: item.description, quantity: Number(parseRialInput(item.quantity)), amount_rial: parseRialInput(item.amount_rial) })), discount_rial: parseRialInput(fields.discount_rial), tax_rial: parseRialInput(fields.tax_rial), total_rial: parseRialInput(fields.total_rial) } });
    requestAnimationFrame(() => alertRef.current?.focus());
  }
  async function publish() {
    if (!state.reviewed || state.phase !== "reviewing" || activeRequest.current) return;
    activeRequest.current = true;
    dispatch({ type: "publish" });
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/quotes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.reviewed) });
      const result = await response.json();
      if (!response.ok || typeof result.id !== "string") throw new Error(typeof result.error === "string" ? result.error : "ثبت پیشنهاد انجام نشد.");
      dispatch({ type: "success", inquiryId, id: result.id });
      router.refresh();
    } catch (cause) { dispatch({ type: "failure", inquiryId, error: cause instanceof Error ? cause.message : "ارتباط برقرار نشد؛ اطلاعات فرم حفظ شده است." }); }
    finally { activeRequest.current = false; }
  }
  async function withdraw() {
    if (!withdrawal.id || !withdrawal.reason.trim() || withdrawal.pending) return;
    setWithdrawal(current => ({ ...current, pending: true, error: "" }));
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/quotes/${withdrawal.id}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: withdrawal.reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "پس‌گرفتن پیشنهاد انجام نشد.");
      setWithdrawal({ id: "", reason: "", pending: false, error: "" }); router.refresh();
    } catch (cause) { setWithdrawal(current => ({ ...current, pending: false, error: cause instanceof Error ? cause.message : "ارتباط برقرار نشد." })); }
  }
  return <section className="mt-8 min-w-0 border-t border-silver pt-7" aria-label="پیشنهادهای قیمت پرونده">
    <h3 className="text-lg">پیشنهاد قیمت برای {customerLabel}</h3>
    <div className="mt-5"><InquiryQuoteList quotes={quotes} now={now} /></div>
    {quotes.some(quote => !quote.withdrawn_at) && <details className="mt-5 border-b border-silver pb-4"><summary className="cursor-pointer text-sm">پس‌گرفتن یک پیشنهاد صادرشده</summary><div className="mt-4 space-y-4"><label className="block text-sm">پیشنهاد<select className={fieldClass} value={withdrawal.id} disabled={withdrawal.pending} onChange={e => setWithdrawal(current => ({ ...current, id: e.target.value }))}><option value="">انتخاب کنید</option>{quotes.filter(q => !q.withdrawn_at).map(q => <option key={q.id} value={q.id}>{q.source_quote_no} · نسخهٔ {q.source_revision.toLocaleString("fa-IR")}</option>)}</select></label><label className="block text-sm">علت داخلی ـ به مشتری نمایش داده نمی‌شود<textarea className={fieldClass} maxLength={500} disabled={withdrawal.pending} value={withdrawal.reason} onChange={e => setWithdrawal(current => ({ ...current, reason: e.target.value }))} /></label><button type="button" className="ritual-line" disabled={!withdrawal.id || !withdrawal.reason.trim() || withdrawal.pending} onClick={withdraw}>{withdrawal.pending ? "در حال ثبت…" : "تأیید پس‌گرفتن پیشنهاد"}</button>{withdrawal.error && <p role="alert">{withdrawal.error}</p>}</div></details>}
    <details className="mt-6" open={state.phase !== "saved"}>
      <summary className="cursor-pointer text-sm text-sapphire">ثبت نسخهٔ تازه از خروجی بررسی‌شده</summary>
      <p className="mt-4 text-xs leading-7 text-graphite/65">این فرم، ثبتِ بررسی‌شدهٔ خروجی برنامه است؛ اتصال خودکار و محاسبهٔ آنلاین فعال نیست. مبلغ کل ردیف را وارد کنید، نه قیمت هر عدد. هزینهٔ داخلی و سود را وارد نکنید.</p>
      {!enabled && <p className="mt-3 text-sm leading-7" role="status">انتشار تا شناسایی و تنظیم منبع برنامه فعال نیست؛ می‌توانید فرم و پیش‌نمایش را بررسی کنید.</p>}
      <form className="mt-5" onSubmit={review}>
        <fieldset disabled={state.phase === "pending"} className="space-y-5">
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">{([ ["source_quote_no", "شمارهٔ پیشنهاد در برنامه"], ["source_order_no", "شمارهٔ سفارش در برنامه"], ["source_revision", "شمارهٔ نسخه"] ] as const).map(([key, label]) => <label key={key} className="block min-w-0 text-sm">{label}<input className={fieldClass} maxLength={80} required value={fields[key]} onChange={event => field(key, event.target.value)} /></label>)}<p className="self-end text-xs leading-7 text-graphite/60">مقصد این سند: {customerLabel}. پس از ثبت، محتوا قابل ویرایش نیست.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">{([ ["issued_at", "تاریخ و ساعت صدور"], ["valid_until", "پایان اعتبار"] ] as const).map(([key, label]) => <label key={key} className="block min-w-0 text-sm">{label}<input type="datetime-local" className={fieldClass} required value={fields[key]} onChange={event => field(key, event.target.value)} /></label>)}</div><p className="text-xs text-graphite/60">تاریخ‌ها به وقت دستگاه شما وارد می‌شوند.</p>
          {rows.map((item, index) => <fieldset key={index} className="min-w-0 border border-silver p-4"><legend className="px-2 text-xs">ردیف {(index + 1).toLocaleString("fa-IR")}</legend><label className="block text-sm">شرح قابل نمایش به مشتری<input className={fieldClass} required maxLength={240} value={item.description} onChange={event => row(index, "description", event.target.value)} /></label><div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2"><label className="block text-sm">تعداد<input className={fieldClass} inputMode="numeric" required value={item.quantity} onChange={event => row(index, "quantity", event.target.value)} /></label><MoneyField label="مبلغ کل ردیف" value={item.amount_rial} onChange={value => row(index, "amount_rial", value)} /></div>{rows.length > 1 && <button type="button" className="mt-3 text-xs text-sapphire" onClick={() => { setRows(current => current.filter((_, i) => i !== index)); edit(); }}>حذف این ردیف</button>}</fieldset>)}
          <button type="button" className="ritual-line" disabled={rows.length >= 50} onClick={() => { setRows(current => [...current, emptyRow()]); edit(); }}>افزودن ردیف</button>
          <div className="grid min-w-0 gap-5 sm:grid-cols-3"><MoneyField label="تخفیف" value={fields.discount_rial} onChange={value => field("discount_rial", value)} /><MoneyField label="مالیات ثبت‌شده" value={fields.tax_rial} onChange={value => field("tax_rial", value)} /><MoneyField label="جمع نهایی سند" value={fields.total_rial} onChange={value => field("total_rial", value)} /></div>
          <button type="submit" className="ritual-line">بازبینی پیشنهاد قیمت</button>
        </fieldset>
      </form>
    </details>
    {state.error && <p ref={alertRef} tabIndex={-1} className="mt-5 text-sm leading-7" role="alert">{state.error}</p>}
    {state.reviewed && <div className="mt-6 space-y-5"><p className="text-sm">پیش‌نمایش برای {customerLabel} ـ هنوز ثبت نشده است</p><InquiryQuoteCard quote={{ id: "preview", document_id: "preview", inquiry_id: inquiryId, source_quote_no: state.reviewed.source_quote_no, source_order_no: state.reviewed.source_order_no, source_revision: state.reviewed.source_revision, payload: state.reviewed, published_at: now, withdrawn_at: null }} now={now} isPreviousVersion={false} /><button type="button" className="ritual-solid" disabled={!enabled || state.phase === "pending"} onClick={publish}>{state.phase === "pending" ? "در حال ثبت…" : "ثبت و نمایش به مشتری"}</button></div>}
    <p className="mt-4 text-sm leading-7" role="status" aria-live="polite">{state.phase === "saved" ? "پیشنهاد ثبت شد؛ نسخهٔ ذخیره‌شده از پرونده خوانده می‌شود." : state.phase === "pending" ? "در حال ثبت نسخهٔ بررسی‌شده…" : ""}</p>
  </section>;
}
