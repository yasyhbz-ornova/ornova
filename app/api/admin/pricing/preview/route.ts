import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { parsePricingRequest } from "@/lib/pricing/contract";
import { requestPricingPreview, PricingRejected } from "@/lib/pricing/client";

export const runtime = "nodejs";

function failure(status: number) {
  const error = status === 422 ? "محاسبه پذیرفته نشد؛ مبلغ‌ها، حداقل قیمت و دلیل تغییر قیمت را بررسی کنید."
    : status === 503 ? "موتور محاسبه فعلاً در دسترس نیست؛ تنظیمات و اتصال باید بررسی شوند."
    : status === 413 ? "حجم اطلاعات محاسبه بیش از حد مجاز است."
    : "درخواست محاسبه معتبر یا در دسترس نیست.";
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return failure(403);
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure(401);
    if (!isOrnovaStaff(user)) return failure(403);
    const body = await readQuoteBody(request);
    if (body.status) return failure(body.status);
    const parsed = parsePricingRequest(body.value);
    if (!parsed.success) return failure(400);
    const result = await requestPricingPreview(parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error instanceof PricingRejected ? 422 : 503);
  }
}
