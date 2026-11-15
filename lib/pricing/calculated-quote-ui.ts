import { z } from "zod";
import { parseRialInput } from "@/lib/commerce/quote-money";
import { validateQuoteDates, type QuoteSnapshot } from "@/lib/commerce/quote-snapshot";
import { parseCalculatedQuoteRequest, projectQuoteFromBasis, type CalculationQuoteBasis, type CalculatedQuoteRequest } from "@/lib/pricing/calculated-quote";

export type CalculatedQuoteFields = { source_quote_no: string; source_order_no: string; source_revision: string; issued_at: string; valid_until: string; description: string; quantity: string; tax_rial: string };
export type ReviewedCalculatedQuote = { request: CalculatedQuoteRequest; quote: QuoteSnapshot; reviewedAt: string };
function localIso(value: string): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!parts) return null;
  const date = new Date(value), [, y, m, d, h, min] = parts;
  // Reject rolled calendar dates and daylight-saving gaps rather than changing them.
  if (!Number.isFinite(date.getTime()) || date.getFullYear() !== Number(y) || date.getMonth() + 1 !== Number(m) || date.getDate() !== Number(d) || date.getHours() !== Number(h) || date.getMinutes() !== Number(min)) return null;
  return date.toISOString();
}
export function buildCalculatedQuoteDraft(basis: CalculationQuoteBasis, fields: CalculatedQuoteFields, now: string) {
  const errors: Partial<Record<keyof CalculatedQuoteFields, string>> = {};
  for (const key of ["source_quote_no", "source_order_no", "description"] as const) {
    if (!fields[key].trim() || fields[key].trim().length > (key === "description" ? 240 : 80) || /[<>]|(?:javascript|data)\s*:/i.test(fields[key])) errors[key] = "متن روشن و معتبر وارد کنید.";
  }
  const quantity = parseRialInput(fields.quantity), revision = parseRialInput(fields.source_revision);
  if (quantity === null || BigInt(quantity) < BigInt(1) || BigInt(quantity) > BigInt(1000)) errors.quantity = "تعداد صحیح بین ۱ تا ۱۰۰۰ وارد کنید.";
  if (revision === null || BigInt(revision) < BigInt(1) || BigInt(revision) > BigInt(10000)) errors.source_revision = "نسخهٔ صحیح بین ۱ تا ۱۰۰۰۰ وارد کنید.";
  const issued = localIso(fields.issued_at), until = localIso(fields.valid_until);
  if (!issued) errors.issued_at = "تاریخ و ساعت معتبر وارد کنید.";
  if (!until) errors.valid_until = "تاریخ و ساعت معتبر وارد کنید.";
  const tax = basis.method === "gram-sale" ? parseRialInput(fields.tax_rial) : null;
  if (basis.method === "gram-sale" && tax === null) errors.tax_rial = "مبلغ مالیات را صریح وارد کنید؛ حتی اگر صفر است.";
  const fail = (error: string) => ({ success: false as const, errors, error });
  if (Object.keys(errors).length) return fail("بخش‌های مشخص‌شده را اصلاح کنید؛ هنوز پیشنهادی آماده نشده است.");
  const request = parseCalculatedQuoteRequest({ calculation_id: basis.id, source_quote_no: fields.source_quote_no, source_order_no: fields.source_order_no, source_revision: Number(revision), issued_at: issued, valid_until: until, description: fields.description, quantity: Number(quantity), tax_rial: tax });
  if (!request.success) return fail("اطلاعات سند یا ترتیب تاریخ‌ها معتبر نیست؛ دوباره بررسی کنید.");
  const quote = projectQuoteFromBasis(basis, request.data);
  if (!quote.success) return fail(quote.error);
  if (!validateQuoteDates(quote.value, new Date(now))) {
    if (Date.parse(quote.value.issued_at) > Date.parse(now)) errors.issued_at = "زمان صدور نباید در آینده باشد.";
    if (Date.parse(quote.value.valid_until) <= Date.parse(now)) errors.valid_until = "پایان اعتبار باید بعد از اکنون باشد.";
    return fail("زمان صدور یا اعتبار گذشته است؛ تاریخ‌ها را بازبینی کنید.");
  }
  return { success: true as const, request: request.data, quote: quote.value, reviewedAt: now };
}
const receiptSchema = z.object({ id: z.string().uuid(), created: z.boolean() }).strict();
type State = { inquiryId: string; basis: CalculationQuoteBasis; fields: CalculatedQuoteFields; phase: "editing" | "reviewing" | "pending" | "uncertain" | "saved"; reviewed: ReviewedCalculatedQuote | null; target: ReviewedCalculatedQuote | null; operation: number; receipt: z.infer<typeof receiptSchema> | null; errors: Partial<Record<keyof CalculatedQuoteFields, string>>; error: string };
export function createCalculatedQuoteEditor(inquiryId: string, basis: CalculationQuoteBasis): State {
  return { inquiryId, basis, fields: { source_quote_no: "", source_order_no: "", source_revision: "", issued_at: "", valid_until: "", description: "", quantity: "", tax_rial: "" }, phase: "editing", reviewed: null, target: null, operation: 0, receipt: null, errors: {}, error: "" };
}
type Action = { type: "edit"; field: keyof CalculatedQuoteFields; value: string } | { type: "review"; now: string } | { type: "start"; operation: number } | { type: "resolved"; operation: number; value: unknown } | { type: "failed"; operation: number; status: number } | { type: "abandon" } | { type: "expired" };
const uncertain = (status: number) => `${status === 401 ? "نشست مدیر پایان یافته است. " : status === 403 ? "دسترسی مدیریت تأیید نشد. " : status === 409 ? "نسخه یا وضعیت پرونده سازگار نیست. " : ""}ثبت تأیید نشد؛ ممکن است انجام شده باشد. همین اطلاعات برای بررسی یا تلاش دوباره نگه داشته شده است.`;
export function calculatedQuoteEditorReducer(state: State, action: Action): State {
  if (action.type === "edit") return ["editing", "reviewing"].includes(state.phase) ? { ...state, phase: "editing", reviewed: null, fields: { ...state.fields, [action.field]: action.value }, errors: {}, error: "" } : state;
  if (action.type === "review") {
    if (!["editing", "reviewing"].includes(state.phase)) return state;
    const built = buildCalculatedQuoteDraft(state.basis, state.fields, action.now);
    return built.success ? { ...state, phase: "reviewing", reviewed: { request: built.request, quote: built.quote, reviewedAt: built.reviewedAt }, errors: {}, error: "" } : { ...state, phase: "editing", reviewed: null, errors: built.errors, error: built.error };
  }
  if (action.type === "expired") return state.phase === "reviewing" ? { ...state, phase: "editing", reviewed: null, error: "اعتبار پیش‌نمایش گذشته است؛ تاریخ‌ها را اصلاح و دوباره بازبینی کنید." } : state;
  if (action.type === "abandon") return state.phase === "uncertain" ? { ...state, phase: "editing", target: null, reviewed: null, errors: {}, error: "کنارگذاشتن، ثبت احتمالی را حذف نمی‌کند؛ پیش از پیشنهاد تازه، پرونده را بررسی کنید." } : state;
  if (action.type === "start") {
    const target = state.phase === "uncertain" ? state.target : state.phase === "reviewing" ? state.reviewed : null;
    return target && action.operation > state.operation ? { ...state, phase: "pending", target, operation: action.operation, error: "" } : state;
  }
  if (state.phase !== "pending" || action.operation !== state.operation) return state;
  if (action.type === "resolved") {
    const parsed = receiptSchema.safeParse(action.value);
    if (parsed.success) return { ...state, phase: "saved", receipt: parsed.data, error: "" };
  }
  return { ...state, phase: "uncertain", error: uncertain(action.type === "failed" ? action.status : 503) };
}
