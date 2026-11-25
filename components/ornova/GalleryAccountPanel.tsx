"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
type AccountIdentity = { phone: string; displayName: string; canOpenIdea: boolean };
type AccountInquiry = { id: string; status: string; created_at: string; message: string };
type InquiryItem = { inquiry_id: string; product_name: string; quantity: number; preferences?: unknown };
type InquiryFile = { id: string; inquiry_id: string; original_name: string };
type InquiryHistory = { inquiries: AccountInquiry[]; items: InquiryItem[]; files: InquiryFile[]; quotes: CustomerQuoteDTO[]; detailsError: boolean; quoteError: boolean; quoteReadAt: string };
type ActiveQuote = { quote: CustomerQuoteDTO; isPreviousVersion: boolean; checkedAt: string };
export type WorkshopBookPage = "profile" | "orders" | "idea";
const bookPages = [
  { id: "profile", title: "مشخصات من" },
  { id: "orders", title: "سفارش‌های من" },
  { id: "idea", title: "ایده و سفارش اختصاصی" },
] as const;
const orderDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });
type WorkshopBook = { page: WorkshopBookPage; onPageChange(page: WorkshopBookPage): void; authorizeIdea(accountId: string): boolean; idea: ReactNode; hasDraft: boolean; busy: boolean };

