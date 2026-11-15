"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { InquiryQuoteCard } from "@/components/commerce/InquiryQuoteCard";
import { formatRialAsToman } from "@/lib/commerce/quote-money";
import { validateQuoteDates } from "@/lib/commerce/quote-snapshot";
import type { CalculationQuoteBasis } from "@/lib/pricing/calculated-quote";
import { calculatedQuoteEditorReducer, createCalculatedQuoteEditor, type CalculatedQuoteFields } from "@/lib/pricing/calculated-quote-ui";
import { readRecordResponse } from "@/lib/pricing/records-ui";
import type { PricingInquiryContext } from "./PricingCalculationRecords";
import styles from "./CalculatedQuoteEditor.module.css";

type Props = { inquiry: PricingInquiryContext; basis: CalculationQuoteBasis; enabled: boolean };
type Job = { controller: AbortController; timer: ReturnType<typeof setTimeout> };
const rial = (value: string) => `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
export function CalculatedQuoteEditor({ inquiry, basis, enabled }: Props) {
  const [state, dispatch] = useReducer(calculatedQuoteEditorReducer, { id: inquiry.id, basis }, value => createCalculatedQuoteEditor(value.id, value.basis));
  const active = useRef<Job | null>(null), operation = useRef(0), errorRef = useRef<HTMLParagraphElement>(null), previewRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => { if (active.current) { active.current.controller.abort(); clearTimeout(active.current.timer); active.current = null; } }, []);
  useEffect(() => { if (state.error) errorRef.current?.focus(); }, [state.error]);
  useEffect(() => { if (state.phase === "reviewing" || state.phase === "saved") previewRef.current?.focus(); }, [state.phase]);
  const locked = !["editing", "reviewing"].includes(state.phase), preview = state.target ?? state.reviewed;
  const [displayNow, setDisplayNow] = useState("");
  const hasPreview = preview !== null;
  const deskHref = `/admin?inquiry=${inquiry.id}`;
  useEffect(() => {
    if (!hasPreview) return;
    const timer = setInterval(() => setDisplayNow(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, [hasPreview]);
  function edit(field: keyof CalculatedQuoteFields, value: string) { dispatch({ type: "edit", field, value }); }
  function review(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const now = new Date().toISOString(); setDisplayNow(now); dispatch({ type: "review", now }); }
  async function publish() {
    if (!enabled || active.current || (inquiry.closed && state.phase !== "uncertain")) return;
    const target = state.phase === "uncertain" ? state.target : state.phase === "reviewing" ? state.reviewed : null;
    if (!target) return;
    const observed = new Date(); setDisplayNow(observed.toISOString());
    // Uncertain retries keep exact old metadata even after expiry: the server may have committed.
    if (state.phase === "reviewing" && !validateQuoteDates(target.quote, observed)) { dispatch({ type: "expired" }); return; }
    const controller = new AbortController(), job = { controller, timer: setTimeout(() => controller.abort(), 15000) }, current = ++operation.current;
    active.current = job; dispatch({ type: "start", operation: current });
    try {
      const response = await fetch(`/api/inquiries/${inquiry.id}/quotes/from-calculation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target.request), cache: "no-store", redirect: "error", signal: controller.signal });
      if (active.current !== job) { await response.body?.cancel(); return; }
      if (!response.ok) { await response.body?.cancel(); setDisplayNow(new Date().toISOString()); dispatch({ type: "failed", operation: current, status: response.status }); return; }
      const value = await readRecordResponse(response);
      if (active.current === job) { setDisplayNow(new Date().toISOString()); dispatch({ type: "resolved", operation: current, value }); }
    } catch { if (active.current === job) { setDisplayNow(new Date().toISOString()); dispatch({ type: "failed", operation: current, status: 503 }); } }
    finally { clearTimeout(job.timer); if (active.current === job) active.current = null; }
  }
  function field(name: keyof CalculatedQuoteFields, label: string, type = "text", help?: string) {
    const error = state.errors[name];
    return <div className={styles.field}><label htmlFor={`calculated-${name}`}>{label}</label><input id={`calculated-${name}`} type={type === "numeric" ? "text" : type} inputMode={type === "numeric" ? "numeric" : undefined} maxLength={name === "description" ? 240 : 80} value={state.fields[name]} onChange={event => edit(name, event.target.value)} required aria-invalid={error ? true : undefined} aria-describedby={error || help ? `calculated-${name}-hint` : undefined} />{error || help ? <p className={error ? styles.fieldError : styles.hint} id={`calculated-${name}-hint`}>{error || help}</p> : null}</div>;
  }
  return <section className={styles.workspace} aria-label="پیشنهاد قیمت از محاسبه" aria-busy={state.phase === "pending"}>
    <form noValidate autoComplete="off" onSubmit={review}>
      <dl className={styles.basis}><div><dt>مبلغ کل ردیف، پیش از مالیات</dt><dd>{rial(basis.pre_tax_rial)}</dd></div><div><dt>مالیات محاسبه</dt><dd>{basis.method === "cost-plus" ? rial(basis.tax_rial) : "تعیین نشده"}</dd></div></dl>
      <p className={styles.hint}>مبلغ این فرم از نسخهٔ ذخیره‌شده خوانده می‌شود. برای تغییر مبلغ پایه، محاسبهٔ تازه بگیرید. تخفیف در این مسیر صفر است.</p>
      {!enabled ? <p role="status" className={styles.notice}>ثبت از محاسبه هنوز فعال نشده است؛ بازبینی فرم ممکن است، اما پیشنهادی برای مشتری ارسال نمی‌شود.</p> : null}
      {inquiry.closed ? <p role="status" className={styles.notice}>پرونده بسته است؛ پیشنهاد تازه منتشر نمی‌شود.</p> : null}
      <fieldset disabled={locked} className={styles.formFields}>
        <legend className={styles.legend}>اطلاعات پیشنهاد</legend>
        <div className={styles.grid}>{field("source_quote_no", "شمارهٔ پیشنهاد", "text", "شمارهٔ مرجع بررسی‌شده؛ شمارهٔ تازه حدس زده نمی‌شود.")}{field("source_order_no", "شمارهٔ سفارش")}{field("source_revision", "نسخهٔ پیشنهاد", "numeric")}{field("quantity", "تعداد قطعات این ردیف", "numeric", "این تعداد در مبلغ ضرب نمی‌شود؛ مبلغ کل باید همین تعداد را پوشش دهد.")}</div>
        {field("description", "شرح قابل نمایش به مشتری", "text", "فقط مشخصات سفارش؛ هزینه، سود یا یادداشت خصوصی را ننویسید.")}
        <div className={styles.grid}>{field("issued_at", "تاریخ و ساعت صدور", "datetime-local")}{field("valid_until", "پایان اعتبار", "datetime-local")}</div>
        <p className={styles.hint}>تاریخ‌ها میلادی و به وقت دستگاه شما وارد می‌شوند؛ در پیش‌نمایش، به وقت تهران نمایش داده می‌شوند.</p>
        {basis.method === "gram-sale" ? <div>{field("tax_rial", "مالیات بررسی‌شده · ریال", "numeric", "این روش سیاست مالیاتی ندارد. مبلغ را صریح وارد کنید؛ صفر به معنی تأیید معافیت نیست.")}{state.fields.tax_rial.trim() ? <p className={styles.hint}>مبلغ نهایی پس از بازبینی، با این مالیات نمایش داده می‌شود.</p> : null}</div> : null}
        <button type="submit" className={styles.review}>بازبینی پیش‌نویس</button>
      </fieldset>
      {state.error ? <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{state.error}</p> : null}
      {state.phase === "uncertain" ? <div className={styles.recovery}><p>اطلاعات این تلاش ثابت مانده است. برای جلوگیری از انتشار ناخواستهٔ نسخه‌ای دیگر، ابتدا وضعیت همین تلاش را بررسی کنید.</p><div className={styles.actions}><button type="button" disabled={!enabled} onClick={publish}>بررسی یا تلاش دوبارهٔ همان پیشنهاد</button><button type="button" onClick={() => dispatch({ type: "abandon" })}>کنارگذاشتن این تلاش</button></div><p className={styles.hint}>کنارگذاشتن، پیشنهادِ احتمالاً ثبت‌شده را حذف نمی‌کند. پیش از پیشنهاد تازه، پرونده را ببینید.</p><Link href={deskHref}>بررسی پیشنهادهای پرونده در میز مدیر</Link><Link href={`/login?next=${encodeURIComponent(`/admin/pricing/quote?inquiry=${inquiry.id}&calculation=${basis.id}`)}`}>ورود دوباره به حساب مدیر</Link></div> : null}
    </form>
    <section className={styles.preview} aria-label="بازبینی نمای مشتری">
      <h2 ref={previewRef} tabIndex={-1}>{state.phase === "saved" ? state.receipt?.created ? "پیشنهاد ثبت شد" : "نسخهٔ ثبت‌شده یافت شد" : "نمای مشتری"}</h2>
      {preview ? <><p className={styles.hint}>{state.phase === "reviewing" ? "پیش‌نویس بررسی‌شده · هنوز ارسال نشده است" : state.phase === "saved" ? "پاسخ ثبت تأیید شد؛ پیشنهادهای پرونده را از میز مدیر ببینید." : "اطلاعات تلاش قبلی · در انتظار تأیید ثبت"}</p><InquiryQuoteCard quote={{ id: "preview", document_id: "preview", inquiry_id: inquiry.id, source_quote_no: preview.quote.source_quote_no, source_order_no: preview.quote.source_order_no, source_revision: preview.quote.source_revision, payload: preview.quote, published_at: preview.reviewedAt, withdrawn_at: null }} now={displayNow || preview.reviewedAt} isPreviousVersion={false} /><p className={styles.hint}>جمع نهاییِ ریالی: {rial(preview.quote.total_rial)} · نمایش مشتری به تومان است: {formatRialAsToman(preview.quote.total_rial)}</p>
        {state.phase === "reviewing" || state.phase === "pending" ? <button type="button" className={styles.publish} disabled={!enabled || inquiry.closed || state.phase === "pending"} onClick={publish}>{state.phase === "pending" ? "در حال ثبت…" : "ثبت و نمایش به مشتری"}</button> : null}
        {state.phase === "saved" ? <p role="status" className={styles.saved}><Link href={deskHref}>بازگشت به همین پرونده</Link></p> : null}
      </> : <p className={styles.empty}>اطلاعات پیشنهاد را تکمیل و بازبینی کنید. تغییر هر ورودی، پیش‌نویس قبلی را کنار می‌گذارد. تا اقدام جداگانهٔ ثبت، چیزی برای مشتری ارسال نمی‌شود.</p>}
    </section>
  </section>;
}
