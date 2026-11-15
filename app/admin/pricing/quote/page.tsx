import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CalculatedQuoteEditor } from "@/components/admin/CalculatedQuoteEditor";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculationColumns, parseCalculationRecord } from "@/lib/pricing/records";
import { calculationQuoteBasis } from "@/lib/pricing/calculated-quote";
import { calculatedQuotesSource } from "@/lib/pricing/calculated-quote-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "بازبینی پیشنهاد قیمت | Ornova by Yas", robots: { index: false, follow: false } };
export default async function CalculatedQuotePage({ searchParams }: { searchParams?: Promise<{ inquiry?: string | string[]; calculation?: string | string[] }> }) {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !isOrnovaStaff(user)) notFound();
  const query = await searchParams;
  const inquiryId = z.string().uuid().safeParse(query?.inquiry), calculationId = z.string().uuid().safeParse(query?.calculation);
  if (!inquiryId.success || !calculationId.success) notFound();
  const id = inquiryId.data.toLowerCase(), calculation = calculationId.data.toLowerCase();
  const [inquiryResult, calculationResult] = await Promise.all([
    client.from("inquiries").select("id,customer_name,status").eq("id", id).maybeSingle(),
    client.from("inquiry_pricing_calculations").select(calculationColumns).eq("inquiry_id", id).eq("id", calculation).maybeSingle(),
  ]);
  if (inquiryResult.error || calculationResult.error) throw new Error("دریافت امن اطلاعات پیشنهاد فعلاً ممکن نیست؛ دوباره تلاش کنید.");
  if (!inquiryResult.data || inquiryResult.data.id?.toLowerCase() !== id) notFound();
  const record = parseCalculationRecord(calculationResult.data, id);
  if (!record.success || record.data.id !== calculation) notFound();
  const source = calculatedQuotesSource(), inquiry = { id, label: inquiryResult.data.customer_name?.trim() || "پروندهٔ انتخاب‌شده", closed: inquiryResult.data.status === "closed" };
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
    <Link href={`/admin/pricing?inquiry=${id}`} className="text-sm text-sapphire underline underline-offset-4">بازگشت به محاسبات پرونده</Link>
    <header className="mt-8 max-w-2xl"><h1 className="text-2xl font-medium text-graphite">بازبینی پیشنهاد قیمت</h1><p className="mt-3 text-sm leading-7 text-graphite">برای {inquiry.label} · از نسخهٔ {record.data.revision.toLocaleString("fa-IR")} محاسبه. فقط اطلاعات این پیشنهاد به مشتری نمایش داده می‌شود؛ نه هزینه و سود داخلی.</p></header>
    <CalculatedQuoteEditor key={`${user.id}:${id}:${calculation}`} inquiry={inquiry} basis={calculationQuoteBasis(record.data)} enabled={source !== null && record.data.source_key === source} />
  </div>;
}
