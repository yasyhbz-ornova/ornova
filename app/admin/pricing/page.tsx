import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PricingCalculator } from "@/components/admin/PricingCalculator";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import type { PricingInquiryContext } from "@/components/admin/PricingCalculationRecords";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pricingConfig } from "@/lib/pricing/client";
import { pricingRecordsConfigured } from "@/lib/pricing/records-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "محاسبهٔ قیمت | Ornova by Yas", robots: { index: false, follow: false } };

export default async function PricingPage({ searchParams }: { searchParams?: Promise<{ inquiry?: string | string[] }> }) {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/?galleryPanel=account&next=%2Fadmin%2Fpricing");
  if (!isOrnovaStaff(user)) return <AdminAccessDenied returnTo="/admin/pricing" />;
  const query = await searchParams;
  let inquiry: PricingInquiryContext | undefined;
  if (query?.inquiry !== undefined) {
    const parsed = z.string().uuid().safeParse(query.inquiry);
    if (!parsed.success) notFound();
    const id = parsed.data.toLowerCase();
    const { data, error: readError } = await client.from("inquiries").select("id,customer_name,status").eq("id", id).maybeSingle();
    if (readError) throw new Error("خواندن پرونده فعلاً ممکن نیست؛ دوباره تلاش کنید.");
    if (!data) notFound();
    inquiry = { id, label: data.customer_name?.trim() || "پروندهٔ انتخاب‌شده", closed: data.status === "closed" };
  }
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
    <Link href="/admin" className="text-sm text-sapphire underline underline-offset-4">بازگشت به میز بررسی</Link>
    <header className="mt-8 max-w-2xl"><h1 className="text-2xl font-medium text-graphite">محاسبهٔ قیمت</h1><p className="mt-3 text-sm leading-7 text-graphite">نرخ‌ها و هزینه‌های بررسی‌شده را وارد کنید. این میز، محاسبهٔ داخلی است؛ نه ثبت پیشنهاد قیمت یا صدور فاکتور.</p></header>
    <PricingCalculator key={`${user.id}:${inquiry?.id ?? "standalone"}`} enabled={pricingConfig() !== null} inquiry={inquiry} storageEnabled={pricingRecordsConfigured()} />
  </div>;
}
