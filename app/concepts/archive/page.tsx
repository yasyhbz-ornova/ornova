import { redirect } from "next/navigation";

export const metadata = {
  title: "آرشیو ماهتابی | Ornova by Yas",
  description: "Concept مستقل آرشیو ماهتابی برای تجربه اصلی Ornova.",
  robots: { index: false, follow: false },
};

export default function ArchiveConceptPage() {
  redirect("/");
}
