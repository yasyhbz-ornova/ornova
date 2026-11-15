"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PricingRequest, PricingResponse } from "@/lib/pricing/contract";
import type { CalculationRecord } from "@/lib/pricing/records";
import { createRecordDesk, recordDeskReducer, readRecordResponse, parseSavedCalculation, savedPreviewChanged } from "@/lib/pricing/records-ui";
import styles from "./PricingCalculationRecords.module.css";

export type PricingInquiryContext = { id: string; label: string; closed: boolean };
type Props = { inquiry: PricingInquiryContext; storageEnabled: boolean; request: PricingRequest | null; preview: PricingResponse | null };
type Job = { controller: AbortController; timer: ReturnType<typeof setTimeout> };
function stop(ref: { current: Job | null }) { if (ref.current) { ref.current.controller.abort(); clearTimeout(ref.current.timer); ref.current = null; } }
const rial = (value: string) => `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
const method = (value: string) => value === "cost-plus" ? "هزینهٔ واقعی + سود" : "نرخ فروش هر گرم + افزوده‌ها";
const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));
const digits = (value: string) => value.replace(/\d/g, n => "۰۱۲۳۴۵۶۷۸۹"[Number(n)]);
const labels: Record<string, string> = {
  true_cost_rial: "هزینهٔ واقعی", mandatory_buffer_rial: "حاشیهٔ اطمینان", profit_method: "مبنای سود", profit_bp: "درصد سود", rounding: "گردکردن", rounding_step_rial: "گام گردکردن", tax_bp: "درصد مالیات", override_pre_tax_rial: "مبلغ جایگزین پیش از مالیات", override_reason: "دلیل داخلی تغییر",
  weight_mg: "وزن", rate_per_gram_rial: "نرخ فروش هر گرم", under_2g_fee_rial: "افزودهٔ کمتر از ۲ گرم", under_4g_fee_rial: "افزودهٔ ۲ تا کمتر از ۴ گرم", stone_total_rial: "هزینهٔ کل سنگ‌ها", stone_count: "تعداد سنگ", setting_per_stone_rial: "نصب هر سنگ", packaging_rial: "بسته‌بندی", logistics_rial: "حمل و جابه‌جایی", design_rial: "طراحی",
};
function inputValue(key: string, value: string | number | null): string {
  if (value === null) return "وارد نشده";
  if (key.endsWith("_rial")) return rial(String(value));
  if (key.endsWith("_bp")) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Number(value) / 100)}٪`;
  if (key === "weight_mg") {
    const mg = BigInt(value), fraction = String(mg % BigInt(1000)).padStart(3, "0").replace(/0+$/, "");
    return `${new Intl.NumberFormat("fa-IR").format(mg / BigInt(1000))}${fraction ? `٫${digits(fraction)}` : ""} گرم`;
  }
  if (key === "stone_count") return Number(value).toLocaleString("fa-IR");
  if (key === "profit_method") return value === "margin" ? "حاشیهٔ سود از فروش" : "افزایش روی هزینه";
  if (key === "rounding") return ({ none: "بدون گردکردن", nearest: "نزدیک‌ترین مضرب", up: "رو به بالا", down: "رو به پایین" } as Record<string, string>)[String(value)];
  return String(value);
}
function Snapshot({ record }: { record: CalculationRecord }) {
  const warnings: readonly string[] = record.snapshot.result.warnings;
  return <div className={styles.snapshot}>
    <p>{method(record.snapshot.method)} · نسخهٔ نرخ‌ها: <bdi>{record.snapshot.policy_version}</bdi></p>
    <dl className={styles.inputs}>{Object.entries(record.snapshot.input).map(([key, value]) => <div key={key}><dt>{labels[key]}</dt><dd>{inputValue(key, value)}</dd></div>)}</dl>
    <p>پیش از مالیات: {rial(record.snapshot.result.pre_tax_rial)} · {record.snapshot.method === "gram-sale" ? "سیاست مالیاتی تعیین نشده" : `مالیات: ${rial(record.snapshot.result.tax_rial)}`}</p>
    {record.snapshot.method === "gram-sale" ? <p className={styles.warning}>این روش سیاست مالیاتی ندارد؛ صفرِ خروجی، معافیت مالیاتی نیست.</p> : null}
    {warnings.includes("MANDATORY_BUFFER_ZERO") ? <p className={styles.warning}>حاشیهٔ اطمینان صفر ثبت شده است.</p> : null}
    {warnings.includes("FINAL_BELOW_TARGET") ? <p className={styles.warning}>مبلغ کمتر از قیمت هدف ثبت شده؛ دلیل داخلی را بررسی کنید.</p> : null}
  </div>;
}
const quoteLink = (record: CalculationRecord) => `/admin/pricing/quote?inquiry=${record.inquiry_id}&calculation=${record.id}`;

