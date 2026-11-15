import { redirect } from "next/navigation";

export const metadata = {
  title: "پژواک | کانسپت Ornova by Yas",
  description: "کانسپت تجربه‌ی Ornova با محوریت خاطره، قطعه‌ی واقعی و درخواست روشن.",
  robots: { index: false, follow: false },
};

export default function EchoConceptPage() {
  redirect("/");
}
