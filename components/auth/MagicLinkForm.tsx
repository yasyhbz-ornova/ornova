"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function normalizePhoneNumber(value: string) {
  const latinDigits = value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10));
  const compact = latinDigits.replace(/[\s()-]/g, "");
  if (compact.startsWith("09") && compact.length === 11) return `+98${compact.slice(1)}`;
  if (compact.startsWith("9") && compact.length === 10) return `+98${compact}`;
  return compact;
}

export function MagicLinkForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [awaitingPhoneOtp, setAwaitingPhoneOtp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function callbackUrl() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return new URL("/auth/callback?next=/account", siteUrl).toString();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (authError) throw authError;
      setMessage("لینک ورود برای شما ارسال شد. صندوق ورودی و پوشه spam را بررسی کنید.");
    } catch {
      setError("اتصال ورود هنوز در این محیط فعال نشده است. لطفاً بعداً دوباره امتحان کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        setError("شماره را با پیش‌شماره کشور وارد کنید؛ برای ایران می‌توانید از +98 یا 09 شروع کنید.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true },
      });
      if (authError) throw authError;
      setPhone(normalizedPhone);
      setAwaitingPhoneOtp(true);
      setMessage("کد یک‌بارمصرف پیامکی برای شما ارسال شد.");
    } catch {
      setError("ورود پیامکی در حال حاضر در دسترس نیست. شماره را با پیش‌شماره کشور وارد کنید یا از ورود با ایمیل استفاده کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: phoneOtp,
        type: "sms",
      });
      if (authError) throw authError;
      router.push("/account");
    } catch {
      setError("کد واردشده معتبر نیست یا زمان آن گذشته است. دوباره بررسی کنید یا کد تازه بگیرید.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (authError) throw authError;
    } catch {
      setError("ورود با حساب گوگل هنوز در تنظیمات Ornova فعال نشده است.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      {awaitingPhoneOtp ? <form onSubmit={handlePhoneOtpSubmit} className="grid gap-4">
        <p className="text-sm leading-7 text-graphite/65">کد ارسال‌شده به شماره‌ی <bdi dir="ltr">{phone}</bdi> را وارد کنید.</p>
        <label className="grid gap-2 text-sm text-graphite"><span>کد یک‌بارمصرف</span><input required type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={phoneOtp} onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} className="border-b border-silver bg-transparent px-1 py-3 text-left tracking-[0.35em] outline-none focus:border-sapphire" /></label>
        <button type="submit" disabled={loading} className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{loading ? "در حال بررسی…" : "تأیید و ورود"}</button>
        <button type="button" onClick={() => { setAwaitingPhoneOtp(false); setPhoneOtp(""); setMessage(null); }} className="w-fit text-xs text-graphite/55 underline underline-offset-4">تغییر شماره موبایل</button>
      </form> : <form onSubmit={handlePhoneSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm text-graphite"><span>شماره موبایل</span><input required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} className="border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire" placeholder="+98912…" /></label>
        <button type="submit" disabled={loading} className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{loading ? "در حال آماده‌سازی…" : "دریافت کد پیامکی"}</button>
      </form>}

      <div className="flex items-center gap-4 text-xs text-graphite/40" aria-hidden="true"><span className="h-px flex-1 bg-silver" /><span>یا</span><span className="h-px flex-1 bg-silver" /></div>

      <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="rounded-full border border-silver px-6 py-3 text-sm text-graphite transition-colors hover:border-sapphire hover:text-sapphire disabled:opacity-60">ادامه با حساب گوگل</button>

      <details className="border-t border-silver pt-4">
        <summary className="cursor-pointer text-sm text-graphite/65">ورود با ایمیل</summary>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm text-graphite"><span>ایمیل</span><input required type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className="border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire" placeholder="you@example.com" /></label>
          <button type="submit" disabled={loading} className="w-fit text-sm text-sapphire underline underline-offset-4 disabled:opacity-60">ارسال لینک یک‌بارمصرف</button>
        </form>
      </details>

      {message && <p role="status" className="text-sm leading-7 text-sapphire">{message}</p>}
      {error && <p role="alert" className="text-sm leading-7 text-graphite/70">{error}</p>}
    </div>
  );
}