export function GalleryAccountPanel({ completionMode, initialError, signOutFailed = false, onContinueCheckout, checkoutTitle, nextDestination, prepareEmailDestination, workshopBook }: { completionMode: boolean; initialError?: string | null; signOutFailed?: boolean; onContinueCheckout?: () => void; checkoutTitle?: string; nextDestination?: string; prepareEmailDestination?: () => string | null; workshopBook?: WorkshopBook }) {
  const [state, setState] = useState<PanelState>("checking");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [profileUnavailable, setProfileUnavailable] = useState(false);
  const [history, setHistory] = useState<InquiryHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [openedInquiries, setOpenedInquiries] = useState<ReadonlySet<string>>(() => new Set());
  const [activeQuote, setActiveQuote] = useState<ActiveQuote | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editingCheckoutProfile, setEditingCheckoutProfile] = useState(false);
  const bookNav = useRef<HTMLElement>(null);
  const quoteReturn = useRef<HTMLButtonElement>(null);
  const quoteView = useRef<HTMLDivElement>(null);
  const bookPageIndex = bookPages.findIndex((page) => page.id === workshopBook?.page);
  const authorizeIdea = workshopBook?.authorizeIdea;
  const wantsHistory = !completionMode && (!workshopBook || workshopBook.page === "orders");
  const showingQuote = Boolean(activeQuote && state === "signed-in");

  useEffect(() => {
    if (showingQuote) quoteView.current?.focus();
  }, [showingQuote]);

  function closeQuote() {
    setActiveQuote(null);
    window.requestAnimationFrame(() => quoteReturn.current?.focus());
  }

  function turnPage(index: number) {
    const next = bookPages[index];
    if (!next || !workshopBook || workshopBook.busy || index === bookPageIndex) return;
    setActiveQuote(null);
    workshopBook.onPageChange(next.id);
    window.requestAnimationFrame(() => bookNav.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus());
  }

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe(): void } | undefined;
    async function loadSession() {
      setState("checking");
      setHistory(null);
      setHistoryError(false);
      setOpenedInquiries(new Set());
      try {
        const client = createSupabaseBrowserClient();
        subscription = client.auth.onAuthStateChange((event) => {
          if (event !== "SIGNED_OUT") return;
          active = false;
          setProfile(null);
          setIdentity(null);
          setHistory(null);
          setOpenedInquiries(new Set());
          setActiveQuote(null);
          setState("guest");
        }).data.subscription;
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError && !isAuthSessionMissingError(authError)) throw authError;
        if (!user) { setIdentity(null); setProfile(null); setState("guest"); return; }

        const { data, error } = await client
          .from("profiles")
          .select("display_name,phone,design_note,province,city,postal_code,address_line")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        setIdentity({
          phone: user.phone ?? "",
          displayName: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
          canOpenIdea: authorizeIdea?.(user.id) ?? false,
        });
        setProfileUnavailable(Boolean(error));
        setProfile(error ? null : data as AccountProfile | null);
        setState(completionMode ? "ready" : "signed-in");
      } catch {
        if (active) setState("unavailable");
      }
    }
    void loadSession();
    return () => { active = false; subscription?.unsubscribe(); };
  }, [attempt, authorizeIdea, completionMode]);

  useEffect(() => {
    if (state !== "signed-in" || !wantsHistory || history || historyError) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    let active = true;
    async function loadHistory() {
      try {
        const response = await fetch("/api/account/inquiries", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        const result = await response.json() as InquiryHistory;
        if (active) setHistory(result);
      } catch {
        if (active) setHistoryError(true);
      } finally {
        window.clearTimeout(timer);
      }
    }
    void loadHistory();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [state, wantsHistory, history, historyError]);

  const profileReady = Boolean(profile?.display_name?.trim() && profile.phone?.trim() && profile.province?.trim() && profile.city?.trim() && profile.address_line?.trim());
  const checkoutSummary = state === "ready" && completionMode && profileReady && !editingCheckoutProfile;
  const profileBook = workshopBook || completionMode;
  const saveBookProfile = useCallback((saved: AccountProfile) => {
    setProfile(saved);
    setProfileUnavailable(false);
    setEditingCheckoutProfile(false);
  }, []);
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
    onSaved={saveBookProfile}
  />;

  let content;
  if (state === "checking") content = <p className="text-sm leading-7 text-graphite/65" role="status">در حال بررسی حساب…</p>;
  else if (state === "unavailable") content = <div className="grid gap-3 text-sm leading-7 text-graphite/70" role="alert"><p>{workshopBook ? "حساب فعلاً در دسترس نیست. برای بازکردن دفتر دوباره تلاش کن." : "اتصال امن حساب فعلاً پاسخ نداد؛ انتخاب‌های صندوق در همین مرورگر محفوظ‌اند."}</p><button type="button" className="w-fit border-b border-silver pb-1 text-sapphire" onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</button></div>;
  else if (state === "guest") content = <>
    <div className={styles.accountLogin}>
      <p className={styles.accountLoginHeading}>{completionMode ? "برای ادامهٔ سفارش، وارد دفتر شخصی‌ات شو." : prepareEmailDestination ? "برای ورود یا ثبت‌نام، ایمیلت را وارد کن. لینک یک‌بارمصرف تو را به همین کارگاه برمی‌گرداند." : "لینک ورود یک‌بارمصرف به ایمیلت فرستاده می‌شود."}</p>
      {workshopBook?.hasDraft && <p className={styles.accountLoginHeading}>برای ادامه بعد از ورود، پیش‌نویس تا ۳۰ دقیقه در همین مرورگر می‌ماند.</p>}
      <MagicLinkForm compact initialError={initialError} nextDestination={nextDestination ?? (completionMode ? "/?galleryPanel=account&complete=1" : undefined)} prepareEmailDestination={prepareEmailDestination} />
    </div>
  </>;
  else if (state === "signed-in" && !workshopBook) content = <details className={styles.accountProfile} open={profileUnavailable || undefined}>
    <summary>ویرایش تماس و نشانی</summary>
    {profileUnavailable && <p className="text-sm leading-7" role="status">اطلاعات قبلی در دسترس نیست. قبل از ثبت درخواست، تماس و نشانی را بررسی کن.</p>}
    {profileForm}
  </details>;
  else if (checkoutSummary && profile) content = <div className={styles.checkoutLeaf}>
      <h2>اطلاعات سفارش</h2>
      <p>{profile.display_name}</p>
      <p><bdi dir="ltr">{profile.phone}</bdi></p>
      <p>{[profile.province, profile.city, profile.address_line, profile.postal_code].filter(Boolean).join("، ")}</p>
      <button type="button" className={styles.primaryLink} onClick={onContinueCheckout}>بازبینی و ثبت سفارش <span aria-hidden="true">←</span></button>
      <button type="button" className={styles.secondaryLink} onClick={() => setEditingCheckoutProfile(true)}>ویرایش اطلاعات</button>
    </div>;
  else content = <div className="grid gap-4">
      {profileUnavailable && <p className="text-sm leading-7" role="status">نشانی قبلی در دسترس نیست. برای ادامهٔ درخواست، شمارهٔ تماس و نشانی را وارد کن.</p>}
      {profileForm}
    </div>;

  const historyPage = state === "signed-in" && <section className={`${styles.accountHistory} account-inquiries`} aria-labelledby="gallery-account-inquiries-title">
      <div className="account-section-title"><h2 id="gallery-account-inquiries-title">درخواست‌های من</h2></div>
      {historyError ? <div className="account-empty" role="alert"><p>پرونده‌های درخواست فعلاً دریافت نشدند.</p><button type="button" className={styles.secondaryLink} onClick={() => setHistoryError(false)}>تلاش دوباره</button></div>
        : !history ? <p className="account-empty" role="status">در حال بازکردن پرونده‌های خصوصی…</p>
        : history.inquiries.length === 0 ? <div className="account-empty"><p>هنوز سفارشی در دفترت ثبت نشده است.</p>{workshopBook && <button type="button" className={styles.secondaryLink} disabled={workshopBook.busy} onClick={() => turnPage(2)}>ثبت ایدهٔ سفارش</button>}</div>
        : <div className={styles.orderEntries}>
          {history.detailsError && <p className="account-empty" role="status">بخشی از جزئیات پیوست‌ها موقتاً در دسترس نیست؛ وضعیت درخواست‌ها نمایش داده می‌شود.</p>}
          {history.inquiries.map((inquiry) => {
            const items = history.items.filter((item) => item.inquiry_id === inquiry.id);
            const files = history.files.filter((file) => file.inquiry_id === inquiry.id);
            const quotes = history.quotes.filter((quote) => quote.inquiry_id === inquiry.id);
            const title = items[0]?.product_name || inquiry.message.trim().split(/\r?\n/, 1)[0] || "درخواست گالری";
            const canShowGuidance = inquiry.status !== "quoted" || quotes.length === 0;
            return <details key={inquiry.id} className={styles.orderEntry} onToggle={(event) => {
              if (event.target !== event.currentTarget || !event.currentTarget.open || openedInquiries.has(inquiry.id)) return;
              setOpenedInquiries((current) => new Set(current).add(inquiry.id));
            }}>
              <summary>
                <span className={styles.orderTitle}>{title}</span>
                <span className={styles.orderStatus}>{getInquiryStatusLabel(inquiry.status)}</span>
                <time dateTime={inquiry.created_at}>{orderDate.format(new Date(inquiry.created_at))}</time>
              </summary>
              <div className={styles.orderDetail}>
                {canShowGuidance && getInquiryStatusGuidance(inquiry.status) && <p className="text-sm leading-7 text-graphite/75">{getInquiryStatusGuidance(inquiry.status)}</p>}
                <div className="account-inquiry-body"><p>{inquiry.message}</p>
                  {items.length > 0 && <ul className="account-inquiry-items" aria-label="قطعات درخواست‌شده">{items.map((item, index) => <li key={`${item.product_name}-${index}`}><div>{item.product_name}<ProductPreferencesSummary value={item.preferences} /></div><span>تعداد {item.quantity.toLocaleString("fa-IR")}</span></li>)}</ul>}
                  {files.length > 0 && <div className="account-inquiry-files"><p>فایل‌های پرونده</p><ul>{files.map((file) => <li key={file.id}><a href={`/api/inquiries/${inquiry.id}/files?fileId=${encodeURIComponent(file.id)}`}>{file.original_name}</a></li>)}</ul></div>}
                </div>
                <section className="min-w-0" aria-label="پیشنهادهای قیمت">
                  <h4 className="mb-2 text-sm text-sapphire">پیشنهادهای قیمت</h4>
                  {history.quoteError ? <p role="alert" className="text-sm leading-7">پیشنهادهای قیمت فعلاً دریافت نشدند؛ سایر اطلاعات پرونده در دسترس می‌ماند.</p> : quotes.length ? <div className="space-y-5">{quotes.map((quote) => {
                    const isPreviousVersion = quotes.some((other) => other.document_id === quote.document_id && other.source_revision > quote.source_revision);
                    return <div key={quote.id}>
                      <InquiryQuoteCard quote={quote} now={history.quoteReadAt} isPreviousVersion={isPreviousVersion} />
                      <button type="button" className={styles.secondaryLink} onClick={(event) => {
                        quoteReturn.current = event.currentTarget;
                        setActiveQuote({ quote, isPreviousVersion, checkedAt: history.quoteReadAt });
                      }}>بازکردن برگهٔ چاپ در گالری ←</button>
                    </div>;
                  })}</div> : <p className="text-sm leading-7 text-graphite/65">هنوز پیشنهاد قیمت مستقلی در این پرونده ثبت نشده است.</p>}
                </section>
                {openedInquiries.has(inquiry.id) && <InquiryConversation inquiryId={inquiry.id} status={inquiry.status} viewer="customer" />}
              </div>
            </details>;
          })}
        </div>}
    </section>;
  const signOut = state === "signed-in" && !completionMode && <form action={signOutCurrentSession} className="border-t border-silver pt-4 text-right">
      <button type="submit" className="min-h-11 border-b border-silver pb-1 text-sm text-graphite/60 underline underline-offset-4 transition-colors hover:text-sapphire focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire">خروج از حساب</button>
    </form>;

  return <div className={styles.accountWorkflow}>
    {showingQuote && activeQuote && <div ref={quoteView} tabIndex={-1} role="region" aria-label="برگهٔ پیشنهاد قیمت"><CustomerQuoteDocument quote={activeQuote.quote} isPreviousVersion={activeQuote.isPreviousVersion} checkedAt={activeQuote.checkedAt} embedded onBack={closeQuote} onAccepted={(acceptedAt) => { setActiveQuote(current => current && { ...current, quote: { ...current.quote, accepted_at: acceptedAt } }); setHistory(current => current && { ...current, quotes: current.quotes.map(quote => quote.id === activeQuote.quote.id ? { ...quote, accepted_at: acceptedAt } : quote) }); }} /></div>}
    <div className={styles.accountBookContent} hidden={showingQuote} inert={showingQuote || undefined}>
    {signOutFailed && <p className="border-r-2 border-sapphire px-4 py-2 text-sm leading-7 text-graphite/70" role="alert">خروج از حساب انجام نشد؛ دوباره تلاش کن.</p>}
    {completionMode && <p className="text-sm leading-7 text-graphite/75">{checkoutTitle ?? "ادامهٔ سفارش از صندوق گالری"}</p>}
    {workshopBook ? state === "signed-in" ? <div className={styles.customerBook}>
      <nav ref={bookNav} className={styles.customerBookIndex} aria-label="برگ‌های دفتر مشتری">
        {bookPages.map((page, index) => <button key={page.id} type="button" aria-current={workshopBook.page === page.id ? "page" : undefined} disabled={workshopBook.busy} onClick={() => turnPage(index)}>{page.title}</button>)}
      </nav>
      {bookPages.map((page) => <section key={page.id} className={styles.customerBookLeaf} aria-label={page.title} hidden={workshopBook.page !== page.id} inert={workshopBook.page !== page.id}>
        {page.id !== "orders" && <h3>{page.title}</h3>}
        {page.id === "profile" ? content : page.id === "orders" ? historyPage : identity?.canOpenIdea ? workshopBook.idea : <p role="status">برای بازکردن پیش‌نویس ایده، با حسابی وارد شو که ایده را در آن شروع کردی.</p>}
      </section>)}
      <footer className={styles.customerBookTurn}>
        <button type="button" disabled={workshopBook.busy || bookPageIndex <= 0} onClick={() => turnPage(bookPageIndex - 1)}><span aria-hidden="true">→ </span>برگ قبلی</button>
        <button type="button" disabled={workshopBook.busy || bookPageIndex >= bookPages.length - 1} onClick={() => turnPage(bookPageIndex + 1)}>برگ بعدی<span aria-hidden="true"> ←</span></button>
      </footer>
      {signOut}
    </div> : <div className={styles.customerBookLock}>{content}</div> : profileBook ? <div className={state === "ready" ? styles.customerBook : styles.customerBookLock}>{content}</div> : <>{content}{historyPage}{signOut}</>}
    </div>
  </div>;
}
