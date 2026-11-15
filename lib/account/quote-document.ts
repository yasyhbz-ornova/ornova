import type { SupabaseClient } from "@supabase/supabase-js";
import { readInquiryQuotes, type CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isQuoteDocumentId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

type QuoteDocumentResult =
  | { kind: "ready"; quote: CustomerQuoteDTO; isPreviousVersion: boolean; checkedAt: string }
  | { kind: "not-found" }
  | { kind: "unavailable" };

/** Session-scoped client only. Staff membership alone does not grant this customer route. */
export async function readCustomerQuoteDocument(client: SupabaseClient, context: { ownerId: string; inquiryId: string; quoteId: string }): Promise<QuoteDocumentResult> {
  if (![context.ownerId, context.inquiryId, context.quoteId].every(isQuoteDocumentId)) return { kind: "not-found" };
  const ownerId = context.ownerId.toLowerCase(), inquiryId = context.inquiryId.toLowerCase(), quoteId = context.quoteId.toLowerCase();
  try {
    const { data: inquiry, error } = await client.from("inquiries").select("id,user_id").eq("id", inquiryId).eq("user_id", ownerId).maybeSingle();
    if (error) return { kind: "unavailable" };
    if (!inquiry || inquiry.id !== inquiryId || inquiry.user_id !== ownerId) return { kind: "not-found" };
    const quotes = await readInquiryQuotes(client, [inquiryId]);
    if (quotes.error) return { kind: "unavailable" };
    const quote = quotes.data.find(row => row.id === quoteId && row.inquiry_id === inquiryId);
    if (!quote) return { kind: "not-found" };
    return {
      kind: "ready", quote,
      isPreviousVersion: quotes.data.some(row => row.document_id === quote.document_id && row.source_revision > quote.source_revision),
      checkedAt: new Date().toISOString(),
    };
  } catch { return { kind: "unavailable" }; }
}
