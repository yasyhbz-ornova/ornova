import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/auth/authorization";
import { createInquiryStoragePath, normalizeUploadMetadata } from "@/lib/security/file-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403, headers: noStore });
  }

  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404, headers: noStore });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای پیوست فایل باید وارد حساب شوید." }, { status: 401, headers: noStore });

    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id,status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (inquiryError) return NextResponse.json({ error: "بررسی درخواست فعلاً ممکن نشد." }, { status: 503, headers: noStore });
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404, headers: noStore });
    if (inquiry.status === "closed") return NextResponse.json({ error: "این پرونده بسته شده است؛ برای پیگیری تازه درخواست جدیدی ثبت کنید." }, { status: 409, headers: noStore });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 8192) return NextResponse.json({ error: "اطلاعات فایل معتبر نیست." }, { status: 413, headers: noStore });

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: "اطلاعات فایل معتبر نیست." }, { status: 400, headers: noStore });
    }

    const metadata = normalizeUploadMetadata(requestBody);
    if (!metadata) return NextResponse.json({ error: "فایل باید تصویر JPEG، PNG، WebP یا PDF و حداکثر ۱۰ مگابایت باشد." }, { status: 400, headers: noStore });

    const storagePath = createInquiryStoragePath(user.id, id, metadata.original_name, crypto.randomUUID());
    const { data, error } = await supabase.storage.from("ornova-private").createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data) return NextResponse.json({ error: "آماده‌سازی بارگذاری فایل انجام نشد." }, { status: 503, headers: noStore });

    return NextResponse.json({ storage_path: storagePath, token: data.token }, { status: 201, headers: noStore });
  } catch {
    return NextResponse.json({ error: "سرویس فایل فعلاً در دسترس نیست." }, { status: 503, headers: noStore });
  }
}
