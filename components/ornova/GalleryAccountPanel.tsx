"use client";

import { useEffect, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { signOutCurrentSession } from "@/app/account/actions";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { InquiryConversation } from "@/components/account/InquiryConversation";
import { CustomerQuoteDocument } from "@/components/account/CustomerQuoteDocument";
import { InquiryQuoteCard } from "@/components/commerce/InquiryQuoteCard";
import { ProductPreferencesSummary } from "@/components/commerce/ProductPreferencesSummary";
import { getInquiryStatusGuidance, getInquiryStatusLabel } from "@/lib/commerce/inquiry-status";
import type { CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./VirtualGallery.module.css";

type AccountProfile = {
  display_name: string | null;
  phone: string | null;
  design_note: string | null;
  province: string | null;
  city: string | null;
  postal_code: string | null;
  address_line: string | null;
};

type PanelState = "checking" | "guest" | "signed-in" | "ready" | "unavailable";
type AccountIdentity = { phone: string; displayName: string };
type AccountInquiry = { id: string; status: string; created_at: string; message: string };
type InquiryItem = { inquiry_id: string; product_name: string; quantity: number; preferences?: unknown };
type InquiryFile = { id: string; inquiry_id: string; original_name: string };
type InquiryHistory = { inquiries: AccountInquiry[]; items: InquiryItem[]; files: InquiryFile[]; quotes: CustomerQuoteDTO[]; detailsError: boolean; quoteError: boolean; quoteReadAt: string };
type ActiveQuote = { quote: CustomerQuoteDTO; isPreviousVersion: boolean; checkedAt: string };

export function GalleryAccountPanel({ completionMode, initialError, signOutFailed = false, onReturnToBasket, nextDestination, prepareEmailDestination }: { completionMode: boolean; initialError?: string | null; signOutFailed?: boolean; onReturnToBasket?: () => void; nextDestination?: string; prepareEmailDestination?: () => string | null }) {
  const [state, setState] = useState<PanelState>("checking");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [profileUnavailable, setProfileUnavailable] = useState(false);
  const [history, setHistory] = useState<InquiryHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [activeQuote, setActiveQuote] = useState<ActiveQuote | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      setState("checking");
      setHistory(null);
      setHistoryError(false);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError && !isAuthSessionMissingError(authError)) throw authError;
        if (!user) { setIdentity(null); setProfile(null); setState("guest"); return; }

        const { data, error } = await supabase
          .from("profiles")
          .select("display_name,phone,design_note,province,city,postal_code,address_line")
          .maybeSingle();
        if (!active) return;
        setIdentity({
          phone: user.phone ?? "",
          displayName: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "",
        });
        setProfileUnavailable(Boolean(error));
        setProfile(error ? null : data as AccountProfile | null);
        setState(completionMode ? "ready" : "signed-in");
        if (!completionMode) {
          try {
            const response = await fetch("/api/account/inquiries", { cache: "no-store", signal: AbortSignal.timeout(15000) });
            const result = await response.json() as InquiryHistory & { error?: string };
            if (!response.ok) throw new Error(result.error ?? "history unavailable");
            if (active) { setHistory(result); setHistoryError(false); }
          } catch {
            if (active) setHistoryError(true);
          }
        }
      } catch {
        if (active) setState("unavailable");
      }
    }
    void loadSession();
    return () => { active = false; };
  }, [attempt, completionMode]);

  const profileForm = <ProfileForm
    displayName={profile?.display_name ?? identity?.displayName ?? ""}
    phone={profile?.phone ?? identity?.phone ?? ""}
    designNote={profile?.design_note ?? ""}
    province={profile?.province ?? ""}
    city={profile?.city ?? ""}
    postalCode={profile?.postal_code ?? ""}
    addressLine={profile?.address_line ?? ""}
    requireAddress={completionMode}
    galleryMode
    onReturnToGallery={completionMode ? onReturnToBasket : undefined}
    onSaved={setProfile}
  />;

  let content;
  if (state === "checking") content = <p className="text-sm leading-7 text-graphite/65" role="status">در حال بررسی حساب…</p>;
  else if (state === "unavailable") content = <div className="grid gap-3 text-sm leading-7 text-graphite/70" role="alert"><p>{prepareEmailDestination ? "حساب فعلاً در دسترس نیست. می‌توانی به ایده‌ات در کارگاه برگردی." : "اتصال امن حساب فعلاً پاسخ نداد؛ انتخاب‌های صندوق در همین مرورگر محفوظ‌اند."}</p><button type="button" className="w-fit border-b border-silver pb-1 text-sapphire" onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</button></div>;
  else if (state === "guest") content = <>
    <div className={styles.accountLogin}>
      <p className={styles.accountLoginHeading}>{completionMode ? "برای ادامهٔ درخواست، ابتدا با ایمیل وارد شو." : prepareEmailDestination ? "برای ورود یا ثبت‌نام، ایمیلت را وارد کن. لینک یک‌بارمصرف تو را به همین کارگاه برمی‌گرداند." : "لینک ورود یک‌بارمصرف به ایمیلت فرستاده می‌شود."}</p>
      <MagicLinkForm compact initialError={initialError} nextDestination={completionMode ? "/?galleryPanel=account&complete=1" : nextDestination} prepareEmailDestination={prepareEmailDestination} />
    </div>
  </>;
  else if (state === "signed-in") content = <details className={styles.accountProfile} open={profileUnavailable || undefined}>
    <summary>ویرایش تماس و نشانی</summary>
    {profileUnavailable && <p className="text-sm leading-7" role="status">اطلاعات قبلی در دسترس نیست. قبل از ثبت درخواست، تماس و نشانی را بررسی کن.</p>}
    {profileForm}
  </details>;
  else content = <div className="grid gap-4">
      {profileUnavailable && <p className="text-sm leading-7" role="status">نشانی قبلی در دسترس نیست. برای ادامهٔ درخواست، شمارهٔ تماس و نشانی را وارد کن.</p>}
      {profileForm}
    </div>;

  return <div className={styles.accountWorkflow}>
    {activeQuote ? <CustomerQuoteDocument quote={activeQuote.quote} isPreviousVersion={activeQuote.isPreviousVersion} checkedAt={activeQuote.checkedAt} embedded onBack={() => setActiveQuote(null)} onAccepted={(acceptedAt) => { setActiveQuote(current => current && { ...current, quote: { ...current.quote, accepted_at: acceptedAt } }); setHistory(current => current && { ...current, quotes: current.quotes.map(quote => quote.id === activeQuote.quote.id ? { ...quote, accepted_at: acceptedAt } : quote) }); }} /> : <>
    {signOutFailed && <p className="border-r-2 border-sapphire px-4 py-2 text-sm leading-7 text-graphite/70" role="alert">خروج از حساب انجام نشد؛ دوباره تلاش کن.</p>}
    {state === "ready" && completionMode && <p className="text-sm leading-7 text-graphite/75">پس از ذخیرهٔ شمارهٔ تماس و نشانی، به صندوق برمی‌گردی.</p>}
    {content}
    {state === "signed-in" && <section className={`${styles.accountHistory} account-inquiries`} aria-labelledby="gallery-account-inquiries-title">
      <div className="account-section-title"><h2 id="gallery-account-inquiries-title">درخواست‌های من</h2></div>
      {historyError ? <div className="account-empty" role="alert"><p>پرونده‌های درخواست فعلاً دریافت نشدند؛ این پیام به معنی حذف اطلاعات نیست.</p><button type="button" className="mt-4 text-sm text-sapphire underline underline-offset-4" onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</button></div>
        : !history ? <p className="account-empty" role="status">در حال بازکردن پرونده‌های خصوصی…</p>
        : history.inquiries.length === 0 ? <div className="account-empty"><p>هنوز درخواستی در پروندهٔ شما ثبت نشده است.</p></div>
        : <div className="account-list">
          {history.detailsError && <p className="account-empty" role="status">بخشی از جزئیات پیوست‌ها موقتاً در دسترس نیست؛ وضعیت درخواست‌ها نمایش داده می‌شود.</p>}
          {history.inquiries.map((inquiry) => {
            const items = history.items.filter((item) => item.inquiry_id === inquiry.id);
            const files = history.files.filter((file) => file.inquiry_id === inquiry.id);
            const quotes = history.quotes.filter((quote) => quote.inquiry_id === inquiry.id);
            return <article key={inquiry.id}>
              <div><p className="text-xs text-sapphire">{new Date(inquiry.created_at).toLocaleDateString("fa-IR")}</p><h3>{getInquiryStatusLabel(inquiry.status)}</h3>{getInquiryStatusGuidance(inquiry.status) && !(inquiry.status === "quoted" && quotes.length > 0) && <p className="mt-2 text-sm leading-7 text-graphite/65">{getInquiryStatusGuidance(inquiry.status)}</p>}</div>
              <div className="account-inquiry-body"><p>{inquiry.message}</p>
                {items.length > 0 && <ul className="account-inquiry-items" aria-label="قطعات درخواست‌شده">{items.map((item, index) => <li key={`${item.product_name}-${index}`}><div>{item.product_name}<ProductPreferencesSummary value={item.preferences} /></div><span>تعداد {item.quantity.toLocaleString("fa-IR")}</span></li>)}</ul>}
                {files.length > 0 && <div className="account-inquiry-files"><p>فایل‌های پرونده</p><ul>{files.map((file) => <li key={file.id}><a href={`/api/inquiries/${inquiry.id}/files?fileId=${encodeURIComponent(file.id)}`}>{file.original_name}</a></li>)}</ul></div>}
              </div>
              <section className="col-span-full my-6 min-w-0" aria-label="پیشنهادهای قیمت"><h4 className="mb-4 text-sm text-sapphire">پیشنهادهای قیمت</h4>{history.quoteError ? <p role="alert" className="text-sm leading-7">پیشنهادهای قیمت فعلاً دریافت نشدند؛ سایر اطلاعات پرونده در دسترس می‌ماند.</p> : quotes.length ? <div className="space-y-5">{quotes.map((quote) => {
                const isPreviousVersion = quotes.some((other) => other.document_id === quote.document_id && other.source_revision > quote.source_revision);
                return <div key={quote.id}><InquiryQuoteCard quote={quote} now={history.quoteReadAt} isPreviousVersion={isPreviousVersion} /><button type="button" className="mt-3 min-h-11 border-b border-silver pb-1 text-sm text-sapphire underline underline-offset-4" onClick={() => setActiveQuote({ quote, isPreviousVersion, checkedAt: history.quoteReadAt })}>بازکردن برگهٔ چاپ در گالری ←</button></div>;
              })}</div> : <p className="py-4 text-sm leading-7 text-graphite/65">هنوز پیشنهاد قیمت مستقلی در این پرونده ثبت نشده است.</p>}</section>
              <InquiryConversation key={inquiry.id} inquiryId={inquiry.id} status={inquiry.status} viewer="customer" />
            </article>;
          })}
        </div>}
    </section>}
    {state === "signed-in" && !completionMode && <form action={signOutCurrentSession} className="border-t border-silver pt-4 text-right">
      <button type="submit" className="min-h-11 border-b border-silver pb-1 text-sm text-graphite/60 underline underline-offset-4 transition-colors hover:text-sapphire focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire">خروج از حساب</button>
    </form>}
    </>}
  </div>;
}
