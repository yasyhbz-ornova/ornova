import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AiGatewayError, canPreviewAi, createAiBrief, createAiImage, getAiConfig, readLimitedBody } from "@/lib/ai/gateway";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  if (!isSameOriginRequest(request)) return fail("درخواست نامعتبر است.", 403);
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("برای استفاده از استودیو وارد حساب شوید.", 401);
    if (!canPreviewAi(user)) return fail("این بخش فعلاً برای آزمون استودیو در دسترس است.", 403);

    let input: { operation?: unknown; idea?: unknown; consent?: unknown } | null;
    try {
      input = JSON.parse(await readLimitedBody(new Response(request.body), 8192));
    } catch { return fail("متن ایده کامل یا معتبر نیست.", 400); }
    if (!input || input.consent !== true || typeof input.idea !== "string"
      || input.idea.trim().length < 3 || input.idea.length > 1500
      || (input.operation !== "brief" && input.operation !== "image")) {
      return fail("ایده‌ای بین ۳ تا ۱۵۰۰ نویسه بنویسید و ارسال آن به سرویس هوش مصنوعی را تأیید کنید.", 400);
    }

    const config = getAiConfig();
    const idea = input.idea.trim();
    if (input.operation === "brief") {
      return NextResponse.json({ brief: await createAiBrief(idea, config), design_state: "awaiting_review" }, { headers });
    }
    const image = await createAiImage(idea, config);
    return new Response(new Uint8Array(image.bytes), { headers: {
      ...headers, "Content-Type": image.mime, "Content-Disposition": "inline", "X-Ornova-Design-State": "awaiting-review",
    } });
  } catch (error) {
    if (error instanceof AiGatewayError) {
      if (error.code === "disabled" || error.code === "configuration") return fail("اتصال استودیو هنوز آماده نشده است.", 503);
      if (error.code === "rate_limit") return fail("سرویس فعلاً درخواست‌های زیادی دارد؛ کمی بعد دوباره تلاش کنید.", 429);
    }
    return fail("ارتباط با استودیو برقرار نشد؛ متن ایده را نگه دارید و دوباره تلاش کنید.", 503);
  }
}
