import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAllowedFileSignature } from "@/lib/security/file-signature";
import { isInquiryStoragePath, normalizeUploadMetadata } from "@/lib/security/file-upload";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { z } from "zod";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const noStore = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    const { id } = await params;
    const fileId = new URL(request.url).searchParams.get("fileId");
    if (!z.string().uuid().safeParse(id).success || !fileId || !z.string().uuid().safeParse(fileId).success) {
      return NextResponse.json({ error: "فایل پیدا نشد." }, { status: 404, headers: noStore });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای دریافت فایل وارد حساب شوید." }, { status: 401, headers: noStore });

    let inquiryQuery = supabase.from("inquiries").select("id").eq("id", id);
    if (!isOrnovaStaff(user)) inquiryQuery = inquiryQuery.eq("user_id", user.id);
    const { data: inquiry, error: inquiryError } = await inquiryQuery.maybeSingle();
    if (inquiryError) return NextResponse.json({ error: "دریافت فایل فعلاً ممکن نشد." }, { status: 503, headers: noStore });
    if (!inquiry) return NextResponse.json({ error: "فایل پیدا نشد." }, { status: 404, headers: noStore });

    const { data: file, error: fileError } = await supabase
      .from("inquiry_files")
      .select("storage_path,original_name,content_type")
      .eq("id", fileId)
      .eq("inquiry_id", id)
      .maybeSingle();
    if (fileError) return NextResponse.json({ error: "دریافت فایل فعلاً ممکن نشد." }, { status: 503, headers: noStore });
    if (!file || !ALLOWED_TYPES.has(file.content_type)) return NextResponse.json({ error: "فایل پیدا نشد." }, { status: 404, headers: noStore });

    const { data: object, error: downloadError } = await supabase.storage.from("ornova-private").download(file.storage_path);
    if (downloadError || !object) return NextResponse.json({ error: "دریافت فایل فعلاً ممکن نشد." }, { status: 503, headers: noStore });

    const safeName = encodeURIComponent(file.original_name.replace(/[\r\n"\\]/g, "_")).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return new NextResponse(object, {
      headers: {
        "Content-Type": file.content_type,
        "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
        ...noStore,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ error: "سرویس فایل فعلاً در دسترس نیست." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای بارگذاری فایل باید وارد حساب شوید." }, { status: 401 });

    const { data: inquiry, error: inquiryError } = await supabase.from("inquiries").select("id,status").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (inquiryError) return NextResponse.json({ error: "بررسی درخواست فعلاً ممکن نشد." }, { status: 503 });
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });
    if (inquiry.status === "closed") return NextResponse.json({ error: "این پرونده بسته شده است؛ برای پیگیری تازه درخواست جدیدی ثبت کنید." }, { status: 409 });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 8192) return NextResponse.json({ error: "اطلاعات پیوست معتبر نیست." }, { status: 413 });

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: "اطلاعات پیوست معتبر نیست." }, { status: 400 });
    }

    const body = requestBody as { storage_path?: unknown } | null;
    const metadata = normalizeUploadMetadata(requestBody);
    if (!metadata || typeof body?.storage_path !== "string" || !isInquiryStoragePath(body.storage_path, user.id, id)) {
      return NextResponse.json({ error: "اطلاعات پیوست معتبر نیست." }, { status: 400 });
    }

    const storage = supabase.storage.from("ornova-private");
    const { data: object, error: downloadError } = await storage.download(body.storage_path);
    if (downloadError || !object) return NextResponse.json({ error: "فایل بارگذاری‌شده پیدا نشد؛ دوباره تلاش کنید." }, { status: 400 });
    if (object.size !== metadata.size_bytes || object.type !== metadata.content_type || !(await hasAllowedFileSignature(object))) {
      await storage.remove([body.storage_path]);
      return NextResponse.json({ error: "محتوای فایل با قالب یا اندازه‌ی اعلام‌شده هم‌خوانی ندارد." }, { status: 400 });
    }

    const { error: recordError } = await supabase.from("inquiry_files").insert({ inquiry_id: id, storage_path: body.storage_path, ...metadata });
    if (recordError) {
      await storage.remove([body.storage_path]);
      return NextResponse.json({ error: "ثبت مشخصات فایل انجام نشد." }, { status: 503 });
    }

    return NextResponse.json({ uploaded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "سرویس فایل فعلاً در دسترس نیست." }, { status: 503 });
  }
}
