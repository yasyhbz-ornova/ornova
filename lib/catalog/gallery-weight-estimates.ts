import "server-only";
import { z } from "zod";

const atlasSchema = z.object({
  version: z.literal("1.1"),
  unit: z.literal("g"),
  basis: z.literal("estimated silver metal weight; excludes stones, chain and non-silver strap"),
  publication_status: z.literal("internal_only"),
  records: z.array(z.object({
    reference: z.string().regex(/^(?:0[1-9]|[1-4][0-9]|5[0-3]|L|V)$/).refine((reference) => reference !== "06"),
    name_fa: z.string().trim().min(1).max(120),
    estimated_weight_g: z.number().positive().max(1000),
    status: z.literal("estimated"),
    cad_weight_g: z.null(),
    actual_weight_g: z.null(),
    public_price_eligible: z.literal(false),
  })).max(54).refine((records) => new Set(records.map(({ reference }) => reference)).size === records.length),
});

export type InternalWeightEstimate = { reference: string; name: string; grams: number };

export function readInternalWeightEstimates(): InternalWeightEstimate[] {
  const atlas = process.env.ORNOVA_INTERNAL_WEIGHT_ATLAS;
  if (!atlas) return [];
  try {
    const result = atlasSchema.safeParse(JSON.parse(atlas));
    if (!result.success) return [];
    return result.data.records.map(({ reference, name_fa, estimated_weight_g }) => ({
      reference,
      name: name_fa,
      grams: estimated_weight_g,
    }));
  } catch {
    return [];
  }
}
