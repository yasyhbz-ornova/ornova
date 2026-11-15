import { redirect } from "next/navigation";

export const metadata = {
  title: "سبد درخواست جواهر | Ornova by Yas",
  description: "قطعات انتخاب‌شده و طرح اولیه‌ی خود را مرور کنید و برای ارسال درخواست آماده شوید.",
  robots: { index: false, follow: false },
};

export default function RequestBasketPage() {
  redirect("/?galleryPanel=basket");
}
