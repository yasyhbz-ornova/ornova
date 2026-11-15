"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { parseRingDesignDraft, RING_BAND_WIDTHS } from "@/lib/commerce/ring-design";

const bases = RING_BAND_WIDTHS.map((width) => width.label);
const shapes = ["گرد", "بیضی", "اشکی", "مارکیز", "کابوشن", "مربع"];
const colors = [["لاجوردی", "bg-stone-lapis"], ["سفید شفاف", "bg-stone-clear"], ["مشکی اونیکس", "bg-stone-onyx"], ["زمردی", "bg-stone-emerald"], ["صورتی ملایم", "bg-stone-rose"], ["بنفش", "bg-stone-violet"], ["شامپاینی", "bg-stone-champagne"]] as const;
const details = ["بدون جزئیات افزوده", "یک تأکید کوچک", "خط پیوسته", "جزئیات پیرامون سنگ"];
const DRAFT_KEY = "ornova-ring-draft";

type Selection = { base: string; shape: string; color: string; colorClass: string; ornament: string; ringSizeEu: string };
const initialSelection: Selection = { base: "متوسط", shape: shapes[0], color: colors[0][0], colorClass: colors[0][1], ornament: details[0], ringSizeEu: "" };

function subscribeToRingDraft(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ornova-ring-draft-updated", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ornova-ring-draft-updated", onStoreChange);
  };
}

function getRingDraftSnapshot() {
  try { return window.localStorage.getItem(DRAFT_KEY); } catch { return null; }
}

