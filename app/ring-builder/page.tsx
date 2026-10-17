"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const bases = ["مینیمال", "ارگانیک", "کلاسیک", "ماهتابی", "شاخه‌ای", "گل‌دار"];
const shapes = ["گرد", "بیضی", "اشکی", "مارکیز", "کابوشن", "مربع"];
const colors = [["لاجوردی", "bg-stone-lapis"], ["سفید شفاف", "bg-stone-clear"], ["مشکی اونیکس", "bg-stone-onyx"], ["زمردی", "bg-stone-emerald"], ["صورتی ملایم", "bg-stone-rose"], ["بنفش", "bg-stone-violet"], ["شامپاینی", "bg-stone-champagne"]];
const ornaments = ["گل", "ماه", "ستاره", "برگ", "نقطه‌های نقره‌ای", "نشانه شخصی"];
type Selection = { base: string; shape: string; color: string; colorClass: string; ornament: string };
const initialSelection: Selection = { base: bases[0], shape: shapes[0], color: colors[0][0], colorClass: colors[0][1], ornament: ornaments[1] };

export default function RingBuilderPage() {
  const [selection, setSelection] = useState(initialSelection);
  const [saved, setSaved] = useState(false);
  const stoneShape = useMemo(() => ({ گرد: "rounded-full", بیضی: "rounded-[50%]", اشکی: "rounded-t-full rounded-b-[55%]", مارکیز: "rounded-[70%_30%_70%_30%]", کابوشن: "rounded-[40%]", مربع: "rounded-md" }[selection.shape] ?? "rounded-full"), [selection.shape]);
  function choose(key: keyof Selection, value: string, colorClass?: string) { setSaved(false); setSelection((current) => ({ ...current, [key]: value, ...(colorClass ? { colorClass } : {}) })); }
  function saveDraft() { window.localStorage.setItem("ornova-ring-draft", JSON.stringify(selection)); setSaved(true); }

  return <main className="ring-atelier"><section className="ring-atelier-intro"><p className="ritual-label">استودیو فرم / طراحی انگشتر</p><h1>فرمِ یک خاطره را پیدا کن.</h1><p>این‌جا یک پیش‌طرح می‌سازی؛ نه برای تصمیم عجولانه، برای دیدنِ چیزی که هنوز شکل نگرفته.</p></section><section className="ring-atelier-workspace"><div className="ring-specimen"><div className="ring-specimen-top"><span>پیش‌نمایش طرح شما</span><small>طرح اولیه / ۰۱</small></div><div className="ring-specimen-stage"><div className="ring-object"><div className="ring-band" /><div className="ring-setting" /><div className={`ring-stone ${stoneShape} ${selection.colorClass}`} /><div className="ring-mark">{selection.ornament === "ماه" ? "☾" : "✦"}</div></div><span className="ring-coordinate">فرم / نور / نسبت</span></div><div className="ring-specimen-caption"><p>{selection.base} / {selection.shape}</p><p>{selection.color} / {selection.ornament}</p></div><p className="ring-note">این پیش‌نمایش، طرح اولیه است. طراحی نهایی پس از بررسی Ornova و امکان‌سنجی فنی مشخص می‌شود.</p></div><div className="ring-controls"><ChoiceGroup title="پایهٔ فرم" items={bases} selected={selection.base} onSelect={(item) => choose("base", item)} variant="base" /><ChoiceGroup title="فرم سنگ" items={shapes} selected={selection.shape} onSelect={(item) => choose("shape", item)} variant="shape" /><div className="ring-choice"><h2>رنگ سنگ</h2><div className="ring-swatches">{colors.map(([label, color]) => <button type="button" aria-label={label} aria-pressed={selection.color === label} onClick={() => choose("color", label, color)} key={label}><span className={`ring-swatch ${color} ${selection.color === label ? "is-selected" : ""}`} /><small>{label}</small></button>)}</div></div><ChoiceGroup title="نشانهٔ روی قطعه" items={ornaments} selected={selection.ornament} onSelect={(item) => choose("ornament", item)} variant="ornament" /><button type="button" onClick={saveDraft} className="ring-save">ذخیرهٔ پیش‌طرح برای بررسی Ornova</button>{saved && <p className="ring-saved">پیش‌طرح در همین مرورگر ذخیره شد. برای ارسال درخواست، از فرم ارتباط استفاده کنید.</p>}<Link href="/contact" className="ring-submit">ارسال طرح برای بررسی ←</Link></div></section></main>;
}

function ChoiceGroup({ title, items, selected, onSelect, variant }: { title: string; items: string[]; selected: string; onSelect: (item: string) => void; variant: "base" | "shape" | "ornament" }) {
  return <div className="ring-choice"><h2>{title}</h2><div className="ring-options">{items.map((item, index) => <button type="button" aria-pressed={selected === item} onClick={() => onSelect(item)} key={item} className={selected === item ? "is-selected" : ""}><VisualThumb variant={variant} index={index} /><span>{item}</span></button>)}</div></div>;
}

function VisualThumb({ variant, index }: { variant: "base" | "shape" | "ornament"; index: number }) {
  if (variant === "shape") { const shapes = ["rounded-full", "rounded-[50%]", "rounded-t-full rounded-b-[55%]", "rounded-[70%_30%_70%_30%]", "rounded-[40%]", "rounded-md"]; return <i className={`ring-thumb-stone ${shapes[index]}`} />; }
  if (variant === "ornament") return <i className="ring-thumb-symbol">{["گل", "ماه", "ستاره", "برگ", "نقطه", "نشان"][index]}</i>;
  return <i className="ring-thumb-base"><b /></i>;
}
