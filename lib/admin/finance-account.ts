import type { SupabaseClient } from "@supabase/supabase-js";
import { isCanonicalRial } from "@/lib/commerce/quote-money";

export type FinancePayment = { id: string; amountRial: string; reference: string; paidAt: string; note: string | null; recordedAt: string; reversedAt: string | null; reversalReason: string | null };
export type FinanceAccount = { inquiryId: string; quoteNo: string; orderNo: string; revision: number; acceptedAt: string; amountRial: string; receivedRial: string; balanceRial: string; customerName: string; payments: FinancePayment[] };
const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

export async function readFinanceAccount(client: SupabaseClient, inquiryId: string): Promise<FinanceAccount | null> {
  const { data: quotes, error: quoteError } = await client.from("customer_inquiry_quotes")
    .select("inquiry_id,source_quote_no,source_order_no,source_revision,accepted_at,accepted_total_rial")
    .eq("inquiry_id", inquiryId).not("accepted_at", "is", null).limit(2);
  if (quoteError || !Array.isArray(quotes) || quotes.length !== 1) return null;
  const quote = quotes[0];
  if (quote.inquiry_id !== inquiryId || typeof quote.source_quote_no !== "string" || typeof quote.source_order_no !== "string"
    || !Number.isInteger(quote.source_revision) || quote.source_revision < 1 || !validDate(quote.accepted_at)
    || !isCanonicalRial(quote.accepted_total_rial)) return null;
  const { data: inquiry, error: inquiryError } = await client.from("inquiries").select("customer_name").eq("id", inquiryId).single();
  if (inquiryError || !inquiry || typeof inquiry.customer_name !== "string") return null;
  const { data: payments, count, error: paymentError } = await client.from("staff_inquiry_payments")
    .select("id,inquiry_id,amount_rial,reference,paid_at,note,recorded_at,reversed_at,reversal_reason", { count: "exact" })
    .eq("inquiry_id", inquiryId).order("recorded_at", { ascending: false }).range(0, 999);
  if (paymentError || !Array.isArray(payments) || count !== payments.length) return null;
  let received = BigInt(0);
  const entries: FinancePayment[] = [];
  for (const item of payments) {
    if (typeof item.id !== "string" || item.inquiry_id !== inquiryId || !isCanonicalRial(item.amount_rial)
      || typeof item.reference !== "string" || !validDate(item.paid_at) || !validDate(item.recorded_at)
      || item.note !== null && typeof item.note !== "string"
      || item.reversed_at !== null && !validDate(item.reversed_at)
      || item.reversal_reason !== null && typeof item.reversal_reason !== "string"
      || (item.reversed_at === null) !== (item.reversal_reason === null)) return null;
    if (item.reversed_at === null) received += BigInt(item.amount_rial);
    entries.push({ id: item.id, amountRial: item.amount_rial, reference: item.reference, paidAt: item.paid_at, note: item.note, recordedAt: item.recorded_at, reversedAt: item.reversed_at, reversalReason: item.reversal_reason });
  }
  const total = BigInt(quote.accepted_total_rial);
  if (received > total) return null;
  return { inquiryId, quoteNo: quote.source_quote_no, orderNo: quote.source_order_no, revision: quote.source_revision,
    acceptedAt: quote.accepted_at, amountRial: quote.accepted_total_rial, receivedRial: String(received), balanceRial: String(total - received),
    customerName: inquiry.customer_name, payments: entries };
}
