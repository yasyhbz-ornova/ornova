import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { roomPlacementSchema } from "@/lib/catalog/room-placement";
import { isWithheldGalleryPhoto } from "@/lib/catalog/gallery-product-link";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const input = z.strictObject({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/),
  revision: z.number().int().min(1).max(999999),
  placement: roomPlacementSchema.nullable(),
});
const failure = (status: number) => NextResponse.json({ error: status === 409 ? "اثر تغییر کرده است؛ صفحه را تازه‌سازی کنید." : status === 503 ? "جای‌گذاری فعلاً ذخیره نشد." : "درخواست جای‌گذاری معتبر نیست." }, { status, headers });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return failure(403);
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure(401);
    if (!isOrnovaStaff(user)) return failure(403);
    const body = await readQuoteBody(request);
    if (body.status) return failure(body.status);
    const parsed = input.safeParse(body.value);
    if (!parsed.success) return failure(400);
    if (parsed.data.placement && isWithheldGalleryPhoto(parsed.data.placement.src)) return failure(400);
    const { data, error: saveError } = await client.rpc("save_catalog_room_placement", { p_slug: parsed.data.slug, p_revision: parsed.data.revision, p_placement: parsed.data.placement });
    if (saveError) return failure(saveError.code === "23505" || saveError.message.includes("CATALOG_CONFLICT") ? 409 : saveError.message.includes("CATALOG_INVALID") ? 400 : 503);
    return NextResponse.json({ product: data }, { headers });
  } catch { return failure(503); }
}
