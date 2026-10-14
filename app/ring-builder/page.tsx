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

  function choose(key: keyof Selection, value: string, colorClass?: string) {
    setSaved(false);
    setSelection((current) => ({ ...current, [key]: value, ...(colorClass ? { colorClass } : {}) }));
  }

  function saveDraft() {
    window.localStorage.setItem("ornova-ring-draft", JSON.stringify(selection));
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-sapphire">طراحی انگشتر با پنل Ornova</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">پیش‌نمایش بصری انگشتر اختصاصی</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-graphite/70">گزینه‌ها را برای ساختن یک کانسپت اولیه کنار هم بگذارید؛ نتیجه برای بررسی انسانی و امکان‌سنجی فنی Ornova آماده می‌شود.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-silver bg-navy p-6 text-ivory">
          <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">پیش‌نمایش طرح شما</h2><span className="rounded-full border border-ivory/20 px-4 py-2 text-xs text-ivory/70">طرح اولیه</span></div>
          <div className="mt-8 grid min-h-[430px] place-items-center rounded-[26px] border border-ivory/20 bg-ivory/10">
            <div className="relative h-80 w-80">
              <div className="absolute bottom-8 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full border-[18px] border-silver/75" />
              <div className="absolute bottom-24 left-1/2 h-28 w-40 -translate-x-1/2 rounded-[45%] border border-silver/60 bg-silver/15" />
              <div className={`absolute left-1/2 top-16 h-24 w-24 -translate-x-1/2 border-[10px] border-silver/75 ${stoneShape} ${selection.colorClass}`} />
              <div className="absolute left-[42%] top-8 text-3xl text-moon">{selection.ornament === "ماه" ? "ماه" : "✦"}</div>
              <div className="absolute left-[58%] top-24 h-3 w-3 rounded-full bg-moon" />
              <div className="absolute left-[36%] top-28 h-2 w-2 rounded-full bg-moon" />
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-sm leading-7 text-ivory/70 sm:grid-cols-2"><p>پایه: {selection.base}</p><p>سنگ: {selection.shape} / {selection.color}</p><p>جزئیات: {selection.ornament}</p></div>
          <p className="mt-4 border-t border-ivory/15 pt-4 text-sm leading-7 text-ivory/70">این پیش‌نمایش، طرح اولیه است. طراحی نهایی پس از بررسی Ornova و امکان‌سنجی فنی مشخص می‌شود.</p>
        </section>

        <section className="space-y-5">
          <OptionGroup title="انتخاب پایه انگشتر" items={bases} selected={selection.base} onSelect={(item) => choose("base", item)} variant="base" />
          <OptionGroup title="انتخاب فرم سنگ" items={shapes} selected={selection.shape} onSelect={(item) => choose("shape", item)} variant="shape" />
          <div className="rounded-[28px] border border-silver bg-ivory-soft p-5"><h2 className="text-lg font-semibold text-graphite">انتخاب رنگ سنگ</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{colors.map(([label, color]) => <button type="button" aria-pressed={selection.color === label} onClick={() => choose("color", label, color)} key={label} className={`rounded-[18px] border p-3 text-right ${selection.color === label ? "border-sapphire" : "border-silver"}`}><div className={`h-14 rounded-full border border-silver ${color}`} /><p className="mt-3 text-sm text-graphite/75">{label}</p></button>)}</div></div>
          <OptionGroup title="انتخاب جزئیات تزئینی" items={ornaments} selected={selection.ornament} onSelect={(item) => choose("ornament", item)} variant="ornament" />
          <button type="button" onClick={saveDraft} className="w-full rounded-full bg-sapphire px-6 py-4 text-sm font-medium text-ivory">ذخیره پیش‌نمایش برای بررسی Ornova</button>
          {saved && <div className="rounded-[20px] border border-sapphire/30 bg-sapphire-soft p-4 text-sm leading-7 text-graphite">پیش‌نمایش در همین مرورگر ذخیره شد. برای ارسال درخواست، از فرم ارتباط استفاده کنید.</div>}
          <Link href="/contact" className="block text-center text-sm text-sapphire underline decoration-silver underline-offset-4">رفتن به فرم درخواست</Link>
        </section>
      </div>
    </div>
  );
}

function OptionGroup({ title, items, selected, onSelect, variant }: { title: string; items: string[]; selected: string; onSelect: (item: string) => void; variant: "base" | "shape" | "ornament" }) {
  return <div className="rounded-[28px] border border-silver bg-ivory-soft p-5"><h2 className="text-lg font-semibold text-graphite">{title}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item, index) => <button type="button" aria-pressed={selected === item} onClick={() => onSelect(item)} key={item} className={`rounded-[18px] border bg-ivory p-3 text-right ${selected === item ? "border-sapphire" : "border-silver"}`}><VisualThumb variant={variant} index={index} /><p className="mt-3 text-sm text-graphite/75">{item}</p></button>)}</div></div>;
}

function VisualThumb({ variant, index }: { variant: "base" | "shape" | "ornament"; index: number }) {
  if (variant === "shape") { const shapeClasses = ["rounded-full", "rounded-[50%]", "rounded-t-full rounded-b-[55%]", "rounded-[70%_30%_70%_30%]", "rounded-[40%]", "rounded-md"]; return <div className={`mx-auto h-14 w-14 border border-silver bg-stone-lapis ${shapeClasses[index]}`} />; }
  if (variant === "ornament") return <div className="grid h-14 place-items-center rounded-[16px] border border-silver bg-silver-muted text-sm text-sapphire">{["گل", "ماه", "ستاره", "برگ", "نقطه", "نشان"][index]}</div>;
  return <div className="relative h-14 rounded-[16px] border border-silver bg-silver-muted"><div className="absolute bottom-2 left-1/2 h-9 w-12 -translate-x-1/2 rounded-full border-[5px] border-silver bg-ivory/70" /><div className="absolute left-1/2 top-2 h-5 w-5 -translate-x-1/2 rounded-full bg-stone-lapis" /></div>;
}
