import { redirect } from "next/navigation";

export const metadata = {
  title: "آرشیو قطعه‌ها | کانسپت Ornova by Yas",
  description: "کانسپت تعاملی آرشیو و پرونده‌ی قطعه‌های واقعی Ornova.",
  robots: { index: false, follow: false },
};

export default function AftertonePage() {
  redirect("/");
}
