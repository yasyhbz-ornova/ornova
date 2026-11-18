import { redirect } from "next/navigation";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
import { isOrnovaStaff } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت آثار | Ornova by Yas", robots: { index: false, follow: false } };

export default async function CatalogAdminPage() {
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/?galleryPanel=account&next=%2Fadmin%2Fcatalog");
  if (!isOrnovaStaff(user)) return <AdminAccessDenied returnTo="/admin/catalog" />;
  return <main dir="rtl" className="account-space mx-auto max-w-6xl px-5 py-12 md:py-16">
    <p className="ritual-label">میز آثار / Ornova by Yas</p>
    <h1 className="mt-3 text-3xl text-graphite">کاتالوگ گالری</h1>
    <p className="mt-3 max-w-3xl text-sm leading-8 text-graphite/75">هر اثر ابتدا در بازبینی می‌ماند. انتشار آن، رسانهٔ اصلی، تصویر روی استند و تأیید جای‌گذاری را لازم دارد. مشخصات و قیمت تأییدنشده وارد نکنید.</p>
    <CatalogEditor />
  </main>;
}
