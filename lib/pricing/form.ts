import { parseRialInput, isCanonicalRial } from "@/lib/commerce/quote-money";
import { parsePricingRequest, parsePricingResponse, type PricingRequest, type PricingResponse } from "@/lib/pricing/contract";

export type PricingDraft = { method: "" | PricingRequest["method"]; policy_version: string; fields: Record<string, string> };
export function createPricingDraft(): PricingDraft { return { method: "", policy_version: "", fields: {} }; }
type FormErrors = Record<string, string>;

// Unit conversion only: no floating point and no price calculation in the browser.
function scaled(text: string, places: number): string | null {
  const normalized = text.trim().replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g, ".");
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(normalized) || normalized.length > 30) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const value = (BigInt(whole) * BigInt(10 ** places) + BigInt(fraction.padEnd(places, "0"))).toString();
  return isCanonicalRial(value) ? value : null;
}

export function buildPricingRequest(draft: PricingDraft, requestId: string): { success: true; request: PricingRequest } | { success: false; errors: FormErrors } {
  const errors: FormErrors = {}, fields = draft.fields;
  function money(key: string, positive = false) {
    const value = parseRialInput(fields[key] ?? "");
    if (value === null || (positive && value === "0")) errors[key] = positive ? "عدد صحیح بزرگ‌تر از صفر وارد کنید." : "مبلغ صحیح ریالی وارد کنید؛ اگر هزینه‌ای ندارد، صفر بنویسید.";
    return value;
  }
  function percent(key: string, max: number) {
    const value = scaled(fields[key] ?? "", 2);
    if (value === null || BigInt(value) > BigInt(max)) { errors[key] = "درصد معتبر با حداکثر دو رقم اعشار وارد کنید."; return null; }
    return Number(value); // Bounded basis points, never a money amount.
  }
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(draft.policy_version.trim())) errors.policy_version = "شناسهٔ نسخه را با حروف لاتین، عدد، خط تیره، نقطه یا زیرخط وارد کنید؛ حداکثر ۸۰ نویسه.";
  let input: unknown;
  if (draft.method === "cost-plus") {
    if (!["margin", "markup"].includes(fields.profit_method)) errors.profit_method = "روش سود را انتخاب کنید.";
    if (!["none", "nearest", "up", "down"].includes(fields.rounding)) errors.rounding = "روش گردکردن را انتخاب کنید.";
    const reason = (fields.override_reason ?? "").trim();
    if (reason.length > 500) errors.override_reason = "دلیل تغییر حداکثر ۵۰۰ نویسه باشد.";
    input = {
      true_cost_rial: money("true_cost_rial", true), mandatory_buffer_rial: money("mandatory_buffer_rial"),
      profit_method: fields.profit_method, profit_bp: percent("profit_percent", fields.profit_method === "margin" ? 9999 : 2147473647),
      rounding: fields.rounding, rounding_step_rial: fields.rounding === "none" ? "0" : money("rounding_step_rial", true),
      tax_bp: percent("tax_percent", 10000),
      override_pre_tax_rial: (fields.override_pre_tax_rial ?? "").trim() ? money("override_pre_tax_rial", true) : null,
      override_reason: reason || null,
    };
  } else if (draft.method === "gram-sale") {
    const weight = scaled(fields.weight_g ?? "", 3);
    if (weight === null || weight === "0") errors.weight_g = "وزن مثبت به گرم با حداکثر سه رقم اعشار وارد کنید.";
    const count = parseRialInput(fields.stone_count ?? "");
    if (count === null || BigInt(count) > BigInt(2147483647)) errors.stone_count = "تعداد صحیح از صفر تا ۲٬۱۴۷٬۴۸۳٬۶۴۷ وارد کنید.";
    input = {
      weight_mg: weight, rate_per_gram_rial: money("rate_per_gram_rial", true),
      under_2g_fee_rial: money("under_2g_fee_rial"), under_4g_fee_rial: money("under_4g_fee_rial"),
      stone_total_rial: money("stone_total_rial"), stone_count: count !== null && !errors.stone_count ? Number(count) : null,
      setting_per_stone_rial: money("setting_per_stone_rial"), packaging_rial: money("packaging_rial"),
      logistics_rial: money("logistics_rial"), design_rial: money("design_rial"),
    };
  } else errors.method = "یکی از دو روش محاسبه را انتخاب کنید.";
  if (Object.keys(errors).length) return { success: false, errors };
  const parsed = parsePricingRequest({ schema_version: 1, request_id: requestId, method: draft.method, policy_version: draft.policy_version.trim(), input });
  return parsed.success ? { success: true, request: parsed.data } : { success: false, errors: { form: "ورودی‌های محاسبه معتبر نیستند؛ مقادیر و انتخاب‌ها را دوباره بررسی کنید." } };
}

type PricingFormState = {
  draft: PricingDraft; phase: "idle" | "pending" | "ready" | "error";
  request: PricingRequest | null; result: PricingResponse | null; error: string; errors: FormErrors;
};
export function initialPricingForm(): PricingFormState { return { draft: createPricingDraft(), phase: "idle", request: null, result: null, error: "", errors: {} }; }
export type PricingFormAction =
  | { type: "edit"; field: string; value: string } | { type: "reset" }
  | { type: "invalid"; errors: FormErrors } | { type: "start"; request: PricingRequest }
  | { type: "resolve"; requestId: string; value: unknown } | { type: "failure"; requestId: string; status: number };

export function pricingFormReducer(state: PricingFormState, action: PricingFormAction): PricingFormState {
  if (action.type === "reset") return initialPricingForm();
  if (action.type === "edit") {
    const draft = { ...state.draft, fields: { ...state.draft.fields } };
    if (action.field === "method") draft.method = action.value === "cost-plus" || action.value === "gram-sale" ? action.value : "";
    else if (action.field === "policy_version") draft.policy_version = action.value;
    else draft.fields[action.field] = action.value;
    return { ...initialPricingForm(), draft };
  }
  if (action.type === "invalid") return { ...state, phase: "error", request: null, result: null, errors: action.errors, error: "ورودی‌های مشخص‌شده را اصلاح کنید؛ اطلاعات فرم حفظ شده است." };
  if (action.type === "start") return { ...state, phase: "pending", request: action.request, result: null, errors: {}, error: "" };
  if (state.phase !== "pending" || state.request?.request_id !== action.requestId) return state;
  if (action.type === "resolve") {
    const result = parsePricingResponse(action.value, state.request);
    return result.success ? { ...state, phase: "ready", result: result.data } : { ...state, phase: "error", result: null, error: "پاسخ محاسبه با ورودی‌ها سازگار نیست؛ دوباره محاسبه کنید." };
  }
  const error = action.status === 401 ? "نشست ورود پایان یافته است؛ دوباره وارد حساب مدیر شوید و محاسبه را تکرار کنید."
    : action.status === 403 ? "دسترسی مدیریت تأیید نشد؛ حساب و دسترسی خود را بررسی کنید."
    : action.status === 422 ? "محاسبه پذیرفته نشد؛ مبلغ‌ها، حداقل قیمت و دلیل تغییر قیمت را بررسی کنید."
    : "موتور محاسبه در دسترس نیست؛ اطلاعات فرم حفظ شده است. اتصال را بررسی و دوباره تلاش کنید.";
  return { ...state, phase: "error", result: null, error };
}
