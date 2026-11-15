import { redirect } from "next/navigation";

export const metadata = {
  title: "ماندِ تصویر | کانسپت Ornova by Yas",
  description: "مسیر تصویری و فروش‌محور Ornova با تکیه بر قطعات واقعی و پرونده‌ی هر قطعه.",
  robots: { index: false, follow: false },
};

export default function AfterimagePage() {
  redirect("/");
}
