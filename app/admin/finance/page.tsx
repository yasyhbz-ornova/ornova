import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FINANCE_PAGE_SIZE, readFinanceRegister } from "@/lib/admin/finance-register";

export const dynamic = "force-dynamic";
export const metadata = { title: "دفتر پذیرش‌های مالی | Ornova by Yas", robots: { index: false, follow: false } };
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));
const rial = (value: bigint) => `${new Intl.NumberFormat("fa-IR").format(value)} ریال`;

export default async function FinancePage({ searchParams }: { searchParams?: Promise<{ page?: string | string[] }> }) {
  let client;
  try { client = await createSupabaseServerClient(); }
  catch { return <main dir="rtl" className="account-space mx-auto max-w-6xl px-5 py-16"><p role="alert">اتصال امن دفتر مالی برقرار نشد.</p></main>; }
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || !isOrnovaStaff(user)) notFound();
  const query = await searchParams;
  const parsed = z.strictObject({ page: z.string().regex(/^[1-9][0-9]{0,3}$/).optional() }).safeParse(query ?? {});
  if (!parsed.success) notFound();
  const page = Number(parsed.data.page ?? "1");
  const result = await readFinanceRegister(client, page);
  const pageTotal = result.data.reduce((sum, row) => sum + BigInt(row.amountRial), BigInt(0));
  const pageReceived = result.data.reduce((sum, row) => sum + BigInt(row.receivedRial), BigInt(0));
  const hasNext = !result.error && page * FINANCE_PAGE_SIZE < result.count;
  return <main dir="rtl" className="account-space mx-auto max-w-6xl px-5 py-12 md:py-16">
    <nav aria-label="میز مدیریت" className="mb-8 text-sm text-sapphire"><Link href="/admin" className="underline underline-offset-4">بازگشت به پرونده‌ها</Link></nav>
    <p className="ritual-label">میز مالی / Ornova by Yas</p>
    <h1 className="mt-3 text-3xl text-graphite">دفتر پذیرش‌های مالی</h1>
    <p className="mt-3 max-w-3xl text-sm leading-8 text-graphite/75">مبالغ بر اساس نسخهٔ پذیرفته‌شده و دریافت‌های دستی مدیر ثبت شده‌اند. این دفتر پرداخت آنلاین یا فاکتور رسمی نیست.</p>
    {result.error ? <p className="mt-8 border-r-2 border-silver px-4 py-3 text-sm" role="alert">داده‌های دفتر مالی فعلاً خوانده نشدند؛ دوباره تلاش کنید.</p>
      : result.data.length === 0 ? <p className="mt-8 border border-silver bg-ivory-soft p-6 text-sm">در این صفحه پذیرشی ثبت نشده است.</p>
      : <>
        <div className="mt-8 overflow-x-auto border border-silver bg-ivory-soft">
          <table className="w-full min-w-[860px] text-right text-sm">
            <caption className="sr-only">پذیرش‌های مالی ثبت‌شده</caption>
            <thead><tr className="border-b border-silver text-graphite/65"><th scope="col" className="p-4 font-normal">زمان پذیرش</th><th scope="col" className="p-4 font-normal">مشتری</th><th scope="col" className="p-4 font-normal">پیشنهاد و نسخه</th><th scope="col" className="p-4 font-normal">مبلغ پذیرفته‌شده</th><th scope="col" className="p-4 font-normal">دریافت فعال</th><th scope="col" className="p-4 font-normal">مانده</th><th scope="col" className="p-4 font-normal">پرونده</th></tr></thead>
            <tbody>{result.data.map(row => <tr key={row.quoteId} className="border-b border-silver/60 last:border-b-0"><td className="p-4 whitespace-nowrap">{date(row.acceptedAt)}</td><td className="p-4">{row.customerName}</td><td className="p-4"><bdi>{row.quoteNo}</bdi> · نسخهٔ {row.revision.toLocaleString("fa-IR")}<br /><span className="text-xs text-graphite/65">سفارش <bdi>{row.orderNo}</bdi></span></td><td className="p-4 whitespace-nowrap tabular-nums">{rial(BigInt(row.amountRial))}</td><td className="p-4 whitespace-nowrap tabular-nums">{rial(BigInt(row.receivedRial))}</td><td className="p-4 whitespace-nowrap tabular-nums">{rial(BigInt(row.balanceRial))}</td><td className="p-4"><Link href={`/admin/finance/${encodeURIComponent(row.inquiryId)}`} className="text-sapphire underline underline-offset-4">دفتر دریافت‌ها</Link></td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-graphite/75">جمع همین صفحه: مبلغ پذیرفته‌شده <bdi>{rial(pageTotal)}</bdi> · دریافت فعال <bdi>{rial(pageReceived)}</bdi> · مانده <bdi>{rial(pageTotal - pageReceived)}</bdi></p>
      </>}
    {!result.error && <nav aria-label="صفحات دفتر مالی" className="mt-8 flex items-center gap-5 text-sm"><span>صفحهٔ {page.toLocaleString("fa-IR")}</span>{page > 1 && <Link href={`/admin/finance?page=${page - 1}`} className="text-sapphire underline underline-offset-4">صفحهٔ پیش</Link>}{hasNext && <Link href={`/admin/finance?page=${page + 1}`} className="text-sapphire underline underline-offset-4">صفحهٔ بعد</Link>}</nav>}
  </main>;
}
