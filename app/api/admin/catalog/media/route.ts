import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { hasAllowedFileSignature } from "@/lib/security/file-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limit = 4 * 1024 * 1024;
const contentTypes: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const headers = { "Cache-Control": "no-store" };
const failure = (status: number) => NextResponse.json({ error: status === 413 ? "حجم تصویر باید کمتر از ۴ مگابایت باشد." : status === 400 ? "فایل باید تصویر PNG، JPEG یا WebP معتبر باشد." : status === 503 ? "بارگذاری تصویر فعلاً در دسترس نیست." : "اجازهٔ بارگذاری تصویر ندارید." }, { status, headers });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return failure(403);
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > limit + 65536) return failure(413);
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure(401);
    if (!isOrnovaStaff(user)) return failure(403);
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File) || !contentTypes[file.type] || !file.size) return failure(400);
    if (file.size > limit) return failure(413);
    if (!(await hasAllowedFileSignature(file))) return failure(400);
    const name = `${crypto.randomUUID()}.${contentTypes[file.type]}`;
    const result = await client.storage.from("ornova-catalog").upload(name, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (result.error) return failure(503);
    return NextResponse.json({ path: `/images/ornova/catalog-media/${name}` }, { status: 201, headers });
  } catch { return failure(503); }
}
