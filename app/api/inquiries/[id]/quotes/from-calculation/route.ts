import { NextResponse } from "next/server";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody, quoteError, quoteRpcStatus } from "@/lib/commerce/quote-request";
import { parseQuoteSnapshot } from "@/lib/commerce/quote-snapshot";
import { calculationColumns, parseCalculationRecord } from "@/lib/pricing/records";
import { parseCalculatedQuoteRequest, projectCalculationQuote } from "@/lib/pricing/calculated-quote";
import { calculatedQuotesSource } from "@/lib/pricing/calculated-quote-config";

const receiptSchema = z.object({ id: z.string().uuid(), created: z.boolean(), calculation_id: z.string().uuid(), calculation_revision: z.number().int(), payload: z.unknown() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return quoteError(403);
  try {
    const identity = z.string().uuid().safeParse((await params).id);
    if (!identity.success) return quoteError(404);
    const id = identity.data.toLowerCase(), client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return quoteError(401);
    if (!isOrnovaStaff(user)) return quoteError(403);
    const source = calculatedQuotesSource();
    if (!source) return quoteError(503);
    const body = await readQuoteBody(request);
    if (body.status) return quoteError(body.status);
    const parsed = parseCalculatedQuoteRequest(body.value);
    if (!parsed.success) return quoteError(400);
    const { data, error } = await client.from("inquiry_pricing_calculations").select(calculationColumns).eq("inquiry_id", id).eq("id", parsed.data.calculation_id).maybeSingle();
    if (error) return quoteError(503);
    if (!data) return quoteError(404);
    const record = parseCalculationRecord(data, id);
    if (!record.success || record.data.id !== parsed.data.calculation_id) return quoteError(503);
    if (record.data.source_key !== source) return quoteError(409);
    const projected = projectCalculationQuote(record.data, parsed.data);
    if (!projected.success) return quoteError(400);
    // SQL re-reads/rechecks the record and atomically links the customer-safe quote.
    // Never submit the browser result, the pre-read private snapshot or actor/owner IDs.
    const reply = await client.rpc("publish_calculated_inquiry_quote", { p_inquiry_id: id, p_source_key: source, p_request: parsed.data });
    if (reply.error) return quoteError(quoteRpcStatus(reply.error));
    const receipt = receiptSchema.safeParse(reply.data);
    if (!receipt.success || receipt.data.calculation_id.toLowerCase() !== record.data.id || receipt.data.calculation_revision !== record.data.revision) return quoteError(503);
    const saved = parseQuoteSnapshot(receipt.data.payload);
    if (!saved.success || !isDeepStrictEqual(saved.value, projected.value)) return quoteError(503);
    return NextResponse.json({ id: receipt.data.id, created: receipt.data.created }, { status: receipt.data.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return quoteError(503); }
}
