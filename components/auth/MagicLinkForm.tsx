"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      });
      if (authError) throw authError;
      setMessage("لینک ورود برای شما ارسال شد. صندوق ورودی و پوشه spam را بررسی کنید.");
    } catch {
      setError("اتصال ورود هنوز در این محیط فعال نشده است. لطفاً بعداً دوباره امتحان کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
      <label className="grid gap-2 text-sm text-graphite"><span>ایمیل</span><input required type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-[16px] border border-silver bg-ivory px-4 py-3 text-left outline-none focus:border-sapphire" placeholder="you@example.com" /></label>
      <button type="submit" disabled={loading} className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{loading ? "در حال آماده‌سازی…" : "ارسال لینک ورود"}</button>
      {message && <p role="status" className="text-sm leading-7 text-sapphire">{message}</p>}
      {error && <p role="alert" className="text-sm leading-7 text-graphite/70">{error}</p>}
    </form>
  );
}
