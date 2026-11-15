import { createPageMetadata } from "@/lib/seo/page-metadata";

export const metadata = createPageMetadata({
  title: "ساخت یادداشت اولیه‌ی طراحی انگشتر | Ornova by Yas",
  description: "جهت اولیه‌ی فرم انگشتر را انتخاب کنید تا به‌صورت یادداشت برای بررسی طراحی Ornova پیوست شود.",
  canonical: "/ring-builder",
});

export default function RingBuilderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
