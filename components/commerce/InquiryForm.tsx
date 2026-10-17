"use client";

import { FormEvent, useEffect, useState } from "react";

const DRAFT_KEY = "ornova-inquiry-draft";
const BASKET_KEY = "ornova-request-basket";
type SelectedItem = { slug: string; name: string; category: string; quantity: number };

export function InquiryForm() {
  const [saved, setSaved] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  useEffect(() => {
    const syncSelectedItems = () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(BASKET_KEY) ?? "[]") as SelectedItem[];
        setSelectedItems(Array.isArray(stored) ? stored : []);
      } catch {
        setSelectedItems([]);
      }
    };
    syncSelectedItems();
    window.addEventListener("ornova-basket-updated", syncSelectedItems);
    return () => window.removeEventListener("ornova-basket-updated", syncSelectedItems);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setUploadWarning(null);
    const draft = {
      name: form.get("name"),
      contact: form.get("contact"),
      message: form.get("message"),
      savedAt: new Date().toISOString(),
    };

    try {
      const storedItems = JSON.parse(window.localStorage.getItem(BASKET_KEY) ?? "[]") as Array<{ slug: string; name: string; quantity: number }>;
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft.message,
          contact: draft.contact,
          items: storedItems.map((item) => ({ product_slug: item.slug, product_name: item.name, quantity: item.quantity })),
        }),
      });
      if (response.ok) {
        const result = await response.json() as { id: string };
        const file = form.get("file");
        if (file instanceof File && file.size > 0) {
          const uploadData = new FormData();
          uploadData.set("file", file);
          const uploadResponse = await fetch(`/api/inquiries/${result.id}/files`, { method: "POST", body: uploadData });
          if (!uploadResponse.ok) setUploadWarning("درخواست ثبت شد، اما فایل مرجع بارگذاری نشد.");
        }
        window.localStorage.removeItem("ornova-request-basket");
        window.localStorage.removeItem(DRAFT_KEY);
        setSaved(true);
        return;
      }
    } catch {
      // Keep a local draft when the authenticated API is unavailable.
    }

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-silver bg-ivory-soft p-6 md:p-8">
      <p className="text-sm text-sapphire">پیش‌نویس درخواست</p>
      <h2 className="mt-3 text-2xl font-semibold text-graphite">از ایده‌تان برای ما بگویید</h2>
      <p className="mt-3 text-sm leading-7 text-graphite/70">در صورت ورود، درخواست و قطعات انتخابی برای بررسی Ornova ثبت می‌شوند؛ در غیر این صورت پیش‌نویس فقط در همین مرورگر نگه داشته می‌شود.</p>
      {selectedItems.length > 0 && <div className="mt-6 border-y border-silver py-4"><p className="text-xs text-sapphire">قطعات انتخاب‌شده</p><ul className="mt-3 grid gap-3">{selectedItems.map((item) => <li key={item.slug} className="flex items-baseline justify-between gap-4 text-sm text-graphite"><span>{item.name}</span><span className="shrink-0 text-xs text-graphite/55">تعداد {item.quantity}</span></li>)}</ul></div>}
      <div className="mt-7 grid gap-5">
        <label className="grid gap-2 text-sm text-graphite"><span>نام</span><input required name="name" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
        <label className="grid gap-2 text-sm text-graphite"><span>راه ارتباطی</span><input required name="contact" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" placeholder="ایمیل یا شماره تماس" /></label>
        <label className="grid gap-2 text-sm text-graphite"><span>ایده یا پرسش</span><textarea required name="message" rows={5} className="resize-y rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
        <label className="grid gap-2 text-sm text-graphite"><span>تصویر یا فایل مرجع (اختیاری، حداکثر ۱۰ مگابایت)</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 text-sm" /></label>
      </div>
      <button type="submit" className="mt-7 rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">ذخیره پیش‌نویس درخواست</button>
      {saved && <p role="status" className="mt-4 text-sm text-sapphire">درخواست آماده شد. اگر وارد حساب نباشید، پیش‌نویس در همین مرورگر ذخیره شده و هنوز برای Ornova ارسال نشده است.</p>}
      {uploadWarning && <p role="status" className="mt-4 text-sm text-graphite/70">{uploadWarning}</p>}
    </form>
  );
}
