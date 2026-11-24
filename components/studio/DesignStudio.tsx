"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { GalleryAccountPanel, type WorkshopBookPage } from "@/components/ornova/GalleryAccountPanel";
import { OrnovaSymbol } from "@/components/ornova/OrnovaBrandMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStudioBrief, parseStudioDraft, STUDIO_QUESTIONS, studioLoginPath, type StudioDraft } from "@/lib/studio/conversation";
import styles from "./DesignStudio.module.css";
import { transferStudioInquiry } from "@/lib/studio/inquiry-handoff";

const draftKey = (id: string) => `ornova:studio:${id}`;
type Conversation = { answers: string[]; input: string; note: string };

export type StudioInquiryMode = "transferred" | "review-existing";

export function DesignStudio({ draftId, userId, initialBookPage = null, imageMode = "offline", embedded = false, active = true, onOpenInquiry, onReturnToInquiry, onOpenAccountGallery }: { draftId: string | null; userId: string | null; initialBookPage?: WorkshopBookPage | null; imageMode?: "offline" | "preview"; embedded?: boolean; active?: boolean; onOpenInquiry?: (mode: StudioInquiryMode) => void; onReturnToInquiry?: () => void; onOpenAccountGallery?: () => void }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation>({ answers: [], input: "", note: "" });
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [bookPage, setBookPage] = useState<WorkshopBookPage | null>(initialBookPage);
  const [consent, setConsent] = useState(false);
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; imageUrl: string } | null>(null);
  const requestId = useRef<string | null>(null);
  const ideaOwnerId = useRef<string | null>(userId);
  const authorizeIdea = useCallback((accountId: string) => {
    ideaOwnerId.current ??= accountId;
    return ideaOwnerId.current === accountId;
  }, []);
  const activeDraftId = useRef(draftId);
  const inFlight = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const accountRef = useRef<HTMLHeadingElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const copyOperation = useRef<symbol | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const { answers, input, note } = conversation;
  const brief = buildStudioBrief(answers);
  const question = STUDIO_QUESTIONS[answers.length];

  useEffect(() => {
    const log = messagesRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    if (!answers.length) return;
    if (answers.length < STUDIO_QUESTIONS.length) inputRef.current?.focus();
    else reviewRef.current?.focus();
  }, [answers.length]);

  useEffect(() => {
    if (!draftId) return;
    let saved: StudioDraft | null = null;
    try { saved = parseStudioDraft(localStorage.getItem(draftKey(draftId)), draftId, userId); } catch { /* Storage can be disabled. */ }
    if (!saved) activeDraftId.current = null;
    else ideaOwnerId.current = saved.ownerId ?? userId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore an explicitly saved browser-only draft after hydration.
    setConversation(saved ? { answers: saved.answers, input: saved.input, note: "پیش‌نویس ایده‌ات بازیابی شد." } : { answers: [], input: "", note: "پیش‌نویس در این مرورگر پیدا نشد، منقضی شده یا متعلق به این حساب نیست." });
    if (saved && userId) {
      try { localStorage.setItem(draftKey(draftId), JSON.stringify({ ...saved, ownerId: userId })); } catch { /* Conversation remains in memory. */ }
    }
  }, [draftId, userId]);

  function answer(value: string) {
    const next = [...answers, value.trim()];
    if (!value.trim() || value.length > 450 || !question) return;
    if (next.length === 4 && !buildStudioBrief(next)) { setError("توضیح‌ها طولانی شده‌اند؛ پاسخ آخر یا پاسخ‌های قبلی را کوتاه‌تر کن."); return; }
    setConversation({ answers: next, input: "", note: "" });
    copyOperation.current = null; setCopyState("idle");
    setError(""); setGate(false); setConsent(false); setResult(null); requestId.current = null;
    inputRef.current?.focus();
  }

  function edit(index: number) {
    copyOperation.current = null; setCopyState("idle");
    setConversation({ answers: answers.slice(0, index), input: answers[index], note: "پس از اصلاح این پاسخ، جزئیات بعدی را دوباره مشخص می‌کنیم." });
    setResult(null); setGate(false); setConsent(false); setError(""); setUncertain(false); requestId.current = null;
    inputRef.current?.focus();
  }

  function saveDeviceDraft() {
    try {
      const id = activeDraftId.current ?? crypto.randomUUID();
      const saved: StudioDraft = { version: 1, id, ownerId: ideaOwnerId.current, expiresAt: Date.now() + 30 * 60 * 1000, answers, input };
      localStorage.setItem(draftKey(id), JSON.stringify(saved));
      activeDraftId.current = id;
      return id;
    } catch { return null; }
  }

  function openAccount(page: WorkshopBookPage) {
    setBookPage(page);
    window.requestAnimationFrame(() => accountRef.current?.focus());
  }

  function closeAccount() {
    setBookPage(null);
    window.requestAnimationFrame(() => accountTrigger.current?.focus());
  }

  function prepareAccountDestination() {
    const studioPath = `/?galleryPanel=studio&customerPage=${bookPage ?? "profile"}`;
    if (!answers.length && !input.trim()) return studioPath;
    const id = saveDeviceDraft();
    return id ? `${studioPath}&draft=${encodeURIComponent(id)}` : null;
  }

  function login() {
    if (embedded) { openAccount("idea"); return; }
    const id = saveDeviceDraft();
    if (id) router.push(studioLoginPath(id));
    else setError("مرورگر اجازهٔ نگهداری ایده را نداد. پیش از ورود، خلاصه را کپی کن تا از دست نرود.");
  }

  function clearDeviceDraft() {
    try {
      if (activeDraftId.current) localStorage.removeItem(draftKey(activeDraftId.current));
      if (embedded) {
        activeDraftId.current = null;
        setConversation({ answers: [], input: "", note: "" });
        setResult(null); setGate(false); setConsent(false); setUncertain(false); setError(""); requestId.current = null;
        router.replace("/?galleryPanel=studio&customerPage=idea");
      } else router.push("/custom-design");
    } catch { setError("پاک‌کردن پیش‌نویس انجام نشد؛ تنظیمات ذخیره‌سازی مرورگر را بررسی کن."); }
  }

  async function checkLogin() {
    if (inFlight.current || imageMode !== "preview") return;
    setBusy(true); setError(""); inFlight.current = true;
    try {
      const client = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      if (user && ideaOwnerId.current && user.id !== ideaOwnerId.current) { setError("حساب فعال تغییر کرده است. برای ادامهٔ امن، صفحه را دوباره باز کن."); return; }
      if (user) ideaOwnerId.current ??= user.id;
      setCurrentUserId(user?.id ?? null); setGate(true);
    } catch { setError("بررسی ورود فعلاً ممکن نیست؛ ایده‌ات در همین صفحه باقی مانده است."); }
    finally { setBusy(false); inFlight.current = false; }
  }

  async function generate() {
    if (inFlight.current || imageMode !== "preview" || !brief || !consent || uncertain) return;
    inFlight.current = true; setBusy(true); setError(""); requestId.current ??= crypto.randomUUID();
    try {
      const client = createSupabaseBrowserClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setCurrentUserId(null); setConsent(false); setGate(true); setError("برای ادامه دوباره وارد همان حساب شو؛ مالکیت ایده تغییر نکرده است."); return; }
      if (user.id !== ideaOwnerId.current) { setError("حساب فعال تغییر کرده است. برای ادامهٔ امن، صفحه را دوباره باز کن."); setConsent(false); return; }
      const response = await fetch("/api/studio/generations", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, accountId: ideaOwnerId.current, idea: brief, consent: true }), signal: AbortSignal.timeout(118000) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401) { setCurrentUserId(null); setConsent(false); setGate(true); }
        if (response.status === 409 || response.status >= 500) setUncertain(true);
        setError(typeof body.error === "string" ? body.error : "ساخت تصویر تأیید نشد."); return;
      }
      if (body.state !== "ready" || body.id !== requestId.current || body.imageUrl !== `/api/studio/generations/${body.id}/image`) throw new Error("Invalid result");
      setResult({ id: body.id, imageUrl: body.imageUrl });
      if (activeDraftId.current) { try { localStorage.removeItem(draftKey(activeDraftId.current)); } catch { /* No stored image is affected. */ } }
    } catch { setUncertain(true); setError("پاسخ قطعی نرسید. ایده‌ات همین‌جا مانده؛ پیش از تلاش تازه گالری را بررسی کن."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); answer(input); }

  function transferToInquiry() {
    if (busy) return;
    try {
      const transferred = transferStudioInquiry(answers, window.sessionStorage, window.localStorage);
      if (!transferred.success) { setError(transferred.error); return; }
      if (embedded && onOpenInquiry) { onOpenInquiry("transferred"); return; }
      router.push("/contact?from=custom-design");
    } catch { setError("مرورگر اجازهٔ انتقال ایده را نداد. خلاصه را کپی کن و در فرم درخواست قرار بده."); }
  }

  async function copyBrief() {
    if (!brief || copyOperation.current) return;
    const operation = Symbol("copy"); copyOperation.current = operation;
    try {
      await navigator.clipboard.writeText(brief);
      if (copyOperation.current === operation) setCopyState("copied");
    } catch { if (copyOperation.current === operation) setCopyState("manual"); }
    finally { if (copyOperation.current === operation) copyOperation.current = null; }
  }

  const ideaPage = <section className={styles.conversation} aria-label="گفت‌وگوی طراحی">
      <header className={styles.chatHeader}><span>دفتر ایدهٔ تو</span><span>{question ? `${new Intl.NumberFormat("fa-IR").format(answers.length + 1)} از ۴` : "مرور ایده"}</span></header>
      <ol className={styles.progress} aria-label="مراحل تعریف ایده">{STUDIO_QUESTIONS.map((step, index) => <li key={step.label} aria-current={index === answers.length ? "step" : undefined} data-complete={index < answers.length}><span aria-hidden="true">{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>{step.label}</li>)}</ol>
      <p className={styles.disclosure}>راهنمای مرحله‌ای برای جمع‌بندی ایده؛ پاسخ‌گوی زندهٔ هوش مصنوعی نیست.</p>
      {note && <p className={styles.notice} role="status">{note}</p>}
      <div ref={messagesRef} role="log" tabIndex={0} aria-label="پیام‌های طراحی" aria-live="polite" data-complete={!question} className={styles.messages}>
        {answers.map((text, index) => <div key={index} className={styles.exchange}><p className={styles.guide}>{STUDIO_QUESTIONS[index].question}</p><div className={styles.reply}><p>{text}</p><button type="button" onClick={() => edit(index)} disabled={busy}>اصلاح پاسخ {new Intl.NumberFormat("fa").format(index + 1)}</button></div></div>)}
        {question && <p key={answers.length} className={`${styles.guide} ${styles.currentQuestion}`}>{question.question}</p>}
      </div>
      {question ? <>
        <div className={styles.choices} aria-label="پاسخ‌های پیشنهادی">{question.choices.map((choice) => <button key={choice} type="button" onClick={() => answer(choice)}>{choice}</button>)}</div>
        <form onSubmit={submit} className={styles.composer}><label htmlFor="studio-answer">پاسخ تو</label><textarea id="studio-answer" ref={inputRef} rows={3} maxLength={450} value={input} onChange={(e) => setConversation({ ...conversation, input: e.target.value })} placeholder="اینجا بنویس…" required /><div><small>توضیح شخصی یا اطلاعات تماس لازم نیست.</small><button type="submit" disabled={!input.trim()}>ادامهٔ گفت‌وگو ←</button></div></form>
      </> : <div className={styles.review}>
        <h2 ref={reviewRef} tabIndex={-1} data-studio-review>این، نقطهٔ شروع طراحی توست.</h2><p className={styles.brief}>{brief}</p>
        <div className={styles.readyActions}>
          {onReturnToInquiry
            ? <button type="button" className={styles.primary} disabled={busy} onClick={onReturnToInquiry}>بازگشت به فرم درخواست <span aria-hidden="true">←</span></button>
            : <button type="button" className={styles.primary} disabled={busy} onClick={transferToInquiry}>{embedded ? "ثبت ایده برای بررسی" : "انتقال خلاصه به فرم درخواست"} <span aria-hidden="true">←</span></button>}
          <button type="button" className={styles.copyAction} disabled={busy} onClick={copyBrief}>کپی خلاصهٔ ایده</button>
        </div>
        <p className={styles.disclosure}>{onReturnToInquiry ? "اگر پاسخ‌ها را اصلاح کردی، خلاصهٔ تازه را کپی کن و در فرم درخواست قرار بده." : "در فرم درخواست می‌توانی متن ایده را بازبینی کنی و برای اُرنوا بفرستی."}</p>
        {copyState === "copied" && <p role="status" className={styles.notice}>خلاصهٔ ایده کپی شد.</p>}
        {copyState === "manual" && <label className={styles.manualCopy}>کپی خودکار انجام نشد؛ متن را انتخاب و کپی کن.<textarea readOnly value={brief ?? ""} rows={4} onFocus={(event) => event.currentTarget.select()} aria-label="خلاصهٔ ایده برای کپی دستی" /></label>}
        {imageMode === "offline" ? <p className={styles.offline}>ساخت تصویر فعلاً فعال نیست. می‌توانی همین ایده را برای بررسی طراحی ثبت کنی.</p> : <p className={styles.disclosure}>ساخت تصویر در آزمون محدود است. Ornova پیش‌طرح را از نظر جنس، سنگ، ابعاد و امکان ساخت بررسی می‌کند.</p>}
        {imageMode === "preview" && !gate && !result && <button className={styles.imageAction} type="button" onClick={checkLogin} disabled={busy}>{busy ? "در حال بررسی ورود…" : "ادامه برای ساخت تصویر"}</button>}
        {imageMode === "preview" && gate && !currentUserId && <div className={styles.gate}><h3>پیش از ساخت تصویر، وارد شو.</h3><p>طرح موفق در «گالری من» حسابت ثبت می‌شود. با انتخاب ادامه، متن ایده روی همین مرورگر ذخیره و تا ۳۰ دقیقه قابل بازیابی می‌شود؛ روی دستگاه مشترک احتیاط کن.</p><button type="button" className={styles.primary} onClick={login}>ورود و نگه‌داشتن ایده برای ادامه</button></div>}
        {imageMode === "preview" && gate && currentUserId && !result && <div className={styles.gate}><label className={styles.consent}><input type="checkbox" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} /><span>موافقم همین خلاصه به سرویس هوش مصنوعی ارسال شود و تصویر موفق در گالری خصوصی من ذخیره شود.</span></label><button type="button" className={styles.primary} disabled={!consent || busy || uncertain} onClick={generate}>{busy ? "در حال ساخت و ذخیرهٔ تصویر…" : "ساخت تصویر و ذخیره در گالری من"}</button></div>}
        {uncertain && <div className={styles.recovery}>{embedded && onOpenAccountGallery ? <button type="button" className={styles.libraryAction} onClick={onOpenAccountGallery}>بررسی گالری من ←</button> : <Link href="/account/gallery">بررسی گالری من ←</Link>}<button type="button" disabled={busy} onClick={() => { requestId.current = null; setUncertain(false); setError(""); setConsent(false); }}>پس از بررسی گالری، یک تلاش تازه</button></div>}
        {result && <div className={styles.result}>
          {/* Private cookie-authenticated route: bypass shared image optimization caches. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.imageUrl} alt="پیش‌طرح تولیدشده از ایدهٔ شما؛ در انتظار بررسی فنی" />
          <p role="status">تصویر در گالری خصوصی تو ذخیره شد.</p>{embedded && onOpenAccountGallery ? <button type="button" className={styles.libraryAction} onClick={onOpenAccountGallery}>دیدن گالری من ←</button> : <Link href="/account/gallery">دیدن گالری من ←</Link>}<button type="button" onClick={() => edit(1)}>اصلاح ایده و ساخت نسخهٔ تازه</button>
        </div>}
      </div>}
      {error && <div className={styles.error}><p role="alert">{error}</p>{!onReturnToInquiry && (embedded && onOpenInquiry ? <button type="button" onClick={() => onOpenInquiry("review-existing")}>بازکردن پیش‌نویس درخواست <span aria-hidden="true">←</span></button> : <Link href="/contact?from=custom-design">بازکردن فرم درخواست و بررسی پیش‌نویس <span aria-hidden="true">←</span></Link>)}</div>}
      {(draftId || !embedded) && <footer className={styles.chatFooter}>{draftId && <button type="button" onClick={clearDeviceDraft} disabled={busy}>پاک‌کردن پیش‌نویس این دستگاه</button>}{!embedded && <a href="/custom-design">شروع یک ایدهٔ تازه</a>}</footer>}
    </section>;

  return <div className={`${styles.studio} ${embedded ? styles.embedded : ""}`} data-personal-ledger={embedded ? (bookPage ? "open" : "cover") : undefined}>
    <aside className={styles.intro} hidden={embedded && Boolean(bookPage)}>
      <p className={styles.eyebrow}>اُرنوا</p>
      <h1 id={embedded && active && !bookPage ? "gallery-drawer-title" : undefined} tabIndex={embedded ? -1 : undefined}>{embedded ? "کارگاه طراحی" : "از ایدهٔ تو شروع کنیم."}</h1>
      {embedded && <nav className={styles.workshopNav} aria-label="میز مشتری در کارگاه">
        <button ref={accountTrigger} type="button" onClick={() => openAccount("profile")} disabled={busy} aria-expanded={Boolean(bookPage)} aria-controls="studio-customer-account">حساب مشتری</button>
        <button type="button" onClick={() => openAccount("idea")} disabled={busy}>ثبت ایده</button>
      </nav>}
      <figure className={styles.reference}><div><Image src="/images/ornova/lajvard-shab-04.png" alt="انگشتر لاجورد شب کنار دست‌نوشته؛ نمونه‌ای از آرشیو Ornova" fill sizes="(max-width: 800px) 1px, 400px" className={styles.referencePhoto} /></div><figcaption>از آرشیو Ornova by Yas · لاجورد شب</figcaption></figure>
      {!embedded && <nav aria-label="مسیرهای دیگر استودیو"><Link href="/account/gallery">گالری من <span aria-hidden="true">↖</span></Link><Link href="/ring-builder">طراحی انگشتر <span aria-hidden="true">↖</span></Link></nav>}
    </aside>
    {!embedded ? ideaPage : <section id="studio-customer-account" aria-label="دفتر شخصی اُرنوا" className={styles.customerAccount} data-book-requested={Boolean(bookPage)}>
      {!bookPage ? <button className={styles.closedBook} type="button" onClick={() => openAccount("profile")}><OrnovaSymbol />دفتر شخصی اُرنوا</button> : <>
        <header><h2 id={active ? "gallery-drawer-title" : undefined} ref={accountRef} tabIndex={-1}>دفتر شخصی اُرنوا</h2><button type="button" onClick={closeAccount} disabled={busy}>بستن دفتر</button></header>
        <GalleryAccountPanel completionMode={false} prepareEmailDestination={prepareAccountDestination} workshopBook={{ page: bookPage, onPageChange: setBookPage, authorizeIdea, idea: ideaPage, hasDraft: Boolean(answers.length || input.trim()), busy }} />
      </>}
    </section>}
  </div>;
}
