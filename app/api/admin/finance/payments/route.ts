import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { isCanonicalRial } from "@/lib/commerce/quote-money";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const uuid = z.string().uuid();
const input = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("record"), id: uuid, inquiry_id: uuid, amount_rial: z.string().refine(value => isCanonicalRial(value) && value !== "0"), reference: z.string().trim().min(1).max(120), paid_at: z.iso.datetime({ offset: true }), note: z.string().max(500).nullable() }),
  z.strictObject({ action: z.literal("reverse"), record_id: uuid, reason: z.string().trim().min(1).max(500) }),
]);
const fail = (status: number) => NextResponse.json({ error: status === 409 ? "این دریافت با وضعیت فعلی سازگار نیست؛ دفتر را تازه‌سازی کنید." : status === 404 ? "پذیرش یا دریافت پیدا نشد." : status === 503 ? "ثبت مالی فعلاً در دسترس نیست." : "درخواست مالی معتبر نیست." }, { status, headers });
const rpcStatus = (error: { code?: string; message?: string }) => {
  if (error.code === "23505" || error.message?.includes("PAYMENT_CONFLICT") || error.message?.includes("PAYMENT_OVERPAY")) return 409;
  if (error.message?.includes("PAYMENT_NOT_FOUND")) return 404;
  if (error.message?.includes("PAYMENT_INVALID")) return 400;
  return 503;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return fail(403);
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return fail(401);
    if (!isOrnovaStaff(user)) return fail(403);
    const body = await readQuoteBody(request);
    if (body.status) return fail(body.status);
    const parsed = input.safeParse(body.value);
    if (!parsed.success) return fail(400);
    const value = parsed.data;
    const result = value.action === "record"
      ? await client.rpc("record_inquiry_payment", { p_id: value.id, p_inquiry_id: value.inquiry_id, p_amount_rial: value.amount_rial, p_reference: value.reference, p_paid_at: value.paid_at, p_note: value.note })
      : await client.rpc("reverse_inquiry_payment", { p_record_id: value.record_id, p_reason: value.reason });
    if (result.error) return fail(rpcStatus(result.error));
    return NextResponse.json({ result: result.data }, { headers });
  } catch { return fail(503); }
}
