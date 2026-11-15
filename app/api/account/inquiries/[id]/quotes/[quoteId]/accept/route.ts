import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody, quoteError, quoteRpcStatus } from "@/lib/commerce/quote-request";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  if (!isSameOriginRequest(request)) return quoteError(403);
  try {
    const { id, quoteId } = await params;
    if (![id, quoteId].every(value => z.string().uuid().safeParse(value).success)) return quoteError(404);
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError && !isAuthSessionMissingError(authError)) return quoteError(503);
    if (!user) return quoteError(401);
    const body = await readQuoteBody(request);
    if (body.status) return quoteError(body.status);
    if (!z.strictObject({ confirmed: z.literal(true) }).safeParse(body.value).success) return quoteError(400);
    const { data, error } = await client.rpc("accept_inquiry_quote", { p_inquiry_id: id, p_snapshot_id: quoteId });
    if (error) return quoteError(quoteRpcStatus(error));
    if (!data || data.id !== quoteId || typeof data.accepted_at !== "string" || !Number.isFinite(Date.parse(data.accepted_at)) || typeof data.created !== "boolean") return quoteError(503);
    return NextResponse.json({ id: quoteId, accepted_at: data.accepted_at, created: data.created }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return quoteError(503); }
}
