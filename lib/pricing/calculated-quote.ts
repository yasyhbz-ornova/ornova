import { z } from "zod";
import { isCanonicalRial } from "@/lib/commerce/quote-money";
import { parseQuoteSnapshot } from "@/lib/commerce/quote-snapshot";
import type { CalculationRecord } from "@/lib/pricing/records";

const schema = z.object({
  calculation_id: z.string().uuid().transform(id => id.toLowerCase()),
  source_quote_no: z.string(), source_order_no: z.string(), source_revision: z.number().int(),
  issued_at: z.string(), valid_until: z.string(), description: z.string(), quantity: z.number().int(),
  tax_rial: z.string().refine(isCanonicalRial).nullable(),
}).strict();
export type CalculatedQuoteRequest = z.infer<typeof schema>;
const money = z.string().refine(isCanonicalRial);
const basisSchema = z.object({ id: z.string().uuid().transform(id => id.toLowerCase()), revision: z.number().int().min(1).max(10000), method: z.enum(["cost-plus", "gram-sale"]), pre_tax_rial: money, tax_rial: money, total_rial: money.refine(value => value !== "0") }).strict().refine(value => [value.pre_tax_rial, value.tax_rial, value.total_rial].every(isCanonicalRial) && BigInt(value.pre_tax_rial) + BigInt(value.tax_rial) === BigInt(value.total_rial) && (value.method !== "gram-sale" || value.tax_rial === "0"));
export type CalculationQuoteBasis = z.infer<typeof basisSchema>;
export function parseCalculationQuoteBasis(value: unknown) { return basisSchema.safeParse(value); }
export function calculationQuoteBasis(record: CalculationRecord): CalculationQuoteBasis {
  return { id: record.id, revision: record.revision, method: record.snapshot.method, pre_tax_rial: record.snapshot.result.pre_tax_rial, tax_rial: record.snapshot.result.tax_rial, total_rial: record.snapshot.result.total_rial };
}

// Allowlist only: private record/source/input/actor/reason must never be spread here.
function quote(request: CalculatedQuoteRequest, amount: string, tax: string, total: string) {
  return { version: 1, source_quote_no: request.source_quote_no, source_order_no: request.source_order_no,
    source_revision: request.source_revision, issued_at: request.issued_at, valid_until: request.valid_until,
    lines: [{ description: request.description, quantity: request.quantity, amount_rial: amount }],
    discount_rial: "0", tax_rial: tax, total_rial: total };
}
export function parseCalculatedQuoteRequest(value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { success: false as const };
  // Reuse the existing customer text/date/quantity normalization, not another dialect.
  const normalized = parseQuoteSnapshot(quote(parsed.data, "1", "0", "1"));
  if (!normalized.success) return { success: false as const };
  const p = normalized.value;
  return { success: true as const, data: { calculation_id: parsed.data.calculation_id, source_quote_no: p.source_quote_no,
    source_order_no: p.source_order_no, source_revision: p.source_revision, issued_at: p.issued_at, valid_until: p.valid_until,
    description: p.lines[0].description, quantity: p.lines[0].quantity, tax_rial: parsed.data.tax_rial } };
}
export function projectCalculationQuote(record: CalculationRecord, request: CalculatedQuoteRequest) {
  return projectQuoteFromBasis(calculationQuoteBasis(record), request);
}
export function projectQuoteFromBasis(basis: CalculationQuoteBasis, request: CalculatedQuoteRequest) {
  const checked = parseCalculatedQuoteRequest(request);
  const source = parseCalculationQuoteBasis(basis);
  const fail = () => ({ success: false as const, error: "نسخهٔ محاسبه یا تصمیم مالیاتی معتبر نیست." });
  if (!source.success || !checked.success || checked.data.calculation_id !== source.data.id) return fail();
  const input = checked.data;
  const tax = source.data.method === "cost-plus" ? source.data.tax_rial : input.tax_rial;
  if ((source.data.method === "cost-plus" && input.tax_rial !== null) || tax === null) return fail();
  const total = String(BigInt(source.data.pre_tax_rial) + BigInt(tax));
  // Customer row is the entire saved pre-tax amount, NOT quantity × that amount.
  return parseQuoteSnapshot(quote(input, source.data.pre_tax_rial, tax, total));
}
