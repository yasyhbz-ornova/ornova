import type { RequestItem } from "@/lib/commerce/request-basket";

type ReceiptItem = Pick<RequestItem, "lineId" | "slug" | "name" | "quantity" | "preferences"> & { note?: string };

export type InquiryReceipt = {
  id: string;
  items: ReceiptItem[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeReceiptNote(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function createInquiryReceipt(response: unknown, items: RequestItem[]): InquiryReceipt | null {
  if (!response || typeof response !== "object" || !("id" in response)) return null;

  const id = response.id;
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) return null;

  return {
    id,
    items: items.map(({ lineId, slug, name, quantity, note, preferences }) => {
      const summary = { ...(lineId ? { lineId } : {}), slug, name, quantity, ...(preferences ? { preferences: { ...preferences } } : {}) };
      const normalizedNote = normalizeReceiptNote(note ?? "");
      return normalizedNote ? { ...summary, note: normalizedNote } : summary;
    }),
  };
}
