"use client";

import Link from "next/link";
import { PricingCalculationRecords, type PricingInquiryContext } from "./PricingCalculationRecords";

import { useEffect, useReducer, useRef } from "react";
import { buildPricingRequest, initialPricingForm, pricingFormReducer } from "@/lib/pricing/form";
import type { PricingResponse } from "@/lib/pricing/contract";
import styles from "./PricingCalculator.module.css";

/* THESIS: a private working calculation, not a sales dashboard.
 * OWN-WORLD: existing ivory/silver/graphite, Persian text, restrained sapphire actions.
 * STORY: choose a policy, enter explicit rates, inspect a transient result.
 * FIRST VIEWPORT: compact heading, method control, inputs beside an empty result sheet.
 * FORM: narrow extension of the current admin forms; no new concept/world or seed.
 */
const gramFees = [
  ["under_2g_fee_rial", "افزودهٔ وزن کمتر از ۲ گرم"], ["under_4g_fee_rial", "افزودهٔ وزن ۲ تا کمتر از ۴ گرم"],
  ["stone_total_rial", "هزینهٔ کل سنگ‌ها"], ["setting_per_stone_rial", "هزینهٔ نصب هر سنگ"],
  ["packaging_rial", "بسته‌بندی"], ["logistics_rial", "حمل و جابه‌جایی"], ["design_rial", "طراحی"],
] as const;
const rial = (value: string) => `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
const methodLabel = (method: string) => method === "cost-plus" ? "هزینهٔ واقعی + سود" : "نرخ فروش هر گرم + افزوده‌ها";

function Field({ name, label, value, error, help, onChange, optional = false, mode = "numeric" }: {
  name: string; label: string; value: string; error?: string; help?: string; onChange: (value: string) => void; optional?: boolean; mode?: "numeric" | "decimal" | "text";
}) {
  return <div className={styles.field}><label htmlFor={`pricing-${name}`}>{label}{optional ? <span> · اختیاری</span> : null}</label>
    <input id={`pricing-${name}`} value={value} inputMode={mode} maxLength={mode === "text" ? 80 : 40} autoComplete="off" required={!optional}
      dir={mode === "text" ? "auto" : "ltr"} aria-invalid={error ? true : undefined} aria-describedby={error || help ? `pricing-${name}-hint` : undefined} onChange={e => onChange(e.target.value)} />
    {error || help ? <p id={`pricing-${name}-hint`} className={error ? styles.fieldError : styles.hint}>{error || help}</p> : null}
  </div>;
}
function Result({ value }: { value: PricingResponse }) {
  const cost = value.method === "cost-plus" ? value.result : null;
  const gram = value.method === "gram-sale" ? value.result : null;
  return <>
    <p className={styles.kicker}>پیش‌نمایش محاسبه</p>
    <h2 id="pricing-result-title">جمع محاسبه</h2>
    <output className={styles.total} aria-label="مبلغ نهایی محاسبه">{rial(value.result.total_rial)}</output>
    <dl className={styles.breakdown}><div><dt>پیش از مالیات</dt><dd>{rial(value.result.pre_tax_rial)}</dd></div><div><dt>{gram ? "مالیات در این روش محاسبه نمی‌شود" : "مالیات محاسبه‌شده"}</dt><dd>{gram ? "تعیین نشده" : rial(value.result.tax_rial)}</dd></div></dl>
    <p className={styles.hint}>{methodLabel(value.method)}<br />نسخهٔ ورودی نرخ‌ها: <bdi>{value.policy_version}</bdi><br />نسخهٔ الگوریتم: ۱</p>
    {gram ? <p className={styles.notice}>این روش سیاست مالیاتی ندارد. صفرِ خروجی، معافیت مالیاتی نیست؛ برای سند مشتری باید جداگانه بررسی شود.</p> : null}
    {cost?.warnings.includes("MANDATORY_BUFFER_ZERO") ? <p className={styles.notice}>حاشیهٔ اطمینان صفر وارد شده است؛ پیش از استفاده بررسی کنید.</p> : null}
    {cost?.warnings.includes("FINAL_BELOW_TARGET") ? <p className={styles.notice}>مبلغ نهایی از قیمت هدف کمتر است؛ دلیل داخلی تغییر را بازبینی کنید.</p> : null}
    <details className={styles.details}><summary>جزئیات محاسبه</summary><dl className={styles.breakdown}>
      {cost ? <><div><dt>کف هزینه</dt><dd>{rial(cost.cost_floor_rial)}</dd></div><div><dt>قیمت هدف پیش از مالیات</dt><dd>{rial(cost.target_rial)}</dd></div><div><dt>حاشیهٔ سود مؤثر</dt><dd>{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(cost.effective_margin_bp / 100)}٪</dd></div></> : null}
      {gram ? <><div><dt>پایه بر اساس وزن</dt><dd>{rial(gram.base_rial)}</dd></div><div><dt>افزودهٔ وزن انتخاب‌شده</dt><dd>{rial(gram.light_piece_rial)}</dd></div><div><dt>نصب سنگ‌ها</dt><dd>{rial(gram.setting_rial)}</dd></div></> : null}
    </dl></details>
    <p className={styles.footnote}>این نتیجه پیشنهاد قیمت یا فاکتور نیست و به مشتری نمایش داده نمی‌شود. هزینه‌ها و سود، اطلاعات داخلی‌اند.</p>
  </>;
}

export function PricingCalculator({ enabled, inquiry, storageEnabled = false }: { enabled: boolean; inquiry?: PricingInquiryContext; storageEnabled?: boolean }) {
  const [state, dispatch] = useReducer(pricingFormReducer, undefined, initialPricingForm);
  const active = useRef<AbortController | null>(null), errorRef = useRef<HTMLDivElement>(null);
  const overrideDetails = useRef<HTMLDetailsElement>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  useEffect(() => { if (state.error) errorRef.current?.focus(); }, [state.error]);
  function edit(field: string, value: string) {
    active.current?.abort(); active.current = null;
    dispatch({ type: "edit", field, value });
  }
  function reset() {
    active.current?.abort(); active.current = null; dispatch({ type: "reset" });
  }
  async function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || active.current) return;
    const built = buildPricingRequest(state.draft, crypto.randomUUID());
    if (!built.success) {
      if ((built.errors.override_pre_tax_rial || built.errors.override_reason) && overrideDetails.current) overrideDetails.current.open = true;
      dispatch({ type: "invalid", errors: built.errors }); return;
    }
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000), requestId = built.request.request_id;
    dispatch({ type: "start", request: built.request });
    try {
      const response = await fetch("/api/admin/pricing/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(built.request), cache: "no-store", redirect: "error", signal: controller.signal });
      if (active.current !== controller) { await response.body?.cancel(); return; }
      if (!response.ok) { await response.body?.cancel(); dispatch({ type: "failure", requestId, status: response.status }); return; }
      const value: unknown = await response.json();
      if (active.current === controller) dispatch({ type: "resolve", requestId, value });
    } catch { if (active.current === controller) dispatch({ type: "failure", requestId, status: 503 }); }
    finally { clearTimeout(timer); if (active.current === controller) active.current = null; }
  }
  const fields = state.draft.fields;
  const field = (name: string, label: string, options: { help?: string; optional?: boolean; mode?: "numeric" | "decimal" | "text" } = {}) => <Field key={name} name={name} label={label} value={fields[name] ?? ""} error={state.errors[name]} onChange={value => edit(name, value)} {...options} />;
  const select = (name: string, label: string, choices: readonly (readonly [string, string])[]) => <div className={styles.field}><label htmlFor={`pricing-${name}`}>{label}</label><select id={`pricing-${name}`} value={fields[name] ?? ""} required aria-invalid={state.errors[name] ? true : undefined} aria-describedby={state.errors[name] ? `pricing-${name}-hint` : undefined} onChange={e => edit(name, e.target.value)}><option value="">انتخاب کنید</option>{choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>{state.errors[name] ? <p className={styles.fieldError} id={`pricing-${name}-hint`}>{state.errors[name]}</p> : null}</div>;
  return <div className={styles.workspace}>
    <form noValidate autoComplete="off" onSubmit={calculate} className={styles.form}>
      <div className={styles.field}><label htmlFor="pricing-method">روش محاسبه</label><select id="pricing-method" value={state.draft.method} onChange={e => edit("method", e.target.value)} aria-invalid={state.errors.method ? true : undefined} aria-describedby="pricing-method-hint" required><option value="">یک روش انتخاب کنید</option><option value="cost-plus">هزینهٔ واقعی + سود</option><option value="gram-sale">نرخ فروش هر گرم + افزوده‌ها</option></select><p id="pricing-method-hint" className={state.errors.method ? styles.fieldError : styles.hint}>{state.errors.method || "دو روش مستقل‌اند؛ انتخاب روش، سیاست قیمت این محاسبه را تعیین می‌کند."}</p></div>
      <Field name="policy_version" label="شناسهٔ نسخهٔ نرخ‌ها" mode="text" value={state.draft.policy_version} error={state.errors.policy_version} help="شناسهٔ داخلی با حروف لاتین و عدد؛ صرفاً برچسب این محاسبه است، نه تأیید نرخ‌ها." onChange={value => edit("policy_version", value)} />
      {state.draft.method === "cost-plus" ? <>
        <fieldset><legend>هزینه و سود</legend><div className={styles.grid}>
          {field("true_cost_rial", "هزینهٔ واقعی · ریال", { help: "جمع هزینهٔ تأییدشدهٔ قطعه؛ ریزهزینه‌ها هنوز در این فرم محاسبه نمی‌شوند." })}{field("mandatory_buffer_rial", "حاشیهٔ اطمینان · ریال")}
          {select("profit_method", "مبنای سود", [["margin", "حاشیهٔ سود از قیمت فروش"], ["markup", "افزایش روی هزینه"]])}{field("profit_percent", "سود · درصد", { mode: "decimal" })}
        </div></fieldset>
        <fieldset><legend>گردکردن و مالیات</legend><div className={styles.grid}>
          {select("rounding", "گردکردن مبلغ", [["none", "بدون گردکردن"], ["nearest", "نزدیک‌ترین مضرب"], ["up", "رو به بالا"], ["down", "رو به پایین"]])}
          {fields.rounding && fields.rounding !== "none" ? field("rounding_step_rial", "گام گردکردن · ریال") : null}
          {field("tax_percent", "نرخ مالیات · درصد", { mode: "decimal", help: "نرخ مصوب را خودتان وارد کنید؛ نرخ قانونی پیش‌فرضی تعیین نشده است." })}
        </div></fieldset>
        <details ref={overrideDetails} className={styles.details}><summary>تغییر مبلغ نهایی پیش از مالیات</summary><div className={styles.override}>
          {field("override_pre_tax_rial", "مبلغ جایگزین · ریال", { optional: true, help: "خالی بماند تا موتور از قیمت هدف استفاده کند. مبلغ زیر کف هزینه پذیرفته نمی‌شود." })}
          <div className={styles.field}><label htmlFor="pricing-override_reason">دلیل داخلی تغییر · اختیاری</label><textarea id="pricing-override_reason" maxLength={500} value={fields.override_reason ?? ""} onChange={e => edit("override_reason", e.target.value)} aria-describedby="pricing-override-reason-hint" /><p id="pricing-override-reason-hint" className={styles.hint}>برای مبلغ کمتر از قیمت هدف لازم است؛ به مشتری نمایش داده نمی‌شود.</p></div>
        </div></details>
      </> : null}
      {state.draft.method === "gram-sale" ? <>
        <p className={styles.notice}>در این روش مالیات تعیین نمی‌شود. هزینه‌ها را صریح وارد کنید؛ اگر هزینه‌ای وجود ندارد، صفر بنویسید.</p>
        <fieldset><legend>وزن و نرخ فروش</legend><div className={styles.grid}>{field("weight_g", "وزن · گرم", { mode: "decimal", help: "حداکثر سه رقم اعشار؛ مرز افزوده‌ها ۲ و ۴ گرم است." })}{field("rate_per_gram_rial", "نرخ فروش هر گرم · ریال", { help: "مبلغ پایه به واحد ده‌ریالی گرد می‌شود؛ در نیمه، به عدد زوج نزدیک‌تر می‌رود." })}</div></fieldset>
        <fieldset><legend>هزینه‌های افزوده</legend><div className={styles.grid}>{field("stone_count", "تعداد سنگ")}{gramFees.map(([name, label]) => field(name, `${label} · ریال`))}</div></fieldset>
      </> : null}
      {!enabled ? <p role="status" className={styles.notice}>اتصال موتور هنوز پیکربندی نشده است. می‌توانید ورودی‌ها را آماده کنید، اما محاسبه تا برقراری اتصال فعال نیست.</p> : null}
      {state.error ? <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><p>{state.error}</p>{state.errors.form ? <p>{state.errors.form}</p> : null}</div> : null}
      <div className={styles.actions}><button type="submit" disabled={!enabled || state.phase === "pending"}>{state.phase === "pending" ? "در حال محاسبه…" : "محاسبهٔ پیش‌نمایش"}</button><button type="button" onClick={reset}>پاک‌کردن فرم</button></div>
      <p className={styles.hint}>مبلغ‌ها همگی ریالی‌اند. پیش‌نمایش خودکار ذخیره نمی‌شود؛ ثبت خصوصی در پرونده، اقدام جداگانه‌ای است.</p>
    </form>
    <section className={styles.result} aria-labelledby="pricing-result-title" aria-busy={state.phase === "pending"}>
      {state.result ? <Result value={state.result} /> : <><p className={styles.kicker}>پیش‌نمایش خصوصی مدیر</p><h2 id="pricing-result-title">پیش از پیشنهاد قیمت،<br />محاسبه را بررسی کنیم.</h2><p className={styles.empty}>روش را انتخاب کنید و نرخ‌های بررسی‌شده را وارد کنید. نتیجهٔ معتبر اینجا ظاهر می‌شود؛ با تغییر هر ورودی، نتیجهٔ قبلی کنار می‌رود.</p></>}
      <p className={styles.status} role="status" aria-live="polite">{state.phase === "pending" ? "در انتظار موتور محاسبه؛ ویرایش ورودی‌ها این درخواست را لغو می‌کند." : state.phase === "ready" ? "پیش‌نمایش آماده است؛ ثبت در پرونده جداگانه انجام می‌شود." : ""}</p>
    </section>
    {inquiry ? <PricingCalculationRecords inquiry={inquiry} storageEnabled={storageEnabled} request={state.phase === "ready" ? state.request : null} preview={state.phase === "ready" ? state.result : null} /> : <p className={styles.hint}>برای ثبت محاسبه، ابتدا پرونده را از <Link href="/admin" className="underline underline-offset-4">میز بررسی</Link> انتخاب کنید. این صفحه به‌تنهایی فقط پیش‌نمایش می‌دهد.</p>}
  </div>;
}
