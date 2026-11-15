import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { readFinanceAccount } from "@/lib/admin/finance-account";
import ManualPaymentEditor from "@/components/admin/ManualPaymentEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "جزئیات دفتر مالی | Ornova by Yas", robots: { index: false, follow: false } };
const money = (value: string) => `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

export default async function FinanceAccountPage({ params }: { params: Promise<{ inquiryId: string }> }) {
  let client;
  try { client = await createSupabaseServerClient(); } catch { notFound(); }
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !isOrnovaStaff(user)) notFound();
  const { inquiryId } = await params;
  if (!z.string().uuid().safeParse(inquiryId).success) notFound();
  const account = await readFinanceAccount(client, inquiryId);
  if (!account) return <main dir="rtl" className="account-space mx-auto max-w-5xl px-5 py-12"><Link href="/admin/finance" className="text-sapphire underline">بازگشت به دفتر مالی</Link><p role="alert" className="mt-8">پروندهٔ مالی پیدا نشد یا اطلاعات آن کامل خوانده نشد.</p></main>;
  return <main dir="rtl" className="account-space mx-auto max-w-5xl px-5 py-12 md:py-16">
    <nav className="text-sm text-sapphire"><Link href="/admin/finance" className="underline underline-offset-4">بازگشت به دفتر مالی</Link></nav>
    <h1 className="mt-5 text-3xl text-graphite">پروندهٔ مالی {account.customerName}</h1>
    <p className="mt-2 text-sm leading-7 text-graphite/75">سفارش <bdi>{account.orderNo}</bdi> · پیشنهاد <bdi>{account.quoteNo}</bdi> · نسخهٔ {account.revision.toLocaleString("fa-IR")} · پذیرش {date(account.acceptedAt)}</p>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{[["مبلغ پذیرفته‌شده", account.amountRial], ["دریافت فعال", account.receivedRial], ["مانده", account.balanceRial]].map(([label, value]) => <div key={label} className="border border-silver bg-ivory-soft p-5"><p className="text-sm text-graphite/70">{label}</p><p className="mt-2 text-xl text-graphite"><bdi>{money(value)}</bdi></p></div>)}</div>
    <ManualPaymentEditor inquiryId={inquiryId} balanceRial={account.balanceRial} payments={account.payments} />
  </main>;
}
