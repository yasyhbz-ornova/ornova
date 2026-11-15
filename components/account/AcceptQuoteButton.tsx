"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptQuoteButton({ inquiryId, quoteId, onAccepted }: { inquiryId: string; quoteId: string; onAccepted?(acceptedAt: string): void }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!confirmed || pending || accepted) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/account/inquiries/${encodeURIComponent(inquiryId)}/quotes/${encodeURIComponent(quoteId)}/accept`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true }),
      });
      const result = await response.json() as { accepted_at?: string; error?: string };
      if (!response.ok || !result.accepted_at) throw new Error(result.error || "ثبت پذیرش انجام نشد. وضعیت پیشنهاد را دوباره بررسی کنید.");
      setAccepted(true);
      onAccepted?.(result.accepted_at);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت پذیرش انجام نشد."); }
    finally { setPending(false); }
  }
  return <section className="mt-6 border-t border-silver pt-5 text-sm leading-7" aria-label="پذیرش پیشنهاد قیمت">
    {accepted ? <p role="status">پذیرش این نسخه ثبت شد. برای مراحل بعدی با اُرنوا هماهنگ کنید.</p> : <>
      <label className="flex items-start gap-3"><input type="checkbox" className="mt-2 accent-sapphire" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={pending} /><span>مبلغ و جزئیات همین نسخهٔ پیشنهاد قیمت را خوانده‌ام و پذیرش آن را تأیید می‌کنم.</span></label>
      <button type="button" className="ritual-solid mt-4 min-h-11" disabled={!confirmed || pending} onClick={() => void submit()}>{pending ? "در حال ثبت…" : "ثبت پذیرش همین نسخه"}</button>
    </>}
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    <p className="mt-3 text-xs text-graphite/65">این پذیرش، پرداخت یا صدور فاکتور نهایی نیست.</p>
  </section>;
}
