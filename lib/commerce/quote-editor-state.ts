import { parseQuoteSnapshot, validateQuoteDates, type QuoteSnapshot } from "./quote-snapshot";
export type QuoteEditorState = { inquiryId: string; phase: "editing" | "reviewing" | "pending" | "saved"; reviewed: QuoteSnapshot | null; error: string | null; receiptId: string | null };
export type QuoteEditorAction = { type: "edit" } | { type: "publish" } | { type: "review"; payload: unknown; now: string } | { type: "success"; inquiryId: string; id: string } | { type: "failure"; inquiryId: string; error: string };
export function createQuoteEditorState(inquiryId: string): QuoteEditorState { return { inquiryId, phase: "editing", reviewed: null, error: null, receiptId: null }; }
export function quoteEditorReducer(state: QuoteEditorState, action: QuoteEditorAction): QuoteEditorState {
  if (action.type === "edit") return state.phase === "pending" ? state : createQuoteEditorState(state.inquiryId);
  if (action.type === "review") {
    if (state.phase === "pending") return state;
    const parsed = parseQuoteSnapshot(action.payload);
    if (!parsed.success || !validateQuoteDates(parsed.value, new Date(action.now))) return { ...state, phase: "editing", reviewed: null, error: parsed.success ? "تاریخ صدور یا پایان اعتبار معتبر نیست." : parsed.error };
    return { ...state, phase: "reviewing", reviewed: parsed.value, error: null, receiptId: null };
  }
  if (action.type === "publish") return state.phase === "reviewing" && state.reviewed ? { ...state, phase: "pending", error: null } : state;
  if (state.phase !== "pending" || action.inquiryId !== state.inquiryId) return state;
  if (action.type === "failure") return { ...state, phase: "reviewing", error: action.error };
  return { ...state, phase: "saved", reviewed: null, receiptId: action.id, error: null };
}