export function RingDesignBuilder({ onContinueRequest, onContinueWithoutDraft, onOpenProduct, onOpenSizeGuide }: {
  onContinueRequest(): void;
  onContinueWithoutDraft(): void;
  onOpenProduct(): void;
  onOpenSizeGuide(): void;
}) {
  const storedDraft = useSyncExternalStore(subscribeToRingDraft, getRingDraftSnapshot, () => null);
  const restoredSelection = useMemo(() => parseRingDesignDraft(storedDraft, { shapes, colors, details }), [storedDraft]);
  const [editedSelection, setEditedSelection] = useState<Selection | null>(null);
  const selection = editedSelection ?? restoredSelection ?? initialSelection;
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  function choose(key: keyof Selection, value: string, colorClass?: string) {
    setSaved(false);
    setSaveError(false);
    setEditedSelection((current) => ({ ...(current ?? selection), [key]: value, ...(colorClass ? { colorClass } : {}) }));
  }

  function continueWithDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(selection));
    } catch {
      setSaved(false);
      setSaveError(true);
      return;
    }
    window.dispatchEvent(new Event("ornova-ring-draft-updated"));
    setSaveError(false);
    setSaved(true);
    onContinueRequest();
  }

  return <div className="ring-atelier ring-atelier-embedded">
    <section className="ring-atelier-intro">
      <p className="ritual-label">استودیو فرم / طراحی انگشتر</p>
      <h1>فرمِ یک خاطره را پیدا کن.</h1>
      <p>این‌جا یک پیش‌طرح می‌سازی؛ نه برای تصمیم عجولانه، برای دیدنِ چیزی که هنوز شکل نگرفته.</p>
    </section>
    <section className="ring-atelier-workspace">
      <div className="ring-specimen">
        <div className="ring-specimen-top"><span>یک قطعه از آرشیو Ornova</span><small>انگشتر لاجورد شب</small></div>
        <div className="ring-reference-image"><Image src="/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp" alt="انگشتر نقرهٔ لاجورد شب برای مشاهده در شناسنامهٔ گالری" fill sizes="(max-width: 800px) 100vw, 40vw" priority /></div>
        <div className="ring-specimen-caption"><p>نمونهٔ تأییدشده از آرشیو</p><button type="button" onClick={onOpenProduct}>دیدن شناسنامهٔ انگشتر ←</button></div>
        <section className="ring-selection-summary" aria-live="polite" aria-atomic="true">
          <h2>یادداشت انتخاب شما</h2>
          <p>رکاب {selection.base}، فرم {selection.shape}، رنگ {selection.color}، {selection.ornament}{selection.ringSizeEu ? `، سایز اروپایی ${selection.ringSizeEu}` : ""}</p>
        </section>
        <p className="ring-note">این تصویر پیش‌نمایش انتخاب‌های شما نیست. تنظیمات به‌صورت یادداشت برای بررسی اولیهٔ Ornova پیوست می‌شوند؛ فرم نهایی پس از بررسی فنی مشخص خواهد شد.</p>
      </div>
      <div className="ring-controls">
        <ChoiceGroup title="پهنای رکاب" items={bases} selected={selection.base} onSelect={(item) => choose("base", item)} variant="base" />
        <ChoiceGroup title="فرم سنگ" items={shapes} selected={selection.shape} onSelect={(item) => choose("shape", item)} variant="shape" />
        <fieldset className="ring-choice"><legend>رنگ سنگ</legend><div className="ring-swatches">{colors.map(([label, color]) => <label className="ring-swatch-choice" key={label}><input className="ring-radio-input" type="radio" name="ring-color" value={label} checked={selection.color === label} onChange={() => choose("color", label, color)} /><span className={`ring-swatch ${color} ${selection.color === label ? "is-selected" : ""}`} /><small>{label}</small></label>)}</div></fieldset>
        <ChoiceGroup title="ترکیب جزئیات" items={details} selected={selection.ornament} onSelect={(item) => choose("ornament", item)} variant="ornament" />
        <RingSizeField value={selection.ringSizeEu} onChange={(value) => choose("ringSizeEu", value)} onOpenSizeGuide={onOpenSizeGuide} />
        <button type="button" onClick={continueWithDraft} className="ring-save">ادامه با این پیش‌طرح</button>
        {saved && <p className="ring-saved" role="status">پیش‌طرح در همین مرورگر نگه داشته شد و به تلفن گالری پیوست می‌شود.</p>}
        {saveError && <p className="ring-saved" role="alert">مرورگر اجازهٔ نگه‌داری پیش‌طرح را نداد؛ تنظیمات ذخیره‌سازی را بررسی کنید و دوباره تلاش کنید.</p>}
        <button type="button" onClick={onContinueWithoutDraft} className="ring-submit">ارسال ایده بدون پیش‌طرح ←</button>
      </div>
    </section>
  </div>;
}

function RingSizeField({ value, onChange, onOpenSizeGuide }: { value: string; onChange(value: string): void; onOpenSizeGuide(): void }) {
  return <fieldset className="ring-choice"><legend>سایز اروپایی انگشتر (اختیاری)</legend><label className="grid max-w-xs gap-2 text-sm text-graphite"><span>اگر سایز را می‌دانید وارد کنید</span><input type="text" inputMode="numeric" dir="ltr" maxLength={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder="مثلاً ۵۴" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 text-left outline-none focus:border-sapphire" /></label><button type="button" onClick={onOpenSizeGuide} className="mt-3 inline-flex min-h-11 items-center text-sm text-sapphire underline decoration-silver underline-offset-4">راهنمای اندازه‌گیری سایز</button></fieldset>;
}

function ChoiceGroup({ title, items, selected, onSelect, variant }: { title: string; items: string[]; selected: string; onSelect(item: string): void; variant: "base" | "shape" | "ornament" }) {
  return <fieldset className="ring-choice"><legend>{title}</legend><div className="ring-options">{items.map((item) => <label key={item} className={`ring-option ${selected === item ? "is-selected" : ""}`}><input className="ring-radio-input" type="radio" name={`ring-${variant}`} value={item} checked={selected === item} onChange={() => onSelect(item)} /><span>{item}</span></label>)}</div></fieldset>;
}
