import { redirect } from "next/navigation";
import { getAuthCallbackErrorMessage, safeInternalPath } from "@/lib/auth/inputs";

export const metadata = {
  title: "ورود به حساب Ornova | Ornova by Yas",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const params = new URLSearchParams({ galleryPanel: "account" });
  params.set("next", safeInternalPath(typeof next === "string" ? next : null, "/?galleryPanel=account"));
  if (getAuthCallbackErrorMessage(typeof error === "string" ? error : null)) params.set("error", error!);
  redirect(`/?${params.toString()}`);
}
