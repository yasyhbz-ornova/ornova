import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/inputs";

export const dynamic = "force-dynamic";
export const metadata = { title: "حساب اُرنوا | Ornova by Yas", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ complete?: string; next?: string; signout?: string }> }) {
  const { complete, next, signout } = await searchParams;
  const params = new URLSearchParams({ galleryPanel: "account" });
  if (complete === "1") params.set("complete", "1");
  if (typeof next === "string") params.set("next", safeInternalPath(next, "/?galleryPanel=account"));
  if (signout === "failed") params.set("signout", "failed");
  redirect(`/?${params.toString()}`);
}
