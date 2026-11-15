import type { SupabaseClient } from "@supabase/supabase-js";
import { isCanonicalRial } from "@/lib/commerce/quote-money";

export const FINANCE_PAGE_SIZE = 20;
export type FinanceRegisterRow = {
  inquiryId: string;
  quoteId: string;
  quoteNo: string;
  orderNo: string;
  revision: number;
  acceptedAt: string;
  amountRial: string;
  receivedRial: string;
  balanceRial: string;
  customerName: string;
};
export type FinanceRegisterResult = { data: FinanceRegisterRow[]; count: number; error: false } | { data: []; count: 0; error: true };

export async function readFinanceRegister(client: SupabaseClient, page: number): Promise<FinanceRegisterResult> {
  if (!Number.isInteger(page) || page < 1 || page > 9999) return { data: [], count: 0, error: true };
  try {
    const offset = (page - 1) * FINANCE_PAGE_SIZE;
    const { data, count, error } = await client.from("customer_inquiry_quotes")
      .select("id,inquiry_id,source_quote_no,source_order_no,source_revision,accepted_at,accepted_total_rial", { count: "exact" })
      .not("accepted_at", "is", null)
      .order("accepted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + FINANCE_PAGE_SIZE - 1);
    if (error || !Array.isArray(data) || !Number.isInteger(count) || count === null || count < 0 || (data.length > 0 && count < offset + data.length) || data.length > FINANCE_PAGE_SIZE) return { data: [], count: 0, error: true };
    const ids: string[] = [];
    for (const row of data) {
      if (typeof row.id !== "string" || typeof row.inquiry_id !== "string" || typeof row.source_quote_no !== "string" || typeof row.source_order_no !== "string" || !Number.isInteger(row.source_revision) || row.source_revision < 1 || typeof row.accepted_at !== "string" || !Number.isFinite(Date.parse(row.accepted_at)) || !isCanonicalRial(row.accepted_total_rial)) return { data: [], count: 0, error: true };
      ids.push(row.inquiry_id);
    }
    if (!ids.length) return { data: [], count, error: false };
    const { data: inquiries, error: inquiryError } = await client.from("inquiries").select("id,customer_name").in("id", ids);
    if (inquiryError || !Array.isArray(inquiries)) return { data: [], count: 0, error: true };
    const names = new Map(inquiries.map(row => [row.id, row.customer_name]));
    if (ids.some(id => !names.has(id))) return { data: [], count: 0, error: true };
    const { data: payments, count: paymentCount, error: paymentError } = await client.from("staff_inquiry_payments")
      .select("inquiry_id,amount_rial,reversed_at", { count: "exact" }).in("inquiry_id", ids);
    if (paymentError || !Array.isArray(payments) || paymentCount !== payments.length) return { data: [], count: 0, error: true };
    const received = new Map<string, bigint>();
    for (const payment of payments) {
      if (!ids.includes(payment.inquiry_id) || !isCanonicalRial(payment.amount_rial)
        || (payment.reversed_at !== null && (typeof payment.reversed_at !== "string" || !Number.isFinite(Date.parse(payment.reversed_at))))) return { data: [], count: 0, error: true };
      if (payment.reversed_at === null) received.set(payment.inquiry_id, (received.get(payment.inquiry_id) ?? BigInt(0)) + BigInt(payment.amount_rial));
    }
    if (data.some(row => (received.get(row.inquiry_id) ?? BigInt(0)) > BigInt(row.accepted_total_rial))) return { data: [], count: 0, error: true };
    return { data: data.map(row => ({
      inquiryId: row.inquiry_id,
      quoteId: row.id,
      quoteNo: row.source_quote_no,
      orderNo: row.source_order_no,
      revision: row.source_revision,
      acceptedAt: row.accepted_at,
      amountRial: row.accepted_total_rial,
      receivedRial: String(received.get(row.inquiry_id) ?? BigInt(0)),
      balanceRial: String(BigInt(row.accepted_total_rial) - (received.get(row.inquiry_id) ?? BigInt(0))),
      customerName: names.get(row.inquiry_id) || "نام ثبت نشده",
    })), count, error: false };
  } catch { return { data: [], count: 0, error: true }; }
}
