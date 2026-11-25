import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readInquiryItems } from "@/lib/account/inquiry-items";
import { readInquiryQuotes } from "@/lib/account/inquiry-quotes";
import { readInquiryReceipt, readReceiptSummaries, type ReceiptList } from "@/lib/account/inquiry-receipts";
import { isQuoteDocumentId } from "@/lib/account/quote-document";

export const dynamic = "force-dynamic";

const receiptPageSize = 20;
const noStore = { "Cache-Control": "private, no-store" };
const unavailable = "پرونده‌های درخواست فعلاً بارگذاری نشدند.";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") {
      return errorResponse("نشست حساب بررسی نشد.", 503);
    }
    if (!user) return errorResponse("برای دیدن پرونده وارد حساب شوید.", 401);

    const params = new URL(request.url).searchParams;
    if (params.get("view") === "receipts") {
      const requestedId = params.get("receiptId");
      if (requestedId !== null) {
        if (!isQuoteDocumentId(requestedId)) return errorResponse("شناسهٔ رسید معتبر نیست.", 400);
        const id = requestedId.toLowerCase();
        const { data: inquiry, error } = await supabase.from("inquiries")
          .select("id,status,created_at,message")
          .eq("user_id", user.id)
          .eq("id", id)
          .maybeSingle();
        if (error) return errorResponse(unavailable, 503);
        if (!inquiry) return errorResponse("رسید درخواست پیدا نشد.", 404);

        const detail = await readInquiryReceipt(supabase, inquiry);
        if (!detail) return errorResponse(unavailable, 503);
        return NextResponse.json(detail, { headers: noStore });
      }

      const page = params.get("page") ?? "1";
      if (!/^[1-9]\d{0,6}$/.test(page)) return errorResponse("شمارهٔ صفحه معتبر نیست.", 400);
      const start = (Number(page) - 1) * receiptPageSize;
      const { data, error } = await supabase.from("inquiries")
        .select("id,status,created_at,message")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + receiptPageSize);
      if (error) return errorResponse(unavailable, 503);
      const rows = data ?? [];
      const list: ReceiptList = {
        receipts: await readReceiptSummaries(supabase, rows.slice(0, receiptPageSize)),
        hasMore: rows.length > receiptPageSize,
      };
      return NextResponse.json(list, { headers: noStore });
    }

    const { data, error } = await supabase
      .from("inquiries")
      .select("id,status,created_at,message")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return errorResponse(unavailable, 503);
    const inquiries = data ?? [];
    if (!inquiries.length) return NextResponse.json({ inquiries: [], items: [], files: [], quotes: [], detailsError: false, quoteError: false, quoteReadAt: new Date().toISOString() }, { headers: noStore });

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
    }, { headers: noStore });
  } catch {
    return errorResponse("سرویس پرونده‌های حساب فعلاً در دسترس نیست.", 503);
  }
}
