"use client";

import { FormEvent, useEffect, useState } from "react";
import { getInquiryStatusLabel } from "@/lib/commerce/inquiry-status";
import { uploadInquiryReferenceFile } from "@/lib/commerce/upload-inquiry-file";

type Message = { id: string; author_role: "customer" | "staff"; body: string; created_at: string };
type Event = { id: string; previous_status: string | null; status: string; created_at: string };
export type InquiryThreadData = { messages: Message[]; events: Event[] };
type ThreadData = InquiryThreadData;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function fetchThread(inquiryId: string): Promise<ThreadData> {
  const response = await fetch(`/api/inquiries/${inquiryId}/messages`, { cache: "no-store" });
  const result = await response.json() as ThreadData & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "گفت‌وگو بارگذاری نشد.");
  return { messages: result.messages ?? [], events: result.events ?? [] };
}

export function InquiryConversation({
  inquiryId,
  status,
  viewer,
  reloadToken = 0,
  initialThread,
}: {
  inquiryId: string;
  status: string;
  viewer: "customer" | "staff";
  reloadToken?: number;
  initialThread?: InquiryThreadData;
}) {
  const [thread, setThread] = useState<ThreadData | null>(initialThread ?? null);
  const [loading, setLoading] = useState(!initialThread);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (initialThread) return;

    let cancelled = false;
    fetchThread(inquiryId)
      .then((result) => {
        if (cancelled) return;
        setThread(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "گفت‌وگو بارگذاری نشد.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [inquiryId, reloadToken, initialThread]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;

    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json() as { error?: string; message?: Message };
      const savedMessage = result.message;
      if (!response.ok || !savedMessage) throw new Error(result.error ?? "پیام ارسال نشد.");
      form.reset();
      setNotice("پیام به همین پرونده اضافه شد.");
      setThread((current) => current ? { ...current, messages: [...current.messages, savedMessage] } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "پیام ارسال نشد.");
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("reference-file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    setNotice(null);
    try {
      const result = await uploadInquiryReferenceFile(inquiryId, file);
      if (!result.success) throw new Error(result.message ?? "فایل پیوست نشد.");
      form.reset();
      setSelectedFileName("");
      setNotice("فایل به پروندهٔ خصوصی شما پیوست شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "فایل پیوست نشد؛ دوباره تلاش کنید.");
    } finally {
      setUploadingFile(false);
    }
  }

  const canReply = viewer === "staff" || status !== "closed";

  return (
    <section className="inquiry-conversation" aria-label="گفت‌وگو و روند درخواست">
      <div className="inquiry-thread-grid">
        <div>
          <h4>روند پرونده</h4>
          {loading && !thread ? <p className="inquiry-thread-muted">در حال دریافت…</p> : thread?.events.length ? (
            <ol className="inquiry-event-list">
              {thread.events.map((item) => (
                <li key={item.id}>
                  <span className="inquiry-event-mark" aria-hidden="true" />
                  <div>
                    <p>{item.previous_status ? `از «${getInquiryStatusLabel(item.previous_status)}» به «${getInquiryStatusLabel(item.status)}»` : getInquiryStatusLabel(item.status)}</p>
                    <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="inquiry-thread-muted">تاریخچه‌ی مرحله‌ها هنوز در دسترس نیست.</p>}
        </div>

        <div>
          <h4>گفت‌وگو با Ornova</h4>
          {loading && !thread ? <p className="inquiry-thread-muted">در حال دریافت پیام‌ها…</p> : thread?.messages.length ? (
            <ol className="inquiry-message-list">
              {thread.messages.map((item) => (
                <li key={item.id} className={item.author_role === "staff" ? "is-staff" : "is-customer"}>
                  <p className="inquiry-message-author">{item.author_role === "staff" ? "پاسخ Ornova" : "پیام شما"}</p>
                  <p className="inquiry-message-body">{item.body}</p>
                  <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                </li>
              ))}
            </ol>
          ) : <p className="inquiry-thread-muted">هنوز پیامی در این پرونده ردوبدل نشده است.</p>}

          {canReply ? (
            <>
            <form onSubmit={handleSubmit} className="inquiry-reply-form">
              <label htmlFor={`reply-${inquiryId}`} className="sr-only">پیام تازه درباره‌ی این درخواست</label>
              <textarea id={`reply-${inquiryId}`} name="body" rows={3} maxLength={4000} required placeholder={viewer === "staff" ? "پاسخ را در همین پرونده بنویسید…" : "پرسش یا توضیح تازه‌ای دارید؟"} />
              <button type="submit" disabled={sending}>{sending ? "در حال ارسال…" : viewer === "staff" ? "ثبت پاسخ" : "ارسال پیام"}</button>
            </form>
            {viewer === "customer" && <form onSubmit={handleFileUpload} className="inquiry-reply-form mt-3">
              <label htmlFor={`file-${inquiryId}`} className="sr-only">پیوست تصویر یا فایل مرجع به این پرونده</label>
              <input id={`file-${inquiryId}`} name="reference-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")} className="min-w-0 text-xs text-graphite/70 file:ml-3 file:rounded-full file:border file:border-silver file:bg-ivory-soft file:px-4 file:py-2 file:text-xs file:text-sapphire" />
              <button type="submit" disabled={uploadingFile}>{uploadingFile ? "در حال پیوست…" : "پیوست به پرونده"}</button>
              <span className="basis-full text-xs text-graphite/55">JPEG، PNG، WebP یا PDF؛ حداکثر ۱۰ مگابایت{selectedFileName ? ` · ${selectedFileName}` : ""}</span>
            </form>}
            </>
          ) : <p className="inquiry-thread-muted">این پرونده بسته شده است؛ برای پیگیری تازه درخواست جدیدی ثبت کنید.</p>}
          {notice && <p className="inquiry-feedback" role="status">{notice}</p>}
          {error && <p className="inquiry-feedback" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
