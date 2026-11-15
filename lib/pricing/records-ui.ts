import { z } from "zod";
import { parsePricingResponse, type PricingRequest, type PricingResponse } from "@/lib/pricing/contract";
import { parseCalculationRecord, type CalculationRecord } from "@/lib/pricing/records";

const savedSchema = z.object({ created: z.boolean(), record: z.unknown() }).strict();
export function parseSavedCalculation(value: unknown, inquiryId: string, request: PricingRequest) {
  const saved = savedSchema.safeParse(value);
  if (!saved.success) return { success: false as const };
  const record = parseCalculationRecord(saved.data.record, inquiryId);
  if (!record.success || !parsePricingResponse(record.data.snapshot, request).success) return { success: false as const };
  return { success: true as const, data: { created: saved.data.created, record: record.data } };
}
function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && sameValue(a[key], b[key]));
}
export function savedPreviewChanged(preview: PricingResponse, saved: PricingResponse) { return !sameValue(preview, saved); }

const pageSchema = z.object({ records: z.array(z.unknown()).max(20), next_before: z.number().int().min(1).max(10000).nullable() }).strict();
export function parseCalculationPage(value: unknown, inquiryId: string, before: number | null) {
  const page = pageSchema.safeParse(value);
  if (!page.success) return { success: false as const };
  const records: CalculationRecord[] = [], ids = new Set<string>(), requests = new Set<string>();
  let previous = before ?? 10001;
  for (const row of page.data.records) {
    const record = parseCalculationRecord(row, inquiryId);
    if (!record.success || record.data.revision >= previous || ids.has(record.data.id) || requests.has(record.data.snapshot.request_id)) return { success: false as const };
    previous = record.data.revision; ids.add(record.data.id); requests.add(record.data.snapshot.request_id); records.push(record.data);
  }
  if (page.data.next_before !== null && (records.length !== 20 || page.data.next_before !== records.at(-1)?.revision)) return { success: false as const };
  return { success: true as const, data: { records, next_before: page.data.next_before } };
}
export async function readRecordResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw Error("Invalid record response");
  let bytes = 0, body = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw Error("Record response limit");
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode(); return JSON.parse(body);
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export type SaveTarget = { request: PricingRequest; preview: PricingResponse };
type SaveState = { phase: "idle" | "pending" | "error" | "saved"; target: SaveTarget | null; record: CalculationRecord | null; error: string };
type HistoryState = { phase: "idle" | "loading" | "error" | "ready"; operation: number; before: number | null; records: CalculationRecord[]; next_before: number | null; error: string };
export function createRecordDesk(inquiryId: string): { inquiryId: string; save: SaveState; history: HistoryState } {
  return { inquiryId: inquiryId.toLowerCase(), save: { phase: "idle", target: null, record: null, error: "" }, history: { phase: "idle", operation: 0, before: null, records: [], next_before: null, error: "" } };
}
type RecordAction = { inquiryId: string } & (
  | { type: "save-start"; target: SaveTarget } | { type: "save-forget" }
  | { type: "save-success"; requestId: string; value: unknown } | { type: "save-failure"; requestId: string; status: number }
  | { type: "history-start"; operation: number; before: number | null }
  | { type: "history-success"; operation: number; value: unknown } | { type: "history-failure"; operation: number; status: number }
);
function failureText(status: number, save: boolean) {
  if (status === 401) return "نشست ورود پایان یافته است؛ دوباره وارد حساب مدیر شوید.";
  if (status === 403) return "دسترسی مدیریت تأیید نشد؛ حساب و دسترسی را بررسی کنید.";
  if (status === 409) return "نسخه یا وضعیت پرونده تغییر کرده است؛ تاریخچه و پرونده را دوباره بررسی کنید.";
  if (status === 422 || status === 400) return "محاسبه پذیرفته نشد؛ ورودی‌ها و دلیل تغییر مبلغ را بررسی کنید.";
  return save ? "ثبت تأیید نشد؛ ممکن است انجام شده باشد. برای بررسی یا تلاش دوباره، همین درخواست نگه داشته شده است." : "تاریخچه دریافت نشد؛ اتصال و دسترسی را بررسی و دوباره تلاش کنید.";
}
export function recordDeskReducer(state: ReturnType<typeof createRecordDesk>, action: RecordAction): ReturnType<typeof createRecordDesk> {
  if (action.inquiryId.toLowerCase() !== state.inquiryId) return state;
  if (action.type === "save-start") {
    if (state.save.phase === "pending" || (state.save.phase === "error" && !sameValue(state.save.target, action.target)) || !parsePricingResponse(action.target.preview, action.target.request).success) return state;
    return { ...state, save: { phase: "pending", target: action.target, record: null, error: "" } };
  }
  if (action.type === "save-forget") return state.save.phase === "pending" ? state : { ...state, save: { phase: "idle", target: null, record: null, error: "" } };
  if (action.type === "save-success" || action.type === "save-failure") {
    if (state.save.phase !== "pending" || state.save.target?.request.request_id !== action.requestId) return state;
    if (action.type === "save-success") {
      const saved = parseSavedCalculation(action.value, state.inquiryId, state.save.target.request);
      if (saved.success) return { ...state, save: { ...state.save, phase: "saved", record: saved.data.record, error: "" } };
    }
    return { ...state, save: { ...state.save, phase: "error", error: failureText(action.type === "save-failure" ? action.status : 503, true) } };
  }
  if (action.type === "history-start") return action.operation <= state.history.operation ? state : { ...state, history: { phase: "loading", operation: action.operation, before: action.before, records: [], next_before: null, error: "" } };
  if (state.history.phase !== "loading" || state.history.operation !== action.operation) return state;
  if (action.type === "history-success") {
    const page = parseCalculationPage(action.value, state.inquiryId, state.history.before);
    if (page.success) return { ...state, history: { ...state.history, phase: "ready", ...page.data, error: "" } };
  }
  return { ...state, history: { ...state.history, phase: "error", error: failureText(action.type === "history-failure" ? action.status : 503, false) } };
}
