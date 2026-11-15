import type { SupabaseClient } from "@supabase/supabase-js";

export type InquiryItemRow = { inquiry_id: string; product_name: string; quantity: number; preferences?: unknown };

export async function readInquiryItems(client: Pick<SupabaseClient, "from">, ids: string[]): Promise<{ data: InquiryItemRow[] | null; error: { code?: string; message?: string } | null }> {
  const result = await client.from("inquiry_items").select("inquiry_id,product_name,quantity,preferences").in("inquiry_id", ids);
  // Only an absent new column allows legacy reads; never mask access failures.
  if (result.error && ["42703", "PGRST204"].includes(result.error.code) && result.error.message.includes("preferences")) {
    return client.from("inquiry_items").select("inquiry_id,product_name,quantity").in("inquiry_id", ids);
  }
  return result;
}
