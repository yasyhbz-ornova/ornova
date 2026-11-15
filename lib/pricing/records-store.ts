import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { PricingResponse } from "@/lib/pricing/contract";
import { parseCalculationRecord, pricingRecordStatus } from "@/lib/pricing/records";

export class PricingRecordWriteError extends Error {
  constructor(readonly status: number) { super("Private calculation storage unavailable"); }
}
export function pricingRecordsSource(env: Record<string, string | undefined> = process.env): string | null {
  const source = env.ORNOVA_PCS_SOURCE_KEY ?? "";
  return env.ORNOVA_PRICING_RECORDS_ENABLED === "true" && /^[a-zA-Z0-9_-]{1,80}$/.test(source) ? source : null;
}
export function pricingRecordsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(pricingRecordsSource(env) && env.NEXT_PUBLIC_SUPABASE_URL === "https://urtufzyhqgwszmufhkyt.supabase.co" && env.SUPABASE_SERVICE_ROLE_KEY);
}
export function createPricingRecordWriter(env: Record<string, string | undefined> = process.env) {
  const source = pricingRecordsSource(env), url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  // A privileged client must never be accidentally aimed at Master Ren/another project.
  if (!source || url !== "https://urtufzyhqgwszmufhkyt.supabase.co" || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return {
    async save(inquiryId: string, ownerId: string, actorId: string, snapshot: PricingResponse) {
      if (![inquiryId, ownerId, actorId].every(id => z.string().uuid().safeParse(id).success)) throw new PricingRecordWriteError(400);
      inquiryId = inquiryId.toLowerCase(); ownerId = ownerId.toLowerCase(); actorId = actorId.toLowerCase();
      const { data, error } = await client.rpc("save_inquiry_pricing_calculation", { p_inquiry_id: inquiryId, p_expected_owner_id: ownerId, p_actor_id: actorId, p_source_key: source, p_snapshot: snapshot });
      if (error) throw new PricingRecordWriteError(pricingRecordStatus(error));
      if (!data || typeof data.created !== "boolean") throw new PricingRecordWriteError(503);
      const parsed = parseCalculationRecord(data.record, inquiryId);
      if (!parsed.success || parsed.data.source_key !== source || !isDeepStrictEqual(parsed.data.snapshot, snapshot) || (data.created && parsed.data.created_by !== actorId)) throw new PricingRecordWriteError(503);
      return { created: data.created as boolean, record: parsed.data };
    },
  };
}
