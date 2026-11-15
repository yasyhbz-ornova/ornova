import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inquiryIdSchema = z.string().uuid();
// Price and approval states stay unavailable until a real quote/acceptance record exists.
const statusSchema = z.enum(["received", "reviewing", "needs_info", "closed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });

  try {
    const { id } = await params;
    if (!inquiryIdSchema.safeParse(id).success) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const parsed = z.object({ status: statusSchema }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "وضعیت انتخاب‌شده معتبر نیست." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isOrnovaStaff(user)) return NextResponse.json({ error: "دسترسی به میز بررسی مجاز نیست." }, { status: 403 });

    const { data: inquiry, error } = await supabase
      .from("inquiries")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id,status,updated_at")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "تغییر وضعیت انجام نشد." }, { status: 503 });
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    return NextResponse.json({ inquiry });
  } catch {
    return NextResponse.json({ error: "سرویس میز بررسی فعلاً در دسترس نیست." }, { status: 503 });
  }
}
