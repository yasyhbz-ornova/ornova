import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerQuoteDocument } from "@/components/account/CustomerQuoteDocument";
import { isQuoteDocumentId, readCustomerQuoteDocument } from "@/lib/account/quote-document";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "سند پیشنهاد قیمت | Ornova by Yas", robots: { index: false, follow: false } };

function UnavailableDocument({ href }: { href: string }) {
  return <section className="mx-auto max-w-2xl px-5 py-16" aria-labelledby="quote-unavailable-title">
    <h1 id="quote-unavailable-title" className="text-2xl font-medium">دریافت پیشنهاد فعلاً ممکن نیست.</h1>
    <p role="alert" className="mt-5 text-sm leading-8">دسترسی یا اطلاعات این نسخه تأیید نشد. برای دیدن وضعیت، پرونده‌های حساب را بررسی کنید یا دوباره وارد شوید.</p>
    <div className="mt-6 flex flex-wrap gap-6 text-sm text-sapphire"><Link href="/account">بازگشت به حساب من</Link><Link href={`/login?next=${encodeURIComponent(href)}`}>ورود دوباره</Link><a href={href}>دریافت دوبارهٔ همین نسخه</a></div>
  </section>;
}

export default async function QuoteDocumentPage({ params }: { params: Promise<{ inquiryId: string; quoteId: string }> }) {
  const route = await params;
  if (!isQuoteDocumentId(route.inquiryId) || !isQuoteDocumentId(route.quoteId)) notFound();
  const inquiryId = route.inquiryId.toLowerCase(), quoteId = route.quoteId.toLowerCase();
  const href = `/account/inquiries/${inquiryId}/quotes/${quoteId}`;
  let client;
  let user;
  let authenticationFailed = false;
  try {
    client = await createSupabaseServerClient();
    const auth = await client.auth.getUser();
    authenticationFailed = Boolean(auth.error && auth.error.name !== "AuthSessionMissingError");
    user = auth.data.user;
  } catch { authenticationFailed = true; }
  if (authenticationFailed || !client) return <UnavailableDocument href={href} />;
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const document = await readCustomerQuoteDocument(client, { ownerId: user.id, inquiryId, quoteId });
  if (document.kind === "not-found") notFound();
  if (document.kind === "unavailable") return <UnavailableDocument href={href} />;
  return <CustomerQuoteDocument quote={document.quote} isPreviousVersion={document.isPreviousVersion} checkedAt={document.checkedAt} />;
}
