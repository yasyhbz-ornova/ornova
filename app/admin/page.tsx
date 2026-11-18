import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { InquiryDesk } from "@/components/admin/InquiryDesk";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readInquiryItems } from "@/lib/account/inquiry-items";
import { readInquiryQuotes } from "@/lib/account/inquiry-quotes";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "مدیریت | Ornova by Yas",
  robots: { index: false, follow: false },
};

type StaffInquiry = {
  id: string;
  status: "received" | "reviewing" | "needs_info" | "quoted" | "approved" | "closed";
  created_at: string;
  message: string;
  contact: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_design_note: string | null;
  items: { product_name: string; quantity: number; preferences: unknown }[];
  files: { id: string; original_name: string }[];
};

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ inquiry?: string | string[] }> }) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <div className="account-space mx-auto max-w-6xl px-5 py-16"><p role="alert">اتصال امن میز بررسی برقرار نشد.</p></div>;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/?galleryPanel=account&next=%2Fadmin");
  if (!isOrnovaStaff(user)) return <AdminAccessDenied returnTo="/admin" />;
  const query = await searchParams;
  let initialInquiryId: string | undefined;
  if (query?.inquiry !== undefined) {
    const parsed = z.string().uuid().safeParse(query.inquiry);
    if (!parsed.success) notFound();
    initialInquiryId = parsed.data.toLowerCase();
  }
  const calculatorLink = <nav aria-label="میز مدیریت" className="mb-6 flex flex-wrap gap-5 text-sm text-sapphire"><Link href="/admin/pricing" className="underline underline-offset-4">محاسبهٔ قیمت</Link><Link href="/admin/catalog" className="underline underline-offset-4">مدیریت آثار</Link><Link href="/admin/finance" className="underline underline-offset-4">دفتر پذیرش‌های مالی</Link></nav>;

  const { data: rows, error } = await supabase
    .from("inquiries")
    .select("id,user_id,customer_name,status,created_at,message,contact")
    .order("created_at", { ascending: false });
  if (error) return <div className="account-space mx-auto max-w-6xl px-5 py-16">{calculatorLink}<p role="alert">پرونده‌ها فعلاً بارگذاری نشدند. کمی بعد دوباره تلاش کنید.</p></div>;

  const inquiries = rows ?? [];
  if (initialInquiryId && !inquiries.some(inquiry => inquiry.id === initialInquiryId)) notFound();
  if (inquiries.length === 0) {
    return <div className="account-space mx-auto max-w-6xl px-5 py-16">{calculatorLink}<p className="ritual-label">میز بررسی / Ornova by Yas</p><h1 className="mt-3 text-3xl text-graphite">هنوز پرونده‌ای نرسیده است.</h1></div>;
  }

  const ids = inquiries.map((inquiry) => inquiry.id);
  const userIds = [...new Set(inquiries.map((inquiry) => inquiry.user_id))];
  const [itemResult, profileResult, fileResult, quoteResult] = await Promise.all([
    readInquiryItems(supabase, ids),
    supabase.from("profiles").select("id,display_name,phone,design_note").in("id", userIds),
    supabase.from("inquiry_files").select("id,inquiry_id,original_name").in("inquiry_id", ids),
    readInquiryQuotes(supabase, ids),
  ]);
  if (itemResult.error || profileResult.error || fileResult.error) return <div className="account-space mx-auto max-w-6xl px-5 py-16">{calculatorLink}<p role="alert">جزئیات پرونده‌ها فعلاً بارگذاری نشد. کمی بعد دوباره تلاش کنید.</p></div>;

  const profiles = profileResult.data ?? [];
  const items = itemResult.data ?? [];
  const files = fileResult.data ?? [];
  const staffInquiries: StaffInquiry[] = inquiries.map((inquiry) => {
    const profile = profiles.find((item) => item.id === inquiry.user_id);
    return {
      id: inquiry.id,
      status: inquiry.status as StaffInquiry["status"],
      created_at: inquiry.created_at,
      message: inquiry.message,
      contact: inquiry.contact,
      customer_name: inquiry.customer_name ?? profile?.display_name ?? null,
      customer_phone: profile?.phone ?? null,
      customer_design_note: profile?.design_note ?? null,
      items: items.filter((item) => item.inquiry_id === inquiry.id).map((item) => ({ product_name: item.product_name, quantity: item.quantity, preferences: item.preferences })),
      files: files.filter((file) => file.inquiry_id === inquiry.id).map((file) => ({ id: file.id, original_name: file.original_name })),
    };
  });

  return <div className="account-space mx-auto max-w-6xl px-5 py-16">{calculatorLink}<div className="account-heading"><p className="ritual-label">میز بررسی / Ornova by Yas</p><h1>پرونده‌ها را با دقت دنبال کنیم.</h1><p>درخواست، گفت‌وگو و مرحله‌ی بعد در یک مسیر خصوصی کنار هم می‌مانند.</p></div><InquiryDesk key={`${user.id}:${initialInquiryId ?? "all"}`} initialInquiryId={initialInquiryId} inquiries={staffInquiries} quotes={quoteResult.data} quotesError={quoteResult.error} quoteReadAt={new Date().toISOString()} quoteEnabled={/^[a-zA-Z0-9_-]{1,80}$/.test(process.env.ORNOVA_PCS_SOURCE_KEY ?? "")} /></div>;
}
