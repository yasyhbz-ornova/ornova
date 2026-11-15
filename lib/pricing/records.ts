import { z } from "zod";
import { parsePricingRequest, parsePricingResponse, type PricingRequest, type PricingResponse } from "@/lib/pricing/contract";

export const calculationColumns = "id,inquiry_id,revision,source_key,snapshot,created_at,created_by";
const uuid = z.string().uuid().transform(value => value.toLowerCase());
const recordSchema = z.object({
  id: uuid, inquiry_id: uuid, revision: z.number().int().min(1).max(10000),
  source_key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), snapshot: z.unknown(),
  created_at: z.iso.datetime({ offset: true }), created_by: uuid.nullable(),
}).strict();
export type CalculationRecord = Omit<z.infer<typeof recordSchema>, "snapshot"> & { snapshot: PricingResponse };

export function parseCalculationRecord(value: unknown, inquiryId: string): { success: true; data: CalculationRecord } | { success: false } {
  const record = recordSchema.safeParse(value);
  if (!record.success || record.data.inquiry_id !== inquiryId.toLowerCase() || typeof record.data.snapshot !== "object" || !record.data.snapshot) return { success: false };
  const snapshot = record.data.snapshot as Record<string, unknown>;
  const request = parsePricingRequest({ schema_version: snapshot.schema_version, request_id: snapshot.request_id, method: snapshot.method, policy_version: snapshot.policy_version, input: snapshot.input });
  if (!request.success) return { success: false };
  const result = parsePricingResponse(snapshot, request.data);
  if (!result.success || result.data.result.total_rial === "0") return { success: false };
  return { success: true, data: { ...record.data, snapshot: result.data } };
}
export function calculationMatches(record: CalculationRecord, request: PricingRequest, sourceKey: string): boolean {
  return record.source_key === sourceKey && parsePricingResponse(record.snapshot, request).success;
}
export function pricingRecordStatus(error: { message?: string }): number {
  const message = error.message ?? "";
  if (/CALC_(CONFLICT|CLOSED)/.test(message)) return 409;
  if (message.includes("CALC_NOT_FOUND")) return 404;
  if (message.includes("CALC_FORBIDDEN")) return 403;
  if (message.includes("CALC_INVALID")) return 400;
  return 503;
}
