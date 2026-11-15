import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff, isSameOriginRequest } from "@/lib/auth/authorization";
import { readQuoteBody } from "@/lib/commerce/quote-request";
import { parsePricingRequest, parsePricingResponse } from "@/lib/pricing/contract";
import { requestPricingPreview, PricingRejected } from "@/lib/pricing/client";
import { calculationColumns, parseCalculationRecord, calculationMatches } from "@/lib/pricing/records";
import { createPricingRecordWriter, pricingRecordsSource, PricingRecordWriteError } from "@/lib/pricing/records-store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
function failure(status: number) {
  const error = status === 503 ? "ذخیره یا دریافت محاسبه فعلاً ممکن نیست؛ اتصال و ساختار داده باید بررسی شوند."
    : status === 409 ? "این درخواست با نسخهٔ ذخیره‌شده یا وضعیت پرونده سازگار نیست؛ پرونده را دوباره بررسی کنید."
    : status === 422 ? "موتور محاسبه این ورودی‌ها را نپذیرفت؛ مبلغ‌ها و دلیل تغییر قیمت را بررسی کنید."
    : status === 413 ? "حجم اطلاعات محاسبه بیش از حد مجاز است."
    : "محاسبهٔ درخواستی معتبر یا در دسترس نیست.";
  return NextResponse.json({ error }, { status, headers });
}
async function authorize(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { denied: 404 as const };
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { denied: 401 as const };
  if (!isOrnovaStaff(user)) return { denied: 403 as const };
  return { client, user };
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return failure(403);
  try {
    const id = (await params).id.toLowerCase(), access = await authorize(id);
    if (access.denied) return failure(access.denied);
    const { client, user } = access;
    const body = await readQuoteBody(request);
    if (body.status) return failure(body.status);
    const parsed = parsePricingRequest(body.value);
    if (!parsed.success) return failure(400);
    const source = pricingRecordsSource();
    if (!source) return failure(503);
    const inquiry = await client.from("inquiries").select("id,user_id,status").eq("id", id).maybeSingle();
    if (inquiry.error) return failure(503);
    if (!inquiry.data) return failure(404);
    const existing = await client.from("inquiry_pricing_calculations").select(calculationColumns).eq("request_id", parsed.data.request_id).maybeSingle();
    if (existing.error) return failure(503);
    if (existing.data) {
      const record = parseCalculationRecord(existing.data, id);
      if (existing.data.inquiry_id !== id) return failure(409);
      if (!record.success) return failure(503);
      if (!calculationMatches(record.data, parsed.data, source)) return failure(409);
      return NextResponse.json({ created: false, record: record.data }, { headers });
    }
    if (inquiry.data.status === "closed") return failure(409);
    const writer = createPricingRecordWriter();
    if (!writer) return failure(503);
    const native = await requestPricingPreview(parsed.data);
    const checked = parsePricingResponse(native, parsed.data);
    if (!checked.success) return failure(503);
    if (checked.data.result.total_rial === "0") return failure(422);
    const saved = await writer.save(id, inquiry.data.user_id, user.id, checked.data);
    return NextResponse.json(saved, { status: saved.created ? 201 : 200, headers });
  } catch (error) {
    return failure(error instanceof PricingRecordWriteError ? error.status : error instanceof PricingRejected ? 422 : 503);
  }
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id.toLowerCase(), access = await authorize(id);
    if (access.denied) return failure(access.denied);
    const search = new URL(request.url).searchParams, before = search.get("before");
    if ([...search.keys()].some(key => key !== "before") || search.getAll("before").length > 1 || (before !== null && (!/^[1-9][0-9]{0,4}$/.test(before) || Number(before) > 10000))) return failure(400);
    const inquiry = await access.client.from("inquiries").select("id").eq("id", id).maybeSingle();
    if (inquiry.error) return failure(503);
    if (!inquiry.data) return failure(404);
    let query = access.client.from("inquiry_pricing_calculations").select(calculationColumns).eq("inquiry_id", id).order("revision", { ascending: false });
    if (before !== null) query = query.lt("revision", Number(before));
    const result = await query.limit(21);
    if (result.error || !Array.isArray(result.data)) return failure(503);
    const records = [];
    for (const row of result.data) {
      const parsed = parseCalculationRecord(row, id);
      if (!parsed.success) return failure(503);
      records.push(parsed.data);
    }
    const page = records.slice(0, 20);
    return NextResponse.json({ records: page, next_before: records.length > 20 ? page.at(-1)!.revision : null }, { headers });
  } catch { return failure(503); }
}
