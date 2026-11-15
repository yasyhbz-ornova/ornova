import { redirect } from "next/navigation";

export const metadata = {
  title: "مسیرهای طراحی | Ornova by Yas",
  description: "چهار جهت مستقل برای مقایسه‌ی تجربه‌ی خانه‌ی Ornova؛ بدون تغییر صفحه‌ی اصلی.",
  robots: { index: false, follow: false },
};

export default function ConceptsPage() {
  redirect("/");
}
