import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readInquiryItems } from "@/lib/account/inquiry-items";
import { readInquiryQuotes } from "@/lib/account/inquiry-quotes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") {
      return NextResponse.json({ error: "نشست حساب بررسی نشد." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    if (!user) return NextResponse.json({ error: "برای دیدن پرونده وارد حساب شوید." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

    const { data, error } = await supabase
      .from("inquiries")
      .select("id,status,created_at,message")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: "پرونده‌های درخواست فعلاً بارگذاری نشدند." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    const inquiries = data ?? [];
    if (!inquiries.length) return NextResponse.json({ inquiries: [], items: [], files: [], quotes: [], detailsError: false, quoteError: false, quoteReadAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });

    const ids = inquiries.map((item) => item.id);
    const [itemResult, fileResult, quoteResult] = await Promise.all([
      readInquiryItems(supabase, ids),
      supabase.from("inquiry_files").select("id,inquiry_id,original_name").in("inquiry_id", ids),
      readInquiryQuotes(supabase, ids),
    ]);
    return NextResponse.json({
      inquiries,
      items: itemResult.error ? [] : itemResult.data ?? [],
      files: fileResult.error ? [] : fileResult.data ?? [],
      quotes: quoteResult.data,
      detailsError: Boolean(itemResult.error || fileResult.error),
      quoteError: quoteResult.error,
      quoteReadAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "سرویس پرونده‌های حساب فعلاً در دسترس نیست." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
