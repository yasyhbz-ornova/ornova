"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { galleryRenders } from "@/lib/constants/gallery-renders";
import { catalogCategories, resolveCatalogSelection } from "@/lib/constants/catalog";
import type { CatalogProductInput } from "@/lib/catalog/product-input";
import { toCatalogForm } from "@/lib/catalog/editor-form";
import { draftCatalogFormFromPhoto } from "@/lib/catalog/photo-draft";
import type { RoomPlacement } from "@/lib/catalog/room-placement";
import { RoomPlacementEditor } from "./RoomPlacementEditor";

type CatalogRow = CatalogProductInput & { room_placement?: RoomPlacement | null; created_at?: string; updated_at?: string };
type Media = CatalogProductInput["gallery"][number];
type Detail = CatalogProductInput["details"][number];
const blank = (): CatalogProductInput => ({ slug: "", revision: 0, name: "", category_id: "rings", category_label: "انگشتر", subtype_id: null, description: "", image_path: null, stand_image_path: null, gallery: [], details: [], packaging_gallery: [], turntable_video_path: null, image_fit: "contain", gallery_placement_verified: false, status: "review" });
const fieldClass = "w-full rounded-md border border-silver bg-ivory px-3 py-2 text-sm text-graphite outline-none focus-visible:border-sapphire focus-visible:ring-2 focus-visible:ring-sapphire/30";
const labelClass = "block text-sm leading-7 text-graphite";

