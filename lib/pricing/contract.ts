import { z } from "zod";
import { isCanonicalRial } from "@/lib/commerce/quote-money";

// This boundary validates units/provenance, not pricing formulas. C# alone calculates.
const money = z.string().refine(isCanonicalRial);
const positive = money.refine(value => value !== "0");
const bp = z.number().int().min(0).max(10000);
const costInput = z.object({
  true_cost_rial: positive, mandatory_buffer_rial: money,
  profit_method: z.enum(["margin", "markup"]), profit_bp: z.number().int().min(0).max(2147473647),
  rounding: z.enum(["none", "nearest", "up", "down"]), rounding_step_rial: money,
  tax_bp: bp, override_pre_tax_rial: positive.nullable(),
  override_reason: z.string().min(1).max(500).refine(v => v.trim().length > 0).nullable(),
}).strict().refine(v => v.profit_method !== "margin" || v.profit_bp < 10000)
  .refine(v => v.rounding === "none" || v.rounding_step_rial !== "0");
const gramInput = z.object({
  weight_mg: positive, rate_per_gram_rial: positive,
  under_2g_fee_rial: money, under_4g_fee_rial: money, stone_total_rial: money,
  stone_count: z.number().int().min(0).max(2147483647), setting_per_stone_rial: money,
  packaging_rial: money, logistics_rial: money, design_rial: money,
}).strict();
const header = {
  schema_version: z.literal(1), request_id: z.string().uuid(),
  policy_version: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/),
};
const costRequest = z.object({ ...header, method: z.literal("cost-plus"), input: costInput }).strict();
const gramRequest = z.object({ ...header, method: z.literal("gram-sale"), input: gramInput }).strict();
const requestSchema = z.discriminatedUnion("method", [costRequest, gramRequest]);
export type PricingRequest = z.infer<typeof requestSchema>;
export function parsePricingRequest(value: unknown) { return requestSchema.safeParse(value); }

const totals = { pre_tax_rial: money, tax_rial: money, total_rial: money };
const costResponse = costRequest.extend({
  algorithm_version: z.literal("pcs-standard-48c17189-v1"),
  result: z.object({ ...totals, cost_floor_rial: money, target_rial: money,
    effective_margin_bp: z.number().int().min(0).max(10000),
    warnings: z.array(z.enum(["MANDATORY_BUFFER_ZERO", "FINAL_BELOW_TARGET"])).max(2),
  }).strict(),
}).strict();
const gramResponse = gramRequest.extend({
  algorithm_version: z.literal("pcs-gram-explicit-fees-v1"),
  result: z.object({ ...totals, tax_rial: z.literal("0"), base_rial: money, light_piece_rial: money,
    setting_rial: money, warnings: z.tuple([z.literal("GRAM_SALE_HAS_NO_TAX_POLICY")]),
  }).strict(),
}).strict();
const responseSchema = z.discriminatedUnion("method", [costResponse, gramResponse]);
export type PricingResponse = z.infer<typeof responseSchema>;

function sameInput(left: Record<string, unknown>, right: Record<string, unknown>) {
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => left[key] === right[key]);
}
export function parsePricingResponse(value: unknown, request: PricingRequest) {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) return { success: false as const };
  const data = parsed.data;
  if (data.request_id !== request.request_id || data.method !== request.method || data.policy_version !== request.policy_version || !sameInput(data.input, request.input)) return { success: false as const };
  // Exact transport consistency only; no duplicate pricing algorithm in JS.
  if (BigInt(data.result.pre_tax_rial) + BigInt(data.result.tax_rial) !== BigInt(data.result.total_rial)) return { success: false as const };
  return { success: true as const, data };
}
