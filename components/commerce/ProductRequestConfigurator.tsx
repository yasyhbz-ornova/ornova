"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseEuSizeInput, parseProductPreferences } from "@/lib/commerce/product-preferences";
import { readItems, saveConfiguredRequestItem } from "./RequestBasketButton";
import { ProductPreferencesSummary } from "./ProductPreferencesSummary";
import { getRequestItemKey, type RequestItem } from "@/lib/commerce/request-basket";
import styles from "./ProductDetail.module.css";

type ProductIdentity = { slug: string; name: string; category: string };
const fieldClass = "min-h-11 w-full border-b border-silver bg-transparent px-1 py-2 text-sm leading-7 text-graphite outline-none placeholder:text-graphite/60 focus:border-sapphire";

export function ProductRequestConfigurator({ item, isRing }: { item: ProductIdentity; isRing: boolean }) {
  const router = useRouter();
  const [fields, setFields] = useState({ size: "", stone_note: "", dimensions_note: "", finish_note: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string>();
  const [existingChoices, setExistingChoices] = useState<RequestItem[]>([]);
  const sizeRef = useRef<HTMLInputElement>(null);
  const questionHref = `/contact?product=${encodeURIComponent(item.slug)}&intent=question`;
  useEffect(() => {
    const choices = readItems().filter((entry) => entry.slug === item.slug);
    const selected = new URLSearchParams(window.location.search).get("selection");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load only the explicitly selected saved line after hydration; other configurations remain independent.
    setExistingChoices(choices);
    if (!selected) return;
    setEditingKey(selected);
    const choice = choices.find((entry) => getRequestItemKey(entry) === selected);
    if (!choice) { setError("این انتخاب دیگر در سبد نیست؛ مشخصات دیگری جای آن بارگذاری نشده است."); return; }
    const preferences = choice.preferences;
    setFields({ size: preferences?.ring_size_eu === undefined ? "" : String(preferences.ring_size_eu), stone_note: preferences?.stone_note ?? "", dimensions_note: preferences?.dimensions_note ?? "", finish_note: preferences?.finish_note ?? "" });
  }, [item.slug]);
  const size = isRing ? parseEuSizeInput(fields.size) : undefined;
  const parsed = parseProductPreferences({ version: 1, ...(size !== undefined && size !== null ? { ring_size_eu: size } : {}), stone_note: fields.stone_note, dimensions_note: fields.dimensions_note, finish_note: fields.finish_note }, isRing);
  function change(key: keyof typeof fields, value: string) { setFields((current) => ({ ...current, [key]: value })); setSaved(false); setError(""); }
  function save(destination?: "price" | "question") {
    if (size === null) { setError("سایز اروپایی را مانند ۵۴ یا ۵۴٫۵ بنویسید؛ اگر نمی‌دانید، خالی بگذارید."); sizeRef.current?.focus(); return; }
    if (!parsed.success) { setError(parsed.error); return; }
    const result = saveConfiguredRequestItem(item, parsed.value, editingKey);
    if (!result.success) { setError(result.error); return; }
    setEditingKey(result.key);
    setExistingChoices(readItems().filter((entry) => entry.slug === item.slug));
    setSaved(true); setError("");
    if (destination) router.push(`/contact?product=${encodeURIComponent(item.slug)}&selection=${encodeURIComponent(result.key)}&intent=${destination}`);
  }
  return <section id="product-request" aria-label="مشخصات درخواست قطعه" className={styles.request}>
    <h2>برای تو، با چه جزئیاتی؟</h2>
    <p className={styles.intro}>این مشخصات اختیاری‌اند. سایز و تغییرات دلخواهت را بنویس؛ جزئیات ساخت و قیمت پس از بررسی مشخص می‌شوند.</p>
    {existingChoices.length > 0 && <details className="mt-4 border-b border-silver text-sm text-graphite"><summary className="min-h-11 cursor-pointer py-3 text-sapphire">انتخاب‌های این مدل در سبد ({new Intl.NumberFormat("fa-IR").format(existingChoices.length)})</summary><ul className="grid gap-3 py-3">{existingChoices.map((choice, index) => <li key={getRequestItemKey(choice)}><a href={`/shop/${item.slug}?selection=${encodeURIComponent(getRequestItemKey(choice))}#product-request`} className="inline-flex min-h-11 items-center text-sapphire underline underline-offset-4">ویرایش انتخاب {new Intl.NumberFormat("fa-IR").format(index + 1)}</a><ProductPreferencesSummary value={choice.preferences} /></li>)}</ul></details>}
    {editingKey && <div className="mt-4 flex flex-wrap items-center gap-4 text-sm"><p className="text-graphite/75">در حال ویرایش یک انتخاب؛ ردیف‌های دیگر تغییر نمی‌کنند.</p><button type="button" onClick={() => { setEditingKey(undefined); setFields({size:"",stone_note:"",dimensions_note:"",finish_note:""}); setSaved(false); setError(""); window.history.replaceState(null,"",`/shop/${item.slug}#product-request`); }} className="min-h-11 text-sapphire underline underline-offset-4">افزودن مشخصات دیگر</button></div>}
    <div className={styles.fields}>
      {isRing && <label className="grid gap-2 text-sm text-graphite">سایز اروپایی انگشتر
        <input ref={sizeRef} aria-label="سایز اروپایی انگشتر" value={fields.size} onChange={(event) => change("size", event.target.value)} inputMode="decimal" maxLength={6} placeholder="مثلاً ۵۴ یا ۵۴٫۵" aria-invalid={size === null} aria-describedby={`product-size-help${error ? " product-request-error" : ""}`} className={fieldClass} />
        <span id="product-size-help" className={styles.sizeHelp}>سایز را نمی‌دانی؟ می‌توانی خالی بگذاری. <Link href="/size-guide">راهنمای اندازه‌گیری</Link></span>
      </label>}
      <label className="grid gap-2 text-sm text-graphite">سنگ و رنگ دلخواه <input value={fields.stone_note} onChange={(event) => change("stone_note", event.target.value)} maxLength={120} placeholder="مطابق تصویر، بدون سنگ یا ترجیح دیگری برای بررسی" className={fieldClass} /></label>
      <details open={Boolean(fields.dimensions_note || fields.finish_note) || undefined} className="text-sm text-graphite"><summary>ابعاد و پرداخت <span aria-hidden="true">＋</span></summary><div className="mt-3 grid gap-5">
        <label className="grid gap-2">اندازه و ابعاد دلخواه <input value={fields.dimensions_note} onChange={(event) => change("dimensions_note", event.target.value)} maxLength={120} placeholder="مثلاً طول دلخواه؛ واحد اندازه‌گیری را هم بنویسید" className={fieldClass} /></label>
        <label className="grid gap-2">پرداخت و جزئیات دلخواه <input value={fields.finish_note} onChange={(event) => change("finish_note", event.target.value)} maxLength={120} placeholder="مثلاً پرداخت مات؛ صرفاً برای بررسی" className={fieldClass} /></label>
      </div></details>
    </div>
    {parsed.success && <ProductPreferencesSummary value={parsed.value} />}
    {error && <div className="mt-4 text-sm leading-7 text-sapphire"><p id="product-request-error" role="alert">{error}</p><Link href={questionHref} className="inline-flex min-h-11 items-center underline underline-offset-4">رفتن به صفحهٔ ارتباط دربارهٔ این مدل</Link></div>}
    <div className={styles.actions}>
      <button type="button" onClick={() => save("price")} className={styles.primary}>بررسی و درخواست قیمت <span aria-hidden="true">←</span></button>
      <button type="button" onClick={() => save()} className={styles.secondary}>ذخیره در سبد درخواست</button>
      <Link href={questionHref} onClick={(event) => {
        if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault(); save("question");
      }} className={styles.question}>پرسش دربارهٔ این قطعه</Link>
    </div>
    <p role="status" aria-live="polite" className={styles.status}>{saved ? "این انتخاب در سبد همین مرورگر ذخیره شد؛ هنوز برای Ornova ارسال نشده است." : "انتخاب‌ها در سبد همین مرورگر می‌مانند؛ ارسال درخواست در مرحلهٔ بعد است."}</p>
    {saved && <Link href="/?galleryPanel=basket" className="mt-2 inline-flex min-h-11 items-center text-sm text-sapphire underline underline-offset-4">رفتن به صندوق گالری</Link>}
  </section>;
}
