import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inquiryIdSchema = z.string().uuid();
const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!inquiryIdSchema.safeParse(id).success) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای دیدن گفت‌وگو وارد حساب شوید." }, { status: 401 });

    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (inquiryError) return NextResponse.json({ error: "گفت‌وگو فعلاً بارگذاری نشد." }, { status: 503 });
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const [messageResult, eventResult] = await Promise.all([
      supabase.from("inquiry_messages").select("id,author_role,body,created_at").eq("inquiry_id", id).order("created_at").order("id"),
      supabase.from("inquiry_events").select("id,previous_status,status,created_at").eq("inquiry_id", id).order("created_at").order("id"),
    ]);
    if (messageResult.error || eventResult.error) return NextResponse.json({ error: "گفت‌وگو فعلاً بارگذاری نشد." }, { status: 503 });

    return NextResponse.json({ status: inquiry.status, messages: messageResult.data ?? [], events: eventResult.data ?? [] });
  } catch {
    return NextResponse.json({ error: "سرویس گفت‌وگو فعلاً در دسترس نیست." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });

  try {
    const { id } = await params;
    if (!inquiryIdSchema.safeParse(id).success) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const parsed = messageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "پیام باید بین ۱ تا ۴۰۰۰ نویسه باشد." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای ارسال پیام وارد حساب شوید." }, { status: 401 });

    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (inquiryError) return NextResponse.json({ error: "ثبت پیام فعلاً ممکن نشد." }, { status: 503 });
    if (!inquiry) return NextResponse.json({ error: "درخواست پیدا نشد." }, { status: 404 });

    const authorRole = isOrnovaStaff(user) ? "staff" : "customer";
    if (authorRole === "customer" && inquiry.status === "closed") {
      return NextResponse.json({ error: "این پرونده بسته شده است. برای پیگیری تازه، درخواست جدیدی ثبت کنید." }, { status: 409 });
    }

    const { data: message, error: insertError } = await supabase
      .from("inquiry_messages")
      .insert({ inquiry_id: id, author_user_id: user.id, author_role: authorRole, body: parsed.data.body })
      .select("id,author_role,body,created_at")
      .single();
    if (insertError || !message) return NextResponse.json({ error: "ثبت پیام انجام نشد." }, { status: 503 });

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "سرویس پیام‌رسانی فعلاً در دسترس نیست." }, { status: 503 });
  }
}
