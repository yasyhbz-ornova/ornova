import type { SupabaseClient } from "@supabase/supabase-js";
import { visibleGalleryRenders } from "@/lib/constants/gallery-renders";
import type { InquiryReceipt } from "@/lib/commerce/inquiry-receipt";
import { parseProductPreferences } from "@/lib/commerce/product-preferences";
import { readInquiryItems } from "./inquiry-items";
import { readInquiryQuotes } from "./inquiry-quotes";
import { isQuoteDocumentId } from "./quote-document";

export type ReceiptSummary = { id: string; status: string; created_at: string };
export type ReceiptList = { receipts: ReceiptSummary[]; hasMore: boolean };
type ReceiptPrice =
  | { kind: "accepted"; quoteId: string; totalRial: string }
  | { kind: "pending" }
  | { kind: "unavailable" };

export type ReceiptDetail = {
  receipt: InquiryReceipt;
  archiveTitle: string | null;
  archiveNumber: string | null;
  registeredAt: string;
  status: string;
  price: ReceiptPrice;
};

const previousArchiveTitles: Readonly<Record<string, string>> = {
  "02": "آویز دندان",
  "18": "سنجاق‌سینهٔ مدور با نقش بادبان",
};

function readArchiveReference(message: string) {
  const [reference] = message.split("\n\n", 1);
  const match = /^درخواست سفارش اثر آرشیو «([^\r\n]+)» \(عکس ([0-9]{2})\)$/u.exec(reference);
  if (!match) return null;
  const [, title, number] = match;
  const archive = visibleGalleryRenders.find((photo) => photo.number === number);
  if (!archive || (title !== archive.title && title !== previousArchiveTitles[number])) return null;
  return { title, number };
}

export async function readInquiryReceipt(
  client: SupabaseClient,
  inquiry: ReceiptSummary & { message: string },
): Promise<ReceiptDetail | null> {
  const [itemResult, quoteResult] = await Promise.all([
    readInquiryItems(client, [inquiry.id], true),
    readInquiryQuotes(client, [inquiry.id]),
  ]);
  if (itemResult.error) return null;

  const items = (itemResult.data ?? []).map((item) => {
    const preferences = parseProductPreferences(item.preferences, true);
    return {
      lineId: item.id,
      slug: item.product_slug,
      name: item.product_name,
      quantity: item.quantity,
      ...(preferences.success && preferences.value ? { preferences: preferences.value } : {}),
    };
  });

  const accepted = quoteResult.data.find((quote) =>
    isQuoteDocumentId(quote.id) && quote.accepted_at && !quote.withdrawn_at &&
    !quoteResult.data.some((revision) => revision.document_id === quote.document_id && revision.source_revision > quote.source_revision),
  );
  const price: ReceiptPrice = quoteResult.error ? { kind: "unavailable" }
    : accepted ? { kind: "accepted", quoteId: accepted.id, totalRial: accepted.payload.total_rial }
    : { kind: "pending" };
  const archive = items.length ? null : readArchiveReference(inquiry.message);

  return {
    receipt: { id: inquiry.id, items },
    archiveTitle: archive?.title ?? null,
    archiveNumber: archive?.number ?? null,
    registeredAt: inquiry.created_at,
    status: inquiry.status,
    price,
  };
}
