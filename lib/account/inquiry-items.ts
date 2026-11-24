import type { SupabaseClient } from "@supabase/supabase-js";

export type InquiryItemRow = { inquiry_id: string; product_name: string; quantity: number; preferences?: unknown };
type ReceiptItemRow = InquiryItemRow & { id: string; product_slug: string };
type ItemResult<Row> = { data: Row[] | null; error: { code?: string; message?: string } | null };

export function readInquiryItems(client: Pick<SupabaseClient, "from">, ids: string[], includeReceiptIdentity: true): Promise<ItemResult<ReceiptItemRow>>;
export function readInquiryItems(client: Pick<SupabaseClient, "from">, ids: string[]): Promise<ItemResult<InquiryItemRow>>;
export async function readInquiryItems(client: Pick<SupabaseClient, "from">, ids: string[], includeReceiptIdentity = false): Promise<ItemResult<InquiryItemRow>> {
  const columns = includeReceiptIdentity ? "id,product_slug,inquiry_id,product_name,quantity" : "inquiry_id,product_name,quantity";
  const result = await client.from("inquiry_items").select(`${columns},preferences`).in("inquiry_id", ids);
  // Only an absent new column allows legacy reads; never mask access failures.
  if (result.error && ["42703", "PGRST204"].includes(result.error.code) && result.error.message.includes("preferences")) {
    const legacy = await client.from("inquiry_items").select(columns).in("inquiry_id", ids);
    return { data: legacy.data as unknown as InquiryItemRow[] | null, error: legacy.error };
  }
  return { data: result.data as unknown as InquiryItemRow[] | null, error: result.error };
}
