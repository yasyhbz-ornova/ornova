"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseRialInput } from "@/lib/commerce/quote-money";
import type { FinancePayment } from "@/lib/admin/finance-account";

type Draft = { id: string; amount: string; reference: string; paidAt: string; note: string };
const fresh = (): Draft => ({ id: crypto.randomUUID(), amount: "", reference: "", paidAt: "", note: "" });
const money = (value: string) => `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} ریال`;
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

export default function ManualPaymentEditor({ inquiryId, balanceRial, payments }: { inquiryId: string; balanceRial: string; payments: FinancePayment[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(fresh);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const edit = (change: Partial<Draft>) => { setDraft(current => ({ ...current, ...change, id: crypto.randomUUID() })); setMessage(""); };
  const submit = async (payload: unknown) => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/finance/payments", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setMessage(typeof data.error === "string" ? data.error : "ثبت انجام نشد."); return false; }
      router.refresh();
      setMessage("ثبت شد؛ دفتر در حال به‌روزرسانی است.");
      return true;
    } catch { setMessage("ارتباط برقرار نشد؛ دوباره تلاش کنید."); return false; }
    finally { setBusy(false); }
  };
  const record = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = parseRialInput(draft.amount);
    if (!amount || amount === "0" || BigInt(amount) > BigInt(balanceRial)) { setMessage("مبلغ دریافت باید مثبت و کمتر یا برابر مانده باشد."); return; }
    const paidAt = new Date(draft.paidAt);
    if (!draft.paidAt || !Number.isFinite(paidAt.getTime()) || !draft.reference.trim()) { setMessage("تاریخ دریافت و شناسهٔ پیگیری را کامل کنید."); return; }
    const success = await submit({ action: "record", id: draft.id, inquiry_id: inquiryId, amount_rial: amount, reference: draft.reference.trim(), paid_at: paidAt.toISOString(), note: draft.note.trim() || null });
    if (success) setDraft(fresh());
  };
  const reverse = async (id: string) => {
    if (!reason.trim()) { setMessage("دلیل برگشت را بنویسید."); return; }
    const success = await submit({ action: "reverse", record_id: id, reason: reason.trim() });
    if (success) { setReverseId(null); setReason(""); }
  };
  return <section className="mt-9 space-y-8" aria-label="دریافت‌های دستی">
    <div className="border border-silver bg-ivory-soft p-5">
      <h2 className="text-xl text-graphite">ثبت دریافت دستی</h2>
      <p className="mt-2 text-sm leading-7 text-graphite/75">این ثبت، تأیید دستی مدیر بر اساس سند دریافت است؛ پرداخت آنلاین یا فاکتور رسمی صادر نمی‌کند. مانده: <bdi>{money(balanceRial)}</bdi></p>
      <form onSubmit={record} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">مبلغ دریافت، ریال<input required inputMode="numeric" value={draft.amount} onChange={event => edit({ amount: event.target.value })} className="mt-2 w-full border border-silver bg-white p-3" /></label>
        <label className="text-sm">شناسهٔ پیگیری یکتا<input required maxLength={120} value={draft.reference} onChange={event => edit({ reference: event.target.value })} className="mt-2 w-full border border-silver bg-white p-3" /></label>
        <label className="text-sm">زمان واقعی دریافت<input required type="datetime-local" value={draft.paidAt} onChange={event => edit({ paidAt: event.target.value })} className="mt-2 w-full border border-silver bg-white p-3" /></label>
        <label className="text-sm">یادداشت اختیاری<input maxLength={500} value={draft.note} onChange={event => edit({ note: event.target.value })} className="mt-2 w-full border border-silver bg-white p-3" /></label>
        <button disabled={busy || balanceRial === "0"} className="border border-sapphire bg-sapphire px-5 py-3 text-white disabled:opacity-50">ثبت دریافت</button>
      </form>
    </div>
    <div>
      <h2 className="text-xl text-graphite">سوابق دریافت</h2>
      {payments.length === 0 ? <p className="mt-4 text-sm">هنوز دریافتی ثبت نشده است.</p> : <ul className="mt-4 space-y-3">{payments.map(item => <li key={item.id} className="border border-silver p-4 text-sm leading-7">
        <div className="flex flex-wrap justify-between gap-3"><span><bdi>{money(item.amountRial)}</bdi> · پیگیری <bdi>{item.reference}</bdi></span><span>{item.reversedAt ? "برگشت‌خورده" : "فعال"}</span></div>
        <p className="text-graphite/70">دریافت: {date(item.paidAt)} · ثبت در دفتر: {date(item.recordedAt)}</p>
        {item.note && <p>یادداشت: {item.note}</p>}
        {item.reversedAt ? <p>برگشت: {date(item.reversedAt)} · دلیل: {item.reversalReason}</p> : <div className="mt-2">
          {reverseId === item.id ? <div className="flex flex-wrap gap-2"><input aria-label="دلیل برگشت" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className="min-w-56 flex-1 border border-silver p-2" /><button type="button" disabled={busy} onClick={() => reverse(item.id)} className="text-sapphire underline">ثبت برگشت</button><button type="button" onClick={() => { setReverseId(null); setReason(""); }} className="underline">انصراف</button></div> : <button type="button" onClick={() => setReverseId(item.id)} className="text-sapphire underline">برگشت با ثبت دلیل</button>}
        </div>}
      </li>)}</ul>}
    </div>
    {message && <p role="status" className="border-r-2 border-silver p-3 text-sm">{message}</p>}
  </section>;
}
