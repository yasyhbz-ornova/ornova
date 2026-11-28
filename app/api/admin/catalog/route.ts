import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { catalogProductInput } from "@/lib/catalog/product-input";
import { catalogImageMaxBytes, isTransparentTrayImage, trayImageError } from "@/lib/catalog/tray-image";
import { isReferenceOnlyGalleryPhoto } from "@/lib/constants/gallery-renders";
import { isWithheldGalleryPhoto } from "@/lib/catalog/gallery-product-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const failure = (status: number, error?: string) => NextResponse.json({ error: error ?? (status === 409 ? "محصول در جای دیگری تغییر کرده است؛ نسخهٔ تازه را دریافت کنید." : status === 503 ? "کاتالوگ فعلاً در دسترس نیست." : "درخواست مدیریت محصول معتبر نیست.") }, { status, headers });
const uploadedImagePath = /^\/images\/ornova\/catalog-media\/(.+)$/;
const trayFileName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$/;

export async function GET() {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure(401);
    if (!isOrnovaStaff(user)) return failure(403);
    const result = await client.from("catalog_products").select("*").order("updated_at", { ascending: false }).limit(200);
    if (result.error) return failure(503);
    const hasBirthMonthField = result.data?.length
      ? Object.hasOwn(result.data[0], "birth_month_id")
      : !(await client.from("catalog_products").select("birth_month_id", { head: true }).limit(1)).error;
    return NextResponse.json({ products: result.data, hasBirthMonthField }, { headers });
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
    const standPath = product.stand_image_path;
    if (product.status === "published" && isReferenceOnlyGalleryPhoto(product.image_path)) {
      return failure(400, "برای انتشار، نمای کامل اثر را به‌عنوان تصویر اصلی انتخاب کنید.");
    }
    if (product.status !== "archived" && product.gallery_placement_verified) {
      if (isWithheldGalleryPhoto(standPath)) {
        const message = "این عکس از سینی کنار گذاشته شده است. برای تأیید جای‌گذاری، برش تازه‌ای انتخاب کنید.";
        if (revision === 0) return failure(400, message);
        const { data: stored, error: readError } = await client.from("catalog_products")
          .select("revision,status,stand_image_path,gallery_placement_verified").eq("slug", slug).maybeSingle();
        if (readError) return failure(503);
        if (stored?.revision !== revision) return failure(409);
        if (stored.stand_image_path !== standPath || stored.status !== product.status || !stored.gallery_placement_verified) return failure(400, message);
      }
      if (isReferenceOnlyGalleryPhoto(standPath)) return failure(400, "برای سینی، برش شفافِ نمای کامل اثر را انتخاب کنید.");
      if (!standPath || !/\.(png|webp)$/.test(standPath)) return failure(400, trayImageError);
      const uploadedImage = uploadedImagePath.exec(standPath);
      if (uploadedImage) {
        const fileName = uploadedImage[1];
        if (!trayFileName.test(fileName)) return failure(400, trayImageError);
        const { data: { publicUrl } } = client.storage.from("ornova-catalog").getPublicUrl(fileName);
        const response = await fetch(publicUrl, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (response.status === 400 || response.status === 404) return failure(400, "فایل برش سینی پیدا نشد. تصویر را دوباره انتخاب کنید.");
        if (!response.ok) return failure(503);
        if (Number(response.headers.get("content-length")) > catalogImageMaxBytes || !(await isTransparentTrayImage(await response.blob()))) {
          return failure(400, trayImageError);
        }
      }
    }
    const result = await client.rpc("save_catalog_product", { p_slug: slug, p_revision: revision, p_product: product });
    if (result.error) {
      if (result.error.code === "23505" && result.error.message.includes("catalog_published_birth_month_slot_idx")) {
        return failure(409, "برای این ماه و دسته یک اثر منتشر شده است. ابتدا اثر قبلی را از این ماه بردارید.");
      }
      return failure(result.error.message.includes("CATALOG_CONFLICT") ? 409 : result.error.message.includes("CATALOG_INVALID") ? 400 : 503);
    }
    return NextResponse.json({ product: result.data }, { status: revision === 0 ? 201 : 200, headers });
  } catch { return failure(503); }
}
