import type { SupabaseClient } from "@supabase/supabase-js";
import { visibleGalleryRenders } from "@/lib/constants/gallery-renders";
import type { InquiryReceipt } from "@/lib/commerce/inquiry-receipt";
import { parseProductPreferences } from "@/lib/commerce/product-preferences";
import { readInquiryItems } from "./inquiry-items";
import { readInquiryQuotes } from "./inquiry-quotes";
import { isQuoteDocumentId } from "./quote-document";

type ReceiptRecord = { id: string; status: string; created_at: string; message: string };
export type ReceiptSummary = Omit<ReceiptRecord, "message"> & {
  workName: string | null;
  additionalWorks: number;
  archiveNumber: string | null;
};
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

export async function readReceiptSummaries(client: SupabaseClient, inquiries: ReceiptRecord[]): Promise<ReceiptSummary[]> {
  if (!inquiries.length) return [];

  const { data, error } = await readInquiryItems(client, inquiries.map(({ id }) => id), true);
  const worksByInquiry = new Map<string, Map<string, string>>();
  for (const item of error ? [] : data ?? []) {
    const works = worksByInquiry.get(item.inquiry_id) ?? new Map<string, string>();
    works.set(item.product_slug, item.product_name);
    worksByInquiry.set(item.inquiry_id, works);
  }

  return inquiries.map(({ id, status, created_at, message }) => {
    const works = worksByInquiry.get(id);
    const archive = error || works ? null : readArchiveReference(message);
    return {
      id,
      status,
      created_at,
      workName: archive?.title ?? works?.values().next().value ?? null,
      additionalWorks: works ? works.size - 1 : 0,
      archiveNumber: archive?.number ?? null,
    };
  });
}

export async function readInquiryReceipt(
  client: SupabaseClient,
  inquiry: ReceiptRecord,
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
