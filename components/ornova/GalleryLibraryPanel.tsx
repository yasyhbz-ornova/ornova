"use client";

import { useEffect, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./GalleryLibraryPanel.module.css";

type Generation = { id: string; idea: string; state: string; created_at: string };
type LibraryState = "loading" | "guest" | "ready" | "unavailable";
const date = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" });

export function GalleryLibraryPanel({ onOpenAccount }: { onOpenAccount(): void }) {
  const [state, setState] = useState<LibraryState>("loading");
  const [rows, setRows] = useState<Generation[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadLibrary() {
      setState("loading");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError && !isAuthSessionMissingError(authError)) throw authError;
        if (!user) { if (active) { setRows([]); setState("guest"); } return; }

        const { data, error } = await supabase
          .from("studio_generations")
          .select("id,idea,state,created_at")
          .order("created_at", { ascending: false })
          .limit(24);
        if (error) throw error;
        if (active) { setRows((data ?? []) as Generation[]); setState("ready"); }
      } catch {
        if (active) setState("unavailable");
      }
    }
    void loadLibrary();
    return () => { active = false; };
  }, [attempt]);

  return <section className={styles.library} aria-label="گالری خصوصی طرح‌های همراهی">
    <p className={styles.eyebrow}>دفتر طرح‌های شخصی</p>
    <h2>گالری من</h2>
    <p className={styles.intro}>پیش‌طرح‌های ساخته‌شده برای همین حساب؛ هر تصویر تا پیش از بررسی فنی، پیشنهاد اولیه است و تأیید ساخت نیست.</p>
    {state === "loading" && <p role="status" className={styles.notice}>در حال بازکردن دفتر طرح‌ها…</p>}
    {state === "guest" && <div className={styles.notice}><p>این دفتر خصوصی است. برای دیدن پیش‌طرح‌های ذخیره‌شده وارد حساب اُرنوا شو.</p><button type="button" className={styles.action} onClick={onOpenAccount}>ورود به حساب در گالری ←</button></div>}
    {state === "unavailable" && <div className={styles.notice} role="alert"><p>دفتر طرح‌ها فعلاً پاسخ نداد؛ این پیام به معنی خالی‌بودن یا حذف طرح‌ها نیست.</p><button type="button" className={styles.action} onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</button></div>}
    {state === "ready" && rows.length === 0 && <p className={styles.notice}>هنوز پیش‌طرحی در این دفتر ثبت نشده است. می‌توانی از اتاق طراحی یک ایده را شروع کنی.</p>}
    {state === "ready" && rows.length > 0 && <div className={styles.entries}>
      {rows.map((row) => <article className={styles.entry} key={row.id}>
        {row.state === "ready" ? <>
          {/* Private cookie-authenticated image route; avoid shared image caches. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.image} src={"/api/studio/generations/" + row.id + "/image"} alt="پیش‌طرح شخصی؛ در انتظار بررسی فنی" loading="lazy" />
        </> : <p className={styles.pending}>{row.state === "failed" ? "ساخت یا ذخیرهٔ تصویر تأیید نشد." : "در حال انجام یا نتیجه نامشخص؛ هنوز تصویر تأییدشده‌ای نداریم."}</p>}
        <p className={styles.meta}>{Number.isFinite(Date.parse(row.created_at)) ? date.format(new Date(row.created_at)) : "تاریخ ثبت نشده"} <span>·</span> {row.state === "ready" ? "پیش‌طرح، نیازمند بررسی" : "تلاش ثبت‌شده"}</p>
        <p className={styles.idea}>{row.idea}</p>
      </article>)}
    </div>}
    <p className={styles.privacy}>این فایل‌ها فقط با حساب صاحب طرح نمایش داده می‌شوند؛ انتشار عمومی به اجازه‌ای جداگانه نیاز دارد.</p>
  </section>;
}
