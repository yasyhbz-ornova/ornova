import { parseProductPreferences, productConfigurationKey, productPreferenceRows, type ProductPreferences } from "./product-preferences";

export type RequestItem = {
  lineId?: string;
  slug: string;
  name: string;
  category: string;
  quantity: number;
  note?: string;
  preferences?: ProductPreferences;
};

export const MAX_REQUEST_ITEM_NOTE_LENGTH = 320;
export const REQUEST_BASKET_STORAGE_KEY = "ornova-request-basket:v2";
export const LEGACY_REQUEST_BASKET_STORAGE_KEY = "ornova-request-basket";
const MAX_INQUIRY_MESSAGE_LENGTH = 5000;
export const REQUEST_LINE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getRequestItemKey(item: Pick<RequestItem, "lineId" | "slug">) {
  return item.lineId ?? item.slug;
}

export function readRequestBasketSnapshot(storage: Pick<Storage, "getItem">): string {
  return storage.getItem(REQUEST_BASKET_STORAGE_KEY) ?? storage.getItem(LEGACY_REQUEST_BASKET_STORAGE_KEY) ?? "[]";
}

export function normalizeBasketNote(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function getRequestItemReviewNote(value?: string) {
  const note = normalizeBasketNote(value ?? "");
  return note || null;
}

export function parseRequestItems(value: unknown): RequestItem[] {
  if (!Array.isArray(value)) return [];
  const keys = new Set<string>();
  return value.flatMap((entry): RequestItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<RequestItem>;
    if (
      typeof candidate.slug !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.category !== "string" ||
      !Number.isInteger(candidate.quantity) ||
      candidate.quantity! < 1 ||
      candidate.quantity! > 20
    ) return [];
    if (candidate.lineId !== undefined && (typeof candidate.lineId !== "string" || !REQUEST_LINE_ID_PATTERN.test(candidate.lineId))) return [];
    const key = candidate.lineId ?? candidate.slug;
    if (keys.has(key)) return [];

    const preferences = parseProductPreferences(candidate.preferences, candidate.category === "انگشتر");
    if (!preferences.success) return [];
    keys.add(key);
    return [{
      ...(candidate.lineId ? { lineId: candidate.lineId } : {}),
      slug: candidate.slug,
      name: candidate.name,
      category: candidate.category,
      quantity: candidate.quantity!,
      ...(typeof candidate.note === "string" ? { note: candidate.note } : {}),
      ...(preferences.value ? { preferences: preferences.value } : {}),
    }];
  }).slice(0, 50);
}

export function updateRequestItemNote(items: RequestItem[], key: string, note: string) {
  return items.map((item) => {
    if (getRequestItemKey(item) !== key) return item;
    if (!note) {
      const withoutNote = { ...item };
      delete withoutNote.note;
      return withoutNote;
    }
    return { ...item, note };
  });
}

export function parseRequestBasketReview(serialized: string): { valid: boolean; items: RequestItem[] } {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value) || value.length > 50) return { valid: false, items: [] };
    const keys = ["lineId", "slug", "name", "category", "quantity", "note", "preferences"];
    if (value.some((row) => !row || typeof row !== "object" || Array.isArray(row)
      || Object.keys(row).some((key) => !keys.includes(key))
      || (row.note !== undefined && typeof row.note !== "string"))) return { valid: false, items: [] };
    const items = parseRequestItems(value);
    return items.length === value.length ? { valid: true, items } : { valid: false, items: [] };
  } catch { return { valid: false, items: [] }; }
}

export function mergeRequestDraftItems(currentItems: RequestItem[], draft: unknown) {
  const extra: RequestItem[] = [];
  for (const item of parseRequestItems(draft)) {
    if (![...currentItems, ...extra].some((current) => getRequestItemKey(current) === getRequestItemKey(item) || productConfigurationKey(current.slug, current.preferences) === productConfigurationKey(item.slug, item.preferences))) extra.push(item);
  }
  const available = Math.max(0, 50 - currentItems.length);
  return { items: [...currentItems, ...extra.slice(0, available)], omitted: Math.max(0, extra.length - available) };
}

export function buildInquiryMessage(customerMessage: string, items: RequestItem[]) {
  const noteLines: string[] = [];
  for (const item of items) {
    const note = getRequestItemReviewNote(item.note);
    if (!note) continue;
    if (note.length > MAX_REQUEST_ITEM_NOTE_LENGTH) {
      return { success: false as const, error: "یادداشت هر قطعه نباید بیشتر از ۳۲۰ نویسه باشد." };
    }
    const choices = productPreferenceRows(item.preferences).map((row) => `${row.label}: ${row.value}`).join("، ");
    noteLines.push(`- ${item.name}${choices ? ` (${choices})` : ""}: ${note}`);
  }

  const value = [
    customerMessage.trim(),
    noteLines.length ? `یادداشت برای بررسی هر قطعه:\n${noteLines.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  if (value.length > MAX_INQUIRY_MESSAGE_LENGTH) {
    return { success: false as const, error: "متن درخواست و یادداشت‌ها بیش از اندازه طولانی است؛ یادداشت‌ها را کوتاه‌تر کنید." };
  }

  return { success: true as const, value };
}
