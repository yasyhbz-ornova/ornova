import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "حساب Ornova | Ornova by Yas", robots: { index: false, follow: false } };

const statusLabels: Record<string, string> = { received: "دریافت شد", reviewing: "در حال بررسی", needs_info: "نیازمند اطلاعات", quoted: "پیشنهاد آماده است", approved: "تأیید شده", closed: "بسته شده" };

export default async function AccountPage() {
  let user = null;
  let inquiries: { id: string; status: string; created_at: string; message: string }[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
    if (user) {
      const { data } = await supabase.from("inquiries").select("id,status,created_at,message").order("created_at", { ascending: false });
      inquiries = data ?? [];
    }
  } catch {
    user = null;
  }

  return <main className="account-space mx-auto max-w-6xl px-5 py-16"><div className="account-heading"><p className="ritual-label">فضای شخصی Ornova</p><h1>{user ? "پرونده‌های شما" : "جایی برای ادامهٔ مسیر"}</h1><p>{user ? `وارد شده با ${user.email ?? "ایمیل شما"}` : "پس از ورود، درخواست‌ها و مسیرهای طراحی شما در یک فضای خصوصی و آرام نگهداری می‌شوند."}</p></div>{user ? <section className="account-inquiries"><div className="account-section-title"><h2>درخواست‌های من</h2><Link href="/contact" className="text-sm text-sapphire">درخواست جدید ←</Link></div>{inquiries.length > 0 ? <div className="account-list">{inquiries.map((inquiry) => <article key={inquiry.id}><div><p className="text-xs text-sapphire">{new Date(inquiry.created_at).toLocaleDateString("fa-IR")}</p><h3>{statusLabels[inquiry.status] ?? "در حال بررسی"}</h3></div><p>{inquiry.message}</p></article>)}</div> : <div className="account-empty"><p>هنوز درخواستی در پروندهٔ شما ثبت نشده است.</p><Link href="/custom-design" className="ritual-line">شروع یک طراحی اختصاصی ←</Link></div>}</section> : <section className="account-gate"><h2>برای دیدن پروندهٔ خود وارد شوید.</h2><p>ورود با لینک یک‌بارمصرف انجام می‌شود و رمز عبوری در Ornova ذخیره نمی‌شود.</p><Link href="/login" className="ritual-solid">ورود به حساب</Link></section>}<section className="account-private"><p>اطلاعات این بخش فقط برای حساب شما قابل مشاهده است. فایل‌های ارسال‌شده در فضای خصوصی نگهداری می‌شوند.</p></section></main>;
}
