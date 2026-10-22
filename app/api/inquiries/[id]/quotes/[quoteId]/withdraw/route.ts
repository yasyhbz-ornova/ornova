import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody, quoteError, quoteRpcStatus } from "@/lib/commerce/quote-request";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  if (!isSameOriginRequest(request)) return quoteError(403);
  try {
    const { id, quoteId } = await params;
    if (![id, quoteId].every(value => z.string().uuid().safeParse(value).success)) return quoteError(404);
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return quoteError(401);
    if (!isOrnovaStaff(user)) return quoteError(403);
    const body = await readQuoteBody(request);
    if (body.status) return quoteError(body.status);
    const parsed = z.strictObject({ reason: z.string().trim().min(1).max(500) }).safeParse(body.value);
    if (!parsed.success) return quoteError(400);
    const { data, error } = await client.rpc("withdraw_inquiry_quote", { p_inquiry_id: id, p_snapshot_id: quoteId, p_reason: parsed.data.reason });
    if (error) return quoteError(quoteRpcStatus(error));
    if (!data || data.id !== quoteId) return quoteError(503);
    return NextResponse.json({ id: quoteId, withdrawn: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return quoteError(503); }
}
