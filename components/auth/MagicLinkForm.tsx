"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl, normalizeIranianPhone, safeInternalPath, toLatinDigits } from "@/lib/auth/inputs";

const PHONE_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED === "true";
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
type AuthKind = "email" | "phone" | "verify" | "google";

export function MagicLinkForm({
  initialError,
  phoneAuthEnabled = PHONE_AUTH_ENABLED,
  googleAuthEnabled = GOOGLE_AUTH_ENABLED,
  nextDestination,
  prepareEmailDestination,
  compact = false,
}: {
  initialError?: string | null;
  phoneAuthEnabled?: boolean;
  googleAuthEnabled?: boolean;
  nextDestination?: string;
  prepareEmailDestination?: () => string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [awaitingPhoneOtp, setAwaitingPhoneOtp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pendingKind, setPendingKind] = useState<AuthKind | null>(null);
  const loading = pendingKind !== null;
  const active = useRef<object | null>(null), mounted = useRef(true);
  const errorRef = useRef<HTMLParagraphElement>(null), otpRef = useRef<HTMLInputElement>(null), phoneRef = useRef<HTMLInputElement>(null), wasAwaitingOtp = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current = null; }; }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (awaitingPhoneOtp) otpRef.current?.focus();
    else if (wasAwaitingOtp.current) phoneRef.current?.focus();
    wasAwaitingOtp.current = awaitingPhoneOtp;
  }, [awaitingPhoneOtp]);
  function begin(kind: AuthKind) {
    if (!mounted.current || active.current) return null;
    const operation = {}; active.current = operation;
    setPendingKind(kind); setMessage(null); setError(null);
    return operation;
  }
  function owns(operation: object) { return mounted.current && active.current === operation; }
  function finish(operation: object) { if (owns(operation)) { active.current = null; setPendingKind(null); } }
  function clearFeedback() { setMessage(null); setError(null); }
  function changePhone() { if (active.current) return; setAwaitingPhoneOtp(false); setPhoneOtp(""); clearFeedback(); }

  function nextPath() {
    if (nextDestination) return safeInternalPath(nextDestination);
    const requested = new URLSearchParams(window.location.search).get("next");
    return safeInternalPath(requested);
  }

  function callbackUrl(destination?: string) {
    return buildAuthCallbackUrl(window.location.origin, process.env.NEXT_PUBLIC_SITE_URL, destination ?? nextPath());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const operation = begin("email"); if (!operation) return;
    const target = email.trim();

    try {
      if (!target) { setError("ایمیل خود را وارد کنید."); return; }
      const destination = prepareEmailDestination?.();
      if (destination === null) {
        setError("پیش‌نویس ایده در این مرورگر ذخیره نشد. به کارگاه برگرد و متن ایده‌ات را پیش از ورود کپی کن.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: target,
        options: { emailRedirectTo: callbackUrl(destination) },
      });
      if (!owns(operation)) return;
      if (authError) throw authError;
      setMessage("لینک ورود برای شما ارسال شد. صندوق ورودی و پوشه هرزنامه را بررسی کنید.");
    } catch {
      if (owns(operation)) setError("ارسال لینک ورود تأیید نشد. اتصال را بررسی کنید و کمی بعد دوباره تلاش کنید؛ ممکن است لینک قبلی رسیده باشد.");
    } finally {
      finish(operation);
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    if (!phoneAuthEnabled) {
      setError("ورود پیامکی هنوز در تنظیمات Ornova فعال نشده است. فعلاً از ورود با ایمیل استفاده کنید.");
      return;
    }
    const operation = begin("phone"); if (!operation) return;

    try {
      const normalizedPhone = normalizeIranianPhone(phone);
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        setError("شماره را با پیش‌شماره کشور وارد کنید؛ برای ایران می‌توانید از +98 یا 09 شروع کنید.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true },
      });
      if (!owns(operation)) return;
      if (authError) throw authError;
      setPhone(normalizedPhone);
      setAwaitingPhoneOtp(true);
      setMessage("کد یک‌بارمصرف پیامکی برای شما ارسال شد.");
    } catch {
      if (owns(operation)) setError("دریافت پاسخ پیامک تأیید نشد؛ پیش از درخواست دوباره، پیامک‌های رسیده را بررسی کنید یا از ورود با ایمیل استفاده کنید.");
    } finally {
      finish(operation);
    }
  }

  async function handlePhoneOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    if (!phoneAuthEnabled || !awaitingPhoneOtp) { setError("ابتدا برای شمارهٔ خود یک کد ورود درخواست کنید."); return; }
    const operation = begin("verify"); if (!operation) return;
    const target = phone, token = toLatinDigits(phoneOtp).trim(), destination = nextPath();

    try {
      if (!/^\d+$/.test(token)) { setError("کد پیامکیِ عددی را وارد کنید."); return; }
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: target,
        token,
        type: "sms",
      });
      if (!owns(operation)) return;
      if (authError) throw authError;
      router.replace(destination);
      router.refresh();
    } catch {
      if (owns(operation)) setError("ورود تأیید نشد؛ کد و اتصال را بررسی کنید. فقط پس از دریافت پاسخ، دوباره تلاش کنید.");
    } finally {
      finish(operation);
    }
  }

  async function handleGoogleSignIn() {
    if (active.current) return;
    if (!googleAuthEnabled) {
      setError("ورود با حساب گوگل هنوز در تنظیمات Ornova فعال نشده است. فعلاً از ورود با ایمیل استفاده کنید.");
      return;
    }
    const operation = begin("google"); if (!operation) return;

    try {
      const destination = prepareEmailDestination?.();
      if (destination === null) {
        setError("پیش‌نویس در این مرورگر ذخیره نشد. ابتدا متن ایده‌ات را کپی کن.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(destination), skipBrowserRedirect: true },
      });
      if (!owns(operation)) return;
      if (authError || !data?.url) throw authError ?? new Error("OAuth URL unavailable");
      const configured = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ""), authorization = new URL(data.url);
      const local = configured.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname);
      if ((configured.protocol !== "https:" && !local) || authorization.origin !== configured.origin || authorization.username || authorization.password || authorization.pathname !== `${configured.pathname.replace(/\/$/, "")}/auth/v1/authorize` || authorization.searchParams.get("provider") !== "google") throw new Error("OAuth URL invalid");
      window.location.assign(authorization.href);
    } catch {
      if (owns(operation)) setError("شروع ورود با گوگل تأیید نشد؛ اتصال و تنظیمات ورود باید بررسی شوند.");
    } finally {
      finish(operation);
    }
  }

  return (
    <div className="mt-8 grid gap-6" aria-busy={loading}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm text-graphite"><span>ایمیل</span><input required type="email" autoComplete="email" dir="ltr" disabled={loading} value={email} onChange={(event) => { if (active.current) return; setEmail(event.target.value); clearFeedback(); }} className="border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire" placeholder="you@example.com" /></label>
        <button type="submit" disabled={loading} className="w-fit rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{pendingKind === "email" ? "در حال ارسال…" : prepareEmailDestination ? "ارسال لینک ورود و ثبت‌نام" : "ارسال لینک ورود"}</button>
        {!compact && <p className="text-xs leading-6 text-graphite/55">لینک یک‌بارمصرف به ایمیل شما فرستاده می‌شود؛ بعد از ورود، می‌توانید درخواستتان را ادامه دهید.</p>}
      </form>

      {phoneAuthEnabled && awaitingPhoneOtp ? <form onSubmit={handlePhoneOtpSubmit} className="grid gap-4">
        <p className="text-sm leading-7 text-graphite/65">کد ارسال‌شده به شماره‌ی <bdi dir="ltr">{phone}</bdi> را وارد کنید.</p>
        <label className="grid gap-2 text-sm text-graphite"><span>کد یک‌بارمصرف</span><input ref={otpRef} required type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" disabled={loading} value={phoneOtp} onChange={(event) => { if (active.current) return; setPhoneOtp(toLatinDigits(event.target.value).replace(/\D/g, "").slice(0, 8)); clearFeedback(); }} className="border-b border-silver bg-transparent px-1 py-3 text-left tracking-[0.35em] outline-none focus:border-sapphire" /></label>
        <button type="submit" disabled={loading} className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{pendingKind === "verify" ? "در حال بررسی…" : "تأیید و ورود"}</button>
        <button type="button" disabled={loading} onClick={changePhone} className="w-fit text-xs text-graphite/55 underline underline-offset-4 disabled:opacity-60">تغییر شماره موبایل</button>
      </form> : phoneAuthEnabled ? <form onSubmit={handlePhoneSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm text-graphite"><span>شماره موبایل</span><input ref={phoneRef} required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" disabled={loading} value={phone} onChange={(event) => { if (active.current) return; setPhone(event.target.value); clearFeedback(); }} className="border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire" placeholder="+98912…" /></label>
        <button type="submit" disabled={loading} className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{pendingKind === "phone" ? "در حال آماده‌سازی…" : "دریافت کد پیامکی"}</button>
      </form> : !compact && <p className="border-r border-silver pr-4 text-sm leading-7 text-graphite/60">ورود با شماره موبایل پس از فعال‌شدن سرویس پیامک در دسترس قرار می‌گیرد.</p>}

      {googleAuthEnabled && <div className="flex items-center gap-4 text-xs text-graphite/40" aria-hidden="true"><span className="h-px flex-1 bg-silver" /><span>یا</span><span className="h-px flex-1 bg-silver" /></div>}

      {googleAuthEnabled ? <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="rounded-full border border-silver px-6 py-3 text-sm text-graphite transition-colors hover:border-sapphire hover:text-sapphire disabled:opacity-60">{pendingKind === "google" ? "در حال انتقال…" : "ادامه با حساب گوگل"}</button> : !compact && <p className="border-r border-silver pr-4 text-sm leading-7 text-graphite/60">ورود با حساب گوگل پس از تکمیل تنظیمات امن ورود در دسترس قرار می‌گیرد.</p>}

      {message && <p role="status" aria-live="polite" className="text-sm leading-7 text-sapphire">{message}</p>}
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm leading-7 text-graphite/70">{error}</p>}
    </div>
  );
}
