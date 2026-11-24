import { redirect } from "next/navigation";
import { isStudioId } from "@/lib/studio/conversation";
import { createPageMetadata } from "@/lib/seo/page-metadata";

export const metadata = createPageMetadata({ title: "استودیو طراحی اختصاصی | Ornova by Yas", description: "از گفت‌وگو دربارهٔ ایده تا پیش‌طرح شخصی جواهر نقره؛ استودیوی طراحی اختصاصی Ornova.", canonical: "/custom-design" });

export default async function CustomDesignPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  const params = new URLSearchParams({ galleryPanel: "studio", customerPage: "idea" });
  if (isStudioId(draft)) params.set("draft", draft);
  redirect(`/?${params.toString()}`);
}
