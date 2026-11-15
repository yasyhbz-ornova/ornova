import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "گالری طرح‌های شخصی | Ornova by Yas", robots: { index: false, follow: false } };

export default function GalleryPage() {
  redirect("/?galleryPanel=library");
}
