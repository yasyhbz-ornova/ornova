import { redirect } from "next/navigation";

export const metadata = {
  title: "آرشیو زندهٔ مهر | Ornova by Yas",
  description: "مطالعهٔ بصری آرشیو زندهٔ مهر برای تجربهٔ دیجیتال Ornova.",
  robots: { index: false, follow: false },
};

export default function TraceConceptPage() {
  redirect("/");
}
