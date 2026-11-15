import { redirect } from "next/navigation";

export const metadata = {
  title: "فهرست قطعات | کانسپت Ornova by Yas",
  description: "مطالعه‌ی یک آرشیو تعاملی برای دیدن، مقایسه و درخواست قیمت قطعات Ornova.",
  robots: { index: false, follow: false },
};

export default function ShopArchiveConceptPage() {
  redirect("/");
}
