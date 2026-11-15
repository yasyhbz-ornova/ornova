import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { catalogProductInput } from "@/lib/catalog/product-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const failure = (status: number) => NextResponse.json({ error: status === 409 ? "محصول در جای دیگری تغییر کرده است؛ نسخهٔ تازه را دریافت کنید." : status === 503 ? "کاتالوگ فعلاً در دسترس نیست." : "درخواست مدیریت محصول معتبر نیست." }, { status, headers });

export async function GET() {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure(401);
    if (!isOrnovaStaff(user)) return failure(403);
    const result = await client.from("catalog_products").select("*").order("updated_at", { ascending: false }).limit(200);
    if (result.error) return failure(503);
    return NextResponse.json({ products: result.data }, { headers });
  } catch { return failure(503); }
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
    const parsed = catalogProductInput.safeParse(body.value);
    if (!parsed.success) return failure(400);
    const { slug, revision, ...product } = parsed.data;
    const result = await client.rpc("save_catalog_product", { p_slug: slug, p_revision: revision, p_product: product });
    if (result.error) return failure(result.error.message.includes("CATALOG_CONFLICT") ? 409 : result.error.message.includes("CATALOG_INVALID") ? 400 : 503);
    return NextResponse.json({ product: result.data }, { status: revision === 0 ? 201 : 200, headers });
  } catch { return failure(503); }
}