// Keying the session keeps a new inquiry from inheriting an old write/retry target.
export function PricingCalculationRecords(props: Props) { return <RecordSession key={props.inquiry.id.toLowerCase()} {...props} />; }
function RecordSession({ inquiry, storageEnabled, request, preview }: Props) {
  const inquiryId = inquiry.id.toLowerCase();
  const [state, dispatch] = useReducer(recordDeskReducer, inquiryId, createRecordDesk);
  const historyJob = useRef<Job | null>(null), saveJob = useRef<Job | null>(null), operation = useRef(0), errorRef = useRef<HTMLParagraphElement>(null);
  const loadHistory = useCallback(async (before: number | null = null) => {
    stop(historyJob);
    const controller = new AbortController(), job = { controller, timer: setTimeout(() => controller.abort(), 15000) };
    historyJob.current = job;
    const current = ++operation.current;
    dispatch({ type: "history-start", inquiryId, operation: current, before });
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/calculations${before === null ? "" : `?before=${before}`}`, { cache: "no-store", redirect: "error", signal: controller.signal });
      if (historyJob.current !== job) { await response.body?.cancel(); return; }
      if (!response.ok) { await response.body?.cancel(); dispatch({ type: "history-failure", inquiryId, operation: current, status: response.status }); return; }
      const value = await readRecordResponse(response);
      if (historyJob.current === job) dispatch({ type: "history-success", inquiryId, operation: current, value });
    } catch { if (historyJob.current === job) dispatch({ type: "history-failure", inquiryId, operation: current, status: 503 }); }
    finally { clearTimeout(job.timer); if (historyJob.current === job) historyJob.current = null; }
  }, [inquiryId]);
  useEffect(() => { void loadHistory(); return () => { stop(historyJob); stop(saveJob); }; }, [loadHistory]);
  useEffect(() => { if (state.save.error) errorRef.current?.focus(); }, [state.save.error]);

  async function save() {
    if (!storageEnabled || saveJob.current) return;
    const target = state.save.phase === "error" ? state.save.target : request && preview && !inquiry.closed ? { request, preview } : null;
    if (!target || (state.save.phase === "saved" && state.save.record?.snapshot.request_id === target.request.request_id)) return;
    const controller = new AbortController(), job = { controller, timer: setTimeout(() => controller.abort(), 15000) };
    saveJob.current = job;
    dispatch({ type: "save-start", inquiryId, target });
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/calculations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target.request), cache: "no-store", redirect: "error", signal: controller.signal });
      if (saveJob.current !== job) { await response.body?.cancel(); return; }
      if (!response.ok) { await response.body?.cancel(); dispatch({ type: "save-failure", inquiryId, requestId: target.request.request_id, status: response.status }); return; }
      const value = await readRecordResponse(response);
      if (saveJob.current === job) {
        dispatch({ type: "save-success", inquiryId, requestId: target.request.request_id, value });
        if (parseSavedCalculation(value, inquiryId, target.request).success) void loadHistory();
      }
    } catch { if (saveJob.current === job) dispatch({ type: "save-failure", inquiryId, requestId: target.request.request_id, status: 503 }); }
    finally { clearTimeout(job.timer); if (saveJob.current === job) saveJob.current = null; }
  }
  const currentSaved = !!request && state.save.record?.snapshot.request_id === request.request_id;
  return <section className={styles.desk} aria-label="ذخیره و تاریخچهٔ خصوصی محاسبات">
    <header><h2>ثبت و نسخه‌های پرونده</h2><p>برای {inquiry.label} · فقط در دسترس مدیر</p></header>
    {inquiry.closed ? <p className={styles.notice}>پرونده بسته است؛ تاریخچه قابل مشاهده است، اما محاسبهٔ تازه ثبت نمی‌شود.</p> : null}
    {!storageEnabled ? <p className={styles.notice}>ذخیره‌سازی خصوصی هنوز پیکربندی نشده است. پیش‌نمایش با ثبت در پرونده تفاوت دارد.</p> : null}
    <p className={styles.hint}>ثبت با محاسبهٔ دوبارهٔ موتور انجام می‌شود. مبلغ ثبت‌شده را جداگانه بررسی کنید؛ این کار پیشنهاد قیمت یا فاکتور برای مشتری صادر نمی‌کند.</p>
    {state.save.phase === "error" ? <div className={styles.recovery}>
      <p ref={errorRef} tabIndex={-1} role="alert">{state.save.error}</p>
      {state.save.target ? <p>درخواست نگه‌داشته‌شده: {method(state.save.target.request.method)} · پیش‌نمایش {rial(state.save.target.preview.result.total_rial)}</p> : null}
      <div className={styles.actions}><button type="button" disabled={!storageEnabled} onClick={save}>بررسی یا تلاش دوبارهٔ همان ثبت</button><button type="button" onClick={() => dispatch({ type: "save-forget", inquiryId })}>کنارگذاشتن این تلاش</button></div>
      <p className={styles.hint}>کنارگذاشتن، ثبت احتمالیِ قبلی را حذف نمی‌کند؛ پیش از ثبت جدید تاریخچه را بررسی کنید.</p>
      <Link href={`/login?next=${encodeURIComponent(`/admin/pricing?inquiry=${inquiryId}`)}`}>ورود دوباره به حساب مدیر</Link>
    </div> : <div className={styles.actions}><button type="button" disabled={!storageEnabled || inquiry.closed || !request || !preview || state.save.phase === "pending" || currentSaved} onClick={save}>{state.save.phase === "pending" ? "در حال ثبت…" : "ثبت خصوصی در پرونده"}</button><span role="status">{currentSaved ? "برای این درخواست نسخه‌ای ثبت شده است؛ رسید زیر را بررسی کنید." : !request ? "ابتدا پیش‌نمایش معتبر بگیرید." : state.save.phase === "pending" ? "ورودی‌های این ثبت ثابت می‌مانند؛ ویرایش فرم، ثبت قبلی را لغو نمی‌کند." : ""}</span></div>}
    {state.save.record ? <section className={styles.receipt} aria-label="رسید ثبت خصوصی"><h3>نسخهٔ {state.save.record.revision.toLocaleString("fa-IR")} در پرونده ثبت شد.</h3><p className={styles.amount}>{rial(state.save.record.snapshot.result.total_rial)}</p><p>{method(state.save.record.snapshot.method)} · <time dateTime={state.save.record.created_at}>{formatDate(state.save.record.created_at)}</time></p><p>این مبلغ، خروجی ذخیره‌شده است؛ نه تأیید قیمت برای مشتری.</p>
      {state.save.target && savedPreviewChanged(state.save.target.preview, state.save.record.snapshot) ? <p role="status" className={styles.warning}>خروجی ذخیره‌شده با پیش‌نمایش قبلی تفاوت دارد؛ مبلغ و جزئیات ثبت‌شده را بررسی کنید.</p> : null}
      <details><summary>جزئیات نسخهٔ ثبت‌شده</summary><Snapshot record={state.save.record} /></details><Link href={quoteLink(state.save.record)}>بازبینی پیشنهاد از این نسخه</Link></section> : null}
    <div className={styles.history}><div className={styles.historyHeading}><h3>تاریخچهٔ خصوصی محاسبات</h3><button type="button" onClick={() => void loadHistory()}>دریافت جدیدترین نسخه‌ها</button></div>
      <p className={styles.hint}>این نسخه‌ها تغییر نمی‌کنند؛ اصلاحات با محاسبه و ثبت تازه انجام می‌شود. هزینه‌ها و سود برای مشتری قابل مشاهده نیستند.</p>
      {state.history.phase === "loading" ? <p role="status">در حال دریافت تاریخچه…</p> : null}
      {state.history.error ? <p role="alert">{state.history.error}</p> : null}
      {state.history.phase === "ready" && !state.history.records.length ? <p>هنوز محاسبه‌ای در این بخش از تاریخچه ثبت نشده است.</p> : null}
      <ol className={styles.list}>{state.history.records.map(record => <li key={record.id}><details><summary><span>نسخهٔ {record.revision.toLocaleString("fa-IR")} · {method(record.snapshot.method)}</span><strong>{rial(record.snapshot.result.total_rial)}</strong><time dateTime={record.created_at}>{formatDate(record.created_at)}</time></summary><Snapshot record={record} /><Link href={quoteLink(record)}>بازبینی پیشنهاد از این نسخه</Link></details></li>)}</ol>
      {state.history.next_before !== null ? <button type="button" onClick={() => void loadHistory(state.history.next_before)}>نسخه‌های قدیمی‌تر</button> : null}
    </div>
  </section>;
}
