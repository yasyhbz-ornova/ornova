import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "فایل باید تصویر یا PDF و حداکثر ۱۰ مگابایت باشد." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای بارگذاری فایل باید وارد حساب شوید." }, { status: 401 });

    const { data: inquiry } = await supabase.from("inquiries").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "reference";
    const storagePath = `${user.id}/${id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("ornova-private").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "بارگذاری فایل انجام نشد." }, { status: 500 });

    const { error: recordError } = await supabase.from("inquiry_files").insert({ inquiry_id: id, storage_path: storagePath, original_name: file.name.slice(0, 240), content_type: file.type, size_bytes: file.size });
    if (recordError) {
      await supabase.storage.from("ornova-private").remove([storagePath]);
      return NextResponse.json({ error: "ثبت مشخصات فایل انجام نشد." }, { status: 500 });
    }

    return NextResponse.json({ uploaded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "سرویس فایل فعلاً در دسترس نیست." }, { status: 503 });
  }
}