export function CatalogEditor() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [form, setForm] = useState<CatalogProductInput>(blank);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const operationInProgress = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/catalog", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("فهرست آثار بارگذاری نشد.");
      const result = await response.json() as { products: CatalogRow[] };
      if (!controller.signal.aborted) setRows(result.products ?? []);
    }).catch(() => { if (!controller.signal.aborted) setError("فهرست آثار بارگذاری نشد. برای ویرایش، صفحه را دوباره باز کنید."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const category = resolveCatalogSelection(form.category_id, form.subtype_id).category;
  const savedRow = rows.find((item) => item.slug === selected);
  const unlinkedPhotos = galleryRenders.filter((photo) => photo.categoryId && !rows.some((row) => row.gallery.some((item) => item.src === photo.src)));
  const formMatchesSaved = savedRow ? JSON.stringify(form) === JSON.stringify(toCatalogForm(savedRow)) : false;
  const hasUnsavedChanges = savedRow ? !formMatchesSaved : JSON.stringify(form) !== JSON.stringify(blank());
  const canLeaveForm = () => !hasUnsavedChanges || window.confirm("تغییرات این شناسنامه ذخیره نشده است. از آن خارج می‌شوید؟");
  const update = <K extends keyof CatalogProductInput>(key: K, value: CatalogProductInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const select = (slug: string) => {
    if (operationInProgress.current || !canLeaveForm()) return;
    const row = rows.find((item) => item.slug === slug);
    setSelected(slug);
    setForm(row ? toCatalogForm(row) : blank());
    setNotice(""); setError("");
  };
  const updateMedia = (key: "gallery" | "packaging_gallery", index: number, field: "src" | "alt", value: string) => {
    setForm((current) => ({ ...current, [key]: current[key].map((item, position) => position === index ? { ...item, [field]: value } : item) }));
  };
  const removeMedia = (key: "gallery" | "packaging_gallery", index: number) => setForm((current) => ({ ...current, [key]: current[key].filter((_, position) => position !== index) }));
  const updateDetail = (index: number, field: keyof Detail, value: string) => update("details", form.details.map((item, position) => position === index ? { ...item, [field]: value } : item));
  const uploadImage = async (file: File | undefined, target: "image_path" | "stand_image_path" | "gallery" | "packaging_gallery") => {
    if (!file || operationInProgress.current) return;
    if (file.size > 4 * 1024 * 1024) { setError("حجم تصویر باید کمتر از ۴ مگابایت باشد."); return; }
    operationInProgress.current = true;
    setError(""); setNotice(""); setUploading(true);
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/admin/catalog/media", { method: "POST", body: data });
      const result = await response.json() as { path?: string; error?: string };
      if (!response.ok || !result.path) throw new Error(result.error || "بارگذاری تصویر انجام نشد.");
      const path = result.path;
      setForm((current) => target === "image_path" || target === "stand_image_path"
        ? { ...current, [target]: path, gallery_placement_verified: false }
        : { ...current, [target]: [...current[target], { src: path, alt: current.name || "تصویر اثر" }] });
      setNotice("تصویر بارگذاری شد. برای ثبت آن در شناسنامه، اثر را ذخیره کنید.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "بارگذاری تصویر انجام نشد."); }
    finally { operationInProgress.current = false; setUploading(false); }
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setError(""); setNotice(""); setSaving(true);
    try {
      const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, subtype_id: form.subtype_id || null, image_path: form.image_path || null, stand_image_path: form.stand_image_path || null, turntable_video_path: form.turntable_video_path || null }) });
      const body = await response.json() as { product?: CatalogRow; error?: string };
      if (!response.ok || !body.product) throw new Error(body.error || "ذخیرهٔ اثر تأیید نشد.");
      setRows((current) => [body.product!, ...current.filter((item) => item.slug !== body.product!.slug)]);
      setSelected(body.product.slug); setForm(toCatalogForm(body.product));
      setNotice(body.product.status === "published" ? "اثر منتشر شد و در کاتالوگ عمومی قرار گرفت." : "تغییرات اثر ذخیره شد.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ذخیرهٔ اثر تأیید نشد."); }
    finally { operationInProgress.current = false; setSaving(false); }
  };
  const busy = saving || uploading;
  const mediaEditor = (key: "gallery" | "packaging_gallery", title: string) => <fieldset className="rounded-lg border border-silver p-4">
    <legend className="px-2 text-sm text-graphite">{title}</legend>
    {form[key].map((item: Media, index) => <div key={`${key}-${index}`} className="mb-3 grid gap-2 rounded-md bg-ivory-muted p-3 md:grid-cols-[1fr_1fr_auto]">
      <label className={labelClass}>مسیر تصویر<input className={fieldClass} dir="ltr" value={item.src} onChange={(event) => updateMedia(key, index, "src", event.target.value)} placeholder="مسیر کامل فایل تصویر" /></label>
      <label className={labelClass}>توضیح تصویر<input className={fieldClass} value={item.alt} onChange={(event) => updateMedia(key, index, "alt", event.target.value)} /></label>
      <button type="button" onClick={() => removeMedia(key, index)} className="self-end px-3 py-2 text-sm text-sapphire">حذف</button>
    </div>)}
    <button type="button" onClick={() => update(key, [...form[key], { src: "", alt: "" }])} className="text-sm text-sapphire underline underline-offset-4">افزودن تصویر</button>
    <label className="mr-4 inline-block cursor-pointer text-sm text-sapphire underline underline-offset-4">بارگذاری تصویر<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0], key); event.target.value = ""; }} /></label>
  </fieldset>;
  return <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
    <aside className="rounded-xl border border-silver bg-ivory-muted p-4" aria-label="فهرست آثار مدیر">
      <button type="button" disabled={busy} onClick={() => select("")} className="mb-4 w-full rounded-md border border-sapphire px-3 py-2 text-sm text-sapphire disabled:opacity-50">اثر تازه</button>
      {loading ? <p role="status">در حال خواندن کاتالوگ…</p> : rows.length === 0 ? <p className="text-sm">هنوز اثری ثبت نشده است.</p> : <ul className="space-y-2">{rows.map((row) => <li key={row.slug}><button type="button" disabled={busy} onClick={() => select(row.slug)} aria-current={selected === row.slug ? "true" : undefined} className="w-full rounded-md border border-silver bg-ivory p-3 text-right text-sm hover:border-sapphire/50 aria-current:border-sapphire disabled:opacity-50"><strong className="block font-medium">{row.name}</strong><span className="mt-1 block text-xs text-graphite/65">{row.status === "published" ? "منتشرشده" : row.status === "archived" ? "بایگانی" : "در بازبینی"} · نسخهٔ {new Intl.NumberFormat("fa-IR").format(row.revision)}</span></button></li>)}</ul>}
      {!loading && unlinkedPhotos.length > 0 && <details className="mt-6 border-t border-silver pt-4">
        <summary className="cursor-pointer text-sm text-graphite">عکس‌های نهاییِ بدون شناسنامه · {new Intl.NumberFormat("fa-IR").format(unlinkedPhotos.length)}</summary>
        <p className="mt-2 text-xs leading-6 text-graphite/70">برای هر طرح پیش‌نویس بسازید؛ نماهای دیگر همان طرح را به گالری همان شناسنامه اضافه کنید. عنوان و مشخصات را از روی اثر تأیید کنید.</p>
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {unlinkedPhotos.map((photo) => <li key={photo.number}><button type="button" disabled={busy} onClick={() => {
            if (operationInProgress.current || !canLeaveForm()) return;
            const draft = draftCatalogFormFromPhoto(photo);
            if (!draft) return;
            setSelected(""); setForm(draft); setNotice(""); setError("");
          }} className="flex w-full items-center gap-3 rounded-md border border-silver bg-ivory p-2 text-right text-xs text-graphite hover:border-sapphire/50 disabled:opacity-50">
            <Image src={photo.src} alt="" width={40} height={48} className="h-12 w-10 shrink-0 object-contain" />
            <span>شمارهٔ {new Intl.NumberFormat("fa-IR").format(Number(photo.number))} · {photo.title}{photo.status === "duplicate" ? " · نمای تکراری" : ""}</span>
          </button></li>)}
        </ul>
      </details>}
    </aside>
    <form onSubmit={save} aria-busy={busy} className="space-y-5 rounded-xl border border-silver bg-ivory p-5 md:p-7">
      <fieldset disabled={busy} className="min-w-0 space-y-5 border-0 p-0">
      <h2 className="text-xl text-graphite">{selected ? "ویرایش اثر" : "ثبت اثر تازه"}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>نام اثر<input required maxLength={120} className={fieldClass} value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label className={labelClass}>شناسهٔ پایدار انگلیسی<input required disabled={form.revision > 0} pattern="[a-z0-9][a-z0-9-]{1,118}[a-z0-9]" className={fieldClass} dir="ltr" value={form.slug} onChange={(event) => update("slug", event.target.value)} /></label>
        <label className={labelClass}>دسته<select className={fieldClass} value={form.category_id} onChange={(event) => { const found = catalogCategories.find((item) => item.id === event.target.value); if (found) setForm((current) => ({ ...current, category_id: found.id, category_label: found.label, subtype_id: null })); }}>{catalogCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className={labelClass}>زیرگروه<select className={fieldClass} value={form.subtype_id ?? ""} onChange={(event) => update("subtype_id", event.target.value || null)}><option value="">بدون زیرگروه</option>{category?.types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label className={labelClass}>توضیح تأییدشده<textarea required rows={3} maxLength={2000} className={fieldClass} value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={labelClass}>تصویر اصلی<input className={fieldClass} dir="ltr" value={form.image_path ?? ""} onChange={(event) => update("image_path", event.target.value || null)} placeholder="مسیر کامل فایل تصویر" /></label><label className="mt-2 inline-block cursor-pointer text-sm text-sapphire underline underline-offset-4">بارگذاری تصویر اصلی<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0], "image_path"); event.target.value = ""; }} /></label></div>
        <div><label className={labelClass}>تصویر اثر روی استند<input className={fieldClass} dir="ltr" value={form.stand_image_path ?? ""} onChange={(event) => { update("stand_image_path", event.target.value || null); update("gallery_placement_verified", false); }} placeholder="مسیر کامل فایل تصویر" /></label><label className="mt-2 inline-block cursor-pointer text-sm text-sapphire underline underline-offset-4">بارگذاری تصویر استند<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || saving} className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0], "stand_image_path"); event.target.value = ""; }} /></label></div>
      </div>
      {form.stand_image_path?.startsWith("/images/ornova/") && <div className="relative h-56 w-48 overflow-hidden rounded-md border border-silver bg-ivory-muted"><Image src={form.stand_image_path} alt="پیش‌نمایش اثر روی استند" fill sizes="192px" className="object-contain" unoptimized /></div>}
      {galleryRenders.some((sample) => sample.categoryId === form.category_id) && <fieldset className="rounded-lg border border-silver p-4">
        <legend className="px-2 text-sm text-graphite">پیوند به عکس نهایی ویترین</legend>
        <p className="mb-3 text-xs leading-6 text-graphite/70">عکس تأییدشدهٔ همین اثر را انتخاب کنید تا شناسنامهٔ آن از روی استند گالری باز شود. عکس‌های اصلی گالری تغییر نمی‌کنند.</p>
        <label className={labelClass}>عکس نهایی
          <select className={fieldClass} value="" onChange={(event) => {
            const sample = galleryRenders.find((item) => item.src === event.target.value && item.categoryId === form.category_id);
            if (sample && !form.gallery.some((item) => item.src === sample.src) && form.gallery.length < 12) {
              update("gallery", [...form.gallery, { src: sample.src, alt: `${form.name || sample.title} روی استند گالری` }]);
            }
          }}>
            <option value="">انتخاب عکس از همین دسته</option>
            {galleryRenders.filter((sample) => sample.categoryId === form.category_id && !form.gallery.some((item) => item.src === sample.src)).map((sample) => <option key={sample.number} value={sample.src}>شمارهٔ {new Intl.NumberFormat("fa-IR").format(Number(sample.number))} · {sample.title}{sample.status === "duplicate" ? " · نمای تکراری" : ""}</option>)}
          </select>
        </label>
        {galleryRenders.filter((sample) => form.gallery.some((item) => item.src === sample.src) && sample.categoryId === form.category_id).map((sample) => <div key={sample.number} className="mt-3 flex items-center gap-3 rounded-md bg-ivory-muted p-2 text-xs"><Image src={sample.src} alt={sample.title} width={44} height={60} className="h-14 w-11 object-contain" /><span>عکس شمارهٔ {new Intl.NumberFormat("fa-IR").format(Number(sample.number))} به شناسنامه پیوند دارد.</span></div>)}
      </fieldset>}
      {mediaEditor("gallery", "تصاویر شناسنامه")}
      {mediaEditor("packaging_gallery", "تصاویر بسته‌بندی")}
      <fieldset className="rounded-lg border border-silver p-4"><legend className="px-2 text-sm">مشخصات اثر</legend>{form.details.map((item, index) => <div key={index} className="mb-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]"><input className={fieldClass} aria-label={`عنوان مشخصهٔ ${index + 1}`} value={item.label} onChange={(event) => updateDetail(index, "label", event.target.value)} /><input className={fieldClass} aria-label={`مقدار مشخصهٔ ${index + 1}`} value={item.value} onChange={(event) => updateDetail(index, "value", event.target.value)} /><button type="button" onClick={() => update("details", form.details.filter((_, position) => position !== index))} className="text-sm text-sapphire">حذف</button></div>)}<button type="button" onClick={() => update("details", [...form.details, { label: "", value: "" }])} className="text-sm text-sapphire underline underline-offset-4">افزودن مشخصه</button></fieldset>
      <label className={labelClass}>ویدیوی چرخش، در صورت آماده‌بودن<input className={fieldClass} dir="ltr" value={form.turntable_video_path ?? ""} onChange={(event) => update("turntable_video_path", event.target.value || null)} placeholder="مسیر کامل فایل ویدیو" /></label>
      <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox" checked={form.gallery_placement_verified} onChange={(event) => update("gallery_placement_verified", event.target.checked)} className="mt-2" />جای‌گذاری اثر روی استند و نسبت تصویر بررسی شده است.</label>
      <label className={labelClass}>وضعیت<select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value as CatalogProductInput["status"])}><option value="review">در بازبینی</option><option value="published">انتشار عمومی</option><option value="archived">بایگانی</option></select></label>
      </fieldset>
      <p className="text-xs leading-6 text-graphite/65">فایل‌های PNG، JPEG و WebP تا ۴ مگابایت پذیرفته می‌شوند. تصویر استند را پس از بارگذاری بازبینی و جای‌گذاری را جداگانه تأیید کنید.</p>
      {uploading && <p role="status" className="text-sm text-graphite">در حال بارگذاری تصویر…</p>}
      {error && <p role="alert" className="text-sm text-sapphire">{error}</p>}{notice && <p role="status" className="text-sm text-graphite">{notice}</p>}
      <button type="submit" disabled={saving || loading || uploading} className="rounded-md bg-sapphire px-5 py-3 text-sm text-ivory disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیرهٔ اثر"}</button>
    </form>
    {savedRow && <div className="lg:col-start-2"><RoomPlacementEditor key={`${savedRow.slug}:${savedRow.revision}`} product={savedRow} disabled={busy || !formMatchesSaved} onSaved={(row) => {
      setRows((current) => [row, ...current.filter((item) => item.slug !== row.slug)]);
      setForm(toCatalogForm(row));
      setNotice(row.room_placement ? (row.status === "published" ? "عکس تأییدشده به چرخش ویترین اضافه شد." : "جای‌گذاری ثبت شد؛ عکس پس از انتشار اثر در ویترین دیده می‌شود.") : "عکس از چرخش ویترین برداشته شد.");
    }} /></div>}
  </div>;
}
