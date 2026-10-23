import type { SupabaseClient } from "@supabase/supabase-js";
import { parseQuoteSnapshot, type QuoteSnapshot } from "@/lib/commerce/quote-snapshot";

export type CustomerQuoteDTO = {
  id: string; document_id: string; inquiry_id: string; source_quote_no: string; source_order_no: string; source_revision: number;
  payload: QuoteSnapshot; published_at: string; withdrawn_at: string | null;
};
export async function readInquiryQuotes(client: SupabaseClient, inquiryIds: string[]): Promise<{ data: CustomerQuoteDTO[]; error: boolean }> {
  if (!inquiryIds.length) return { data: [], error: false };
  try {
    const { data, error } = await client.from("customer_inquiry_quotes")
      .select("id,document_id,inquiry_id,payload,published_at,withdrawn_at").in("inquiry_id", inquiryIds).order("published_at", { ascending: false });
    if (error) return { data: [], error: true };
    const quotes: CustomerQuoteDTO[] = [];
    for (const row of data ?? []) {
      const parsed = parseQuoteSnapshot(row.payload);
      if (!parsed.success || typeof row.id !== "string" || typeof row.document_id !== "string" || !row.document_id || !inquiryIds.includes(row.inquiry_id) || !Number.isFinite(Date.parse(row.published_at)) || (row.withdrawn_at !== null && !Number.isFinite(Date.parse(row.withdrawn_at)))) return { data: [], error: true };
      quotes.push({ id: row.id, document_id: row.document_id, inquiry_id: row.inquiry_id, source_quote_no: parsed.value.source_quote_no, source_order_no: parsed.value.source_order_no, source_revision: parsed.value.source_revision,
        payload: parsed.value, published_at: row.published_at, withdrawn_at: row.withdrawn_at });
    }
    return { data: quotes, error: false };
  } catch { return { data: [], error: true }; }
}
