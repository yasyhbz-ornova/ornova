import Link from "next/link";
import { redirect } from "next/navigation";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت آثار | Ornova by Yas", robots: { index: false, follow: false } };

export default async function CatalogAdminPage() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/?galleryPanel=account&next=%2Fadmin%2Fcatalog");
  if (!isOrnovaStaff(user)) return <main dir="rtl" className="account-space mx-auto max-w-2xl px-5 py-16">
    <h1 className="text-2xl text-graphite">دسترسی به میز آثار</h1>
    <p className="mt-4 text-sm leading-8 text-graphite/75">این نشست به میز مدیریت دسترسی ندارد. اگر با حساب مدیر وارد شده‌اید، از حساب خارج شوید و با همان ایمیل دوباره وارد شوید.</p>
    <Link href="/?galleryPanel=account&next=%2Fadmin%2Fcatalog" className="mt-6 inline-block border-b border-silver pb-1 text-sm text-sapphire">بازگشت به حساب</Link>
  </main>;
  return <main dir="rtl" className="account-space mx-auto max-w-6xl px-5 py-12 md:py-16">
    <p className="ritual-label">میز آثار / Ornova by Yas</p>
    <h1 className="mt-3 text-3xl text-graphite">کاتالوگ گالری</h1>
    <p className="mt-3 max-w-3xl text-sm leading-8 text-graphite/75">هر اثر ابتدا در بازبینی می‌ماند. انتشار آن، رسانهٔ اصلی، تصویر روی استند و تأیید جای‌گذاری را لازم دارد. مشخصات و قیمت تأییدنشده وارد نکنید.</p>
    <CatalogEditor />
  </main>;
}
