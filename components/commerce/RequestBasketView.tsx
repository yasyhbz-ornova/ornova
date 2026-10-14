"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearRequestItems, removeRequestItem, type RequestItem } from "./RequestBasketButton";

const STORAGE_KEY = "ornova-request-basket";

export function RequestBasketView() {
  const [items, setItems] = useState<RequestItem[]>([]);

  useEffect(() => {
    const sync = () => {
      try { setItems(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setItems([]); }
    };
    sync();
    window.addEventListener("ornova-basket-updated", sync);
    return () => window.removeEventListener("ornova-basket-updated", sync);
  }, []);

  if (items.length === 0) {
    return <div className="mx-auto max-w-3xl px-5 py-20 text-center"><p className="text-sm text-sapphire">سبد درخواست</p><h1 className="mt-4 text-4xl font-semibold text-graphite">هنوز قطعه‌ای انتخاب نشده است.</h1><p className="mx-auto mt-5 max-w-xl text-base leading-8 text-graphite/70">قطعات موردنظر را از فروشگاه به سبد درخواست اضافه کنید تا برای بررسی Ornova آماده شوند.</p><Link href="/shop" className="mt-8 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">رفتن به فروشگاه</Link></div>;
  }

  return <div className="mx-auto max-w-5xl px-5 py-16"><div className="max-w-2xl"><p className="text-sm text-sapphire">سبد درخواست</p><h1 className="mt-3 text-4xl font-semibold text-graphite">انتخاب‌های شما برای بررسی Ornova</h1><p className="mt-5 text-base leading-8 text-graphite/70">این سبد هنوز سفارش یا پرداخت نیست؛ فقط قطعاتی را که می‌خواهید درباره‌شان گفت‌وگو کنیم، کنار هم نگه می‌دارد.</p></div><div className="mt-10 space-y-4">{items.map((item) => <div key={item.slug} className="flex flex-col gap-4 border-b border-silver py-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-sapphire">{item.category}</p><h2 className="mt-2 text-xl font-semibold text-graphite">{item.name}</h2><p className="mt-2 text-sm text-graphite/60">تعداد: {item.quantity}</p></div><button type="button" onClick={() => removeRequestItem(item.slug)} className="w-fit text-sm text-graphite/60 underline decoration-silver underline-offset-4 hover:text-sapphire">حذف از سبد</button></div>)}</div><div className="mt-10 flex flex-wrap gap-3"><button type="button" onClick={clearRequestItems} className="rounded-full border border-silver px-5 py-3 text-sm text-graphite">پاک‌کردن سبد</button><Link href="/contact" className="rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">ادامه برای ارسال درخواست</Link></div></div>;
}
