import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { parseQuoteSnapshot } from "@/lib/commerce/quote-snapshot";
import { readQuoteBody, quoteError, quoteRpcStatus } from "@/lib/commerce/quote-request";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return quoteError(403);
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return quoteError(404);
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return quoteError(401);
    if (!isOrnovaStaff(user)) return quoteError(403);
    const body = await readQuoteBody(request);
    if (body.status) return quoteError(body.status);
    const parsed = parseQuoteSnapshot(body.value);
    if (!parsed.success) return quoteError(400);
    const sourceKey = process.env.ORNOVA_PCS_SOURCE_KEY ?? "";
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(sourceKey)) return quoteError(503);
    const { data, error } = await client.rpc("publish_inquiry_quote", { p_inquiry_id: id, p_source_key: sourceKey, p_snapshot: parsed.value });
    if (error) return quoteError(quoteRpcStatus(error));
    if (!data || typeof data.id !== "string" || typeof data.created !== "boolean") return quoteError(503);
    return NextResponse.json({ id: data.id, created: data.created }, { status: data.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return quoteError(503); }
}
