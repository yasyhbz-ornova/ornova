"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { galleryRenders, type GalleryRender } from "@/lib/constants/gallery-renders";
import { galleryTrayCutout } from "@/lib/constants/gallery-tray-cutouts";
import { catalogCategories, resolveCatalogSelection } from "@/lib/constants/catalog";
import type { CatalogProductInput } from "@/lib/catalog/product-input";
import { toCatalogForm } from "@/lib/catalog/editor-form";
import { dossierFields, incompleteDossierFields, isDossierField, readDossierField, updateDossierField } from "@/lib/catalog/dossier-fields";
import { appendCatalogPhotoView, draftCatalogFormFromPhoto, reviewCatalogPhotos } from "@/lib/catalog/photo-draft";
import type { RoomPlacement } from "@/lib/catalog/room-placement";
import { GalleryTrayBackdrop, GalleryTrayDossier } from "@/components/ornova/GalleryTray";
import trayStyles from "@/components/ornova/GalleryShowcaseConcept.module.css";
import { RoomPlacementEditor } from "./RoomPlacementEditor";

type CatalogRow = CatalogProductInput & { room_placement?: RoomPlacement | null; created_at?: string; updated_at?: string };
type Media = CatalogProductInput["gallery"][number];
type Detail = CatalogProductInput["details"][number];
const blank = (): CatalogProductInput => ({ slug: "", revision: 0, name: "", category_id: "rings", category_label: "انگشتر", subtype_id: null, description: "", image_path: null, stand_image_path: null, gallery: [], details: [], packaging_gallery: [], turntable_video_path: null, image_fit: "contain", gallery_placement_verified: false, status: "review" });
const fieldClass = "w-full rounded-md border border-silver bg-ivory px-3 py-2 text-sm text-graphite outline-none focus-visible:border-sapphire focus-visible:ring-2 focus-visible:ring-sapphire/30";
const labelClass = "block text-sm leading-7 text-graphite";
const number = new Intl.NumberFormat("fa-IR");

function hasVisibleCutout(image: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return false;

  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = false;
    let visible = false;
    for (let index = 3; index < pixels.length; index += 4) {
      transparent ||= pixels[index] === 0;
      visible ||= pixels[index] > 0;
      if (transparent && visible) return true;
    }
  } catch { /* An unreadable preview still needs a replacement image. */ }
  return false;
}

export function CatalogEditor() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [form, setForm] = useState<CatalogProductInput>(blank);
  const [selected, setSelected] = useState("");
  const [photoCategory, setPhotoCategory] = useState("");
  const [onlyIncompleteDossiers, setOnlyIncompleteDossiers] = useState(false);
  const [trayPreview, setTrayPreview] = useState<{ path: string; transparent: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogReadReady, setCatalogReadReady] = useState(false);
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
      if (!controller.signal.aborted) { setRows(result.products ?? []); setCatalogReadReady(true); }
    }).catch(() => { if (!controller.signal.aborted) setError("فهرست آثار بارگذاری نشد. برای ویرایش، صفحه را دوباره باز کنید."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const category = resolveCatalogSelection(form.category_id, form.subtype_id).category;
  const savedRow = rows.find((item) => item.slug === selected);
  const dossierGaps = useMemo(() => new Map(rows.map((row) => [row.slug, incompleteDossierFields(row.details).length])), [rows]);
  const incompleteRows = rows.filter((row) => row.status !== "archived" && (dossierGaps.get(row.slug) ?? 0) > 0);
  const visibleRows = onlyIncompleteDossiers ? incompleteRows : rows;
  const formGaps = incompleteDossierFields(form.details);
  const trayPath = form.stand_image_path?.startsWith("/images/ornova/") ? form.stand_image_path : null;
  const trayReady = trayPath && trayPath === trayPreview?.path ? trayPreview.transparent : null;
  const previewName = form.name.trim() || "نام اثر";
  const missingLabels = dossierFields.filter(({ id }) => formGaps.includes(id)).map(({ label }) => label).join("، ");
  const photoReview = useMemo(() => reviewCatalogPhotos(galleryRenders, rows), [rows]);
  const formPhotoPaths = new Set([form.image_path, form.stand_image_path, ...form.gallery.map(({ src }) => src)]);
  const unlinkedPhotos = photoReview.available.filter(({ src }) => !formPhotoPaths.has(src));
  const filteredPhotos = unlinkedPhotos.filter((photo) => !photoCategory || photo.categoryId === photoCategory);
  const sharedPhotos = photoReview.assigned.filter(({ owners }) => owners.length > 1);
  const ownPhotos = photoReview.assigned.filter(({ owners }) => owners.length === 1 && owners[0].slug === selected).map(({ photo }) => photo);
  const selectablePhotos = [...photoReview.available, ...ownPhotos];
  const availableViews = selectablePhotos.filter((photo) =>
    photo.categoryId === form.category_id && !form.gallery.some(({ src }) => src === photo.src),
  );
  const linkedPhotos = galleryRenders.filter((photo) => photo.categoryId === form.category_id && form.gallery.some(({ src }) => src === photo.src));
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
  const appendView = (photo: GalleryRender) => {
    if (operationInProgress.current || !availableViews.some(({ src }) => src === photo.src)) return;
    const next = appendCatalogPhotoView(form, photo);
    if (!next) return;
    setForm(next);
    setError("");
    setNotice("عکس به فرم اثر اضافه شد؛ برای ثبت پیوند، تغییرات را ذخیره کنید.");
  };
  const selectTrayPhoto = (photo: GalleryRender) => {
    const cutout = galleryTrayCutout(photo);
    if (operationInProgress.current || !cutout || !linkedPhotos.includes(photo) || !selectablePhotos.includes(photo)) return;
    setForm((current) => ({ ...current, stand_image_path: cutout.src, gallery_placement_verified: false }));
    setError("");
    setNotice("برش آمادهٔ اثر در فرم قرار گرفت. پیش‌نمایش را بررسی و جای‌گذاری را تأیید کنید.");
  };
  const uploadImage = async (file: File | undefined, target: "image_path" | "stand_image_path" | "gallery" | "packaging_gallery") => {
    if (!file || operationInProgress.current) return;
    if (file.size > 4 * 1024 * 1024) { setError("حجم تصویر باید کمتر از ۴ مگابایت باشد."); return; }
    operationInProgress.current = true;
    setError(""); setNotice(""); setUploading(true);
    try {
      const data = new FormData(); data.set("file", file);
      if (target === "stand_image_path") data.set("purpose", "tray");
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
    if (form.status !== "archived" && form.gallery_placement_verified && trayReady !== true) {
      setError("پیش از ذخیرهٔ جای‌گذاری، یک برش شفاف و خوانا برای سینی انتخاب کنید.");
      return;
    }
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
      {rows.length > 0 && <label className="mb-3 flex items-start gap-2 text-xs leading-6 text-graphite">
        <input type="checkbox" className="mt-1" checked={onlyIncompleteDossiers} onChange={(event) => setOnlyIncompleteDossiers(event.target.checked)} />
        فقط شناسنامه‌های در انتظار تکمیل ({number.format(incompleteRows.length)})
      </label>}
      {loading ? <p role="status">در حال خواندن کاتالوگ…</p> : visibleRows.length === 0
        ? <p className="text-sm">{onlyIncompleteDossiers ? "شناسنامه‌ای در انتظار تکمیل نیست." : "هنوز اثری ثبت نشده است."}</p>
        : <ul className="space-y-2">{visibleRows.map((row) => {
          const gaps = dossierGaps.get(row.slug) ?? 0;
          return <li key={row.slug}>
            <button type="button" disabled={busy} onClick={() => select(row.slug)} aria-current={selected === row.slug ? "true" : undefined} className="w-full rounded-md border border-silver bg-ivory p-3 text-right text-sm hover:border-sapphire/50 aria-current:border-sapphire disabled:opacity-50">
              <strong className="block font-medium">{row.name}</strong>
              <span className="mt-1 block text-xs text-graphite/65">{row.status === "published" ? "منتشرشده" : row.status === "archived" ? "بایگانی" : "در بازبینی"} · نسخهٔ {number.format(row.revision)}</span>
              {gaps > 0 && row.status !== "archived" && <span className="mt-1 block text-xs text-sapphire">{number.format(gaps)} فیلد شناسنامه در انتظار تکمیل</span>}
            </button>
          </li>;
        })}</ul>}
      {catalogReadReady && <details className="mt-6 border-t border-silver pt-4">
        <summary className="cursor-pointer text-sm text-graphite">بازبینی عکس‌ها · {new Intl.NumberFormat("fa-IR").format(unlinkedPhotos.length)} در صف</summary>
        <p className="mt-2 text-xs leading-6 text-graphite/70">اگر دو عکس از یک طرح هستند، برای نمای دوم «افزودن به اثر باز» را بزنید. فقط برای طرحی جدا پیش‌نویس تازه بسازید.</p>
        <p className="text-xs leading-6 text-graphite/70">{new Intl.NumberFormat("fa-IR").format(photoReview.assigned.length)} عکس پیوندِ ذخیره‌شده دارد؛ {new Intl.NumberFormat("fa-IR").format(photoReview.excluded.length)} عکس تکراری یا نیازمند بازبینی در صف نیست.</p>
        {sharedPhotos.length > 0 && <div className="my-3 rounded-md border border-silver bg-ivory p-2 text-xs leading-6" role="status">
          <p>این عکس‌ها به بیش از یک اثر وصل شده‌اند:</p>
          <ul>{sharedPhotos.map(({ photo, owners }) => <li key={photo.number}>{photo.title} · {owners.map(({ name }) => name).join("، ")}</li>)}</ul>
        </div>}
        <label className={`${labelClass} mt-3`}>دستهٔ عکس‌ها
          <select className={fieldClass} value={photoCategory} onChange={(event) => setPhotoCategory(event.target.value)}>
            <option value="">همهٔ دسته‌ها</option>
            {catalogCategories.filter(({ id }) => galleryRenders.some(({ categoryId }) => categoryId === id)).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {filteredPhotos.length ? <ul className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto">
          {filteredPhotos.map((photo) => <li key={photo.number} className="rounded-md border border-silver bg-ivory px-2 py-3">
            <a href={photo.src} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-graphite" aria-label={`دیدن عکس شمارهٔ ${photo.number}، ${photo.title}`}>
              <Image src={photo.src} alt="" width={40} height={48} className="h-12 w-10 shrink-0 object-contain" />
              <span>{new Intl.NumberFormat("fa-IR").format(Number(photo.number))} · {photo.title}</span>
            </a>
            {photo.needsCompleteView && <p className="mt-1 text-xs leading-6 text-graphite/75">نمای کامل برای سینی لازم است.</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-sapphire">
              <button type="button" disabled={busy} onClick={() => {
                if (operationInProgress.current || !canLeaveForm()) return;
                const draft = draftCatalogFormFromPhoto(photo);
                if (!draft) return;
                setSelected(""); setForm(draft); setNotice(""); setError("");
              }} className="min-h-8 underline underline-offset-4 disabled:opacity-50">پیش‌نویس تازه</button>
              {form.slug && photo.categoryId === form.category_id && <button type="button" disabled={busy || form.gallery.length >= 12} onClick={() => appendView(photo)} className="min-h-8 underline underline-offset-4 disabled:opacity-50">افزودن به اثر باز</button>}
            </div>
          </li>)}
        </ul> : <p className="mt-3 text-xs leading-6 text-graphite/70">در این دسته عکسی برای پیوند باقی نمانده است.</p>}
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
        <div>
          <label className={labelClass}>تصویر اثر روی سینی<input className={fieldClass} dir="ltr" value={form.stand_image_path ?? ""} onChange={(event) => { update("stand_image_path", event.target.value || null); update("gallery_placement_verified", false); }} placeholder="مسیر کامل فایل تصویر" /></label>
          <label className="mt-2 inline-block cursor-pointer text-sm text-sapphire underline underline-offset-4">بارگذاری برش سینی<input type="file" accept="image/png,image/webp" disabled={uploading || saving} className="sr-only" onChange={(event) => { void uploadImage(event.target.files?.[0], "stand_image_path"); event.target.value = ""; }} /></label>
        </div>
      </div>
      {form.stand_image_path && <p id="tray-file-review" role="status" className="text-xs leading-6 text-graphite/75">
        {!trayPath || trayReady === false ? "این تصویر برای سینی آماده نیست. یک برش شفاف PNG یا WebP انتخاب کنید." : trayReady ? "شفافیت تصویر بررسی شد. کامل‌بودن قطعه و جای آن را در پیش‌نمایش بررسی کنید." : "در حال بررسی پیش‌نمایش برش سینی…"}
      </p>}
      {!form.stand_image_path && linkedPhotos.some((photo) => photo.needsCompleteView) && <p className="text-sm leading-7 text-sapphire">بخشی از قطعه در عکس مرجع بریده است. برای سینی، برش شفافِ یک نمای کامل را انتخاب کنید.</p>}
      {catalogReadReady && galleryRenders.some((sample) => sample.categoryId === form.category_id) && <fieldset className="rounded-lg border border-silver p-4">
        <legend className="px-2 text-sm text-graphite">پیوند به عکس نهایی ویترین</legend>
        <p className="mb-3 text-xs leading-6 text-graphite/70">عکس اصلیِ همین اثر را به شناسنامه پیوند دهید. اگر برش آماده دارد، می‌توانید همان برش را برای نمایش روی سینی انتخاب کنید.</p>
        <label className={labelClass}>عکس نهایی
          <select className={fieldClass} value="" disabled={!form.slug.trim() || form.gallery.length >= 12} onChange={(event) => {
            const sample = availableViews.find((item) => item.src === event.target.value);
            if (sample) appendView(sample);
          }}>
            <option value="">انتخاب عکس از همین دسته</option>
            {availableViews.map((sample) => <option key={sample.number} value={sample.src}>شمارهٔ {new Intl.NumberFormat("fa-IR").format(Number(sample.number))} · {sample.title}</option>)}
          </select>
        </label>
        {linkedPhotos.map((photo) => {
          const cutout = galleryTrayCutout(photo);
          const canUse = cutout && cutout.src !== form.stand_image_path && selectablePhotos.includes(photo);
          return <div key={photo.number} className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-ivory-muted p-2 text-xs">
            <Image src={photo.src} alt={photo.title} width={44} height={60} className="h-14 w-11 object-contain" />
            <span>عکس شمارهٔ {new Intl.NumberFormat("fa-IR").format(Number(photo.number))} به شناسنامه پیوند دارد.</span>
            {canUse && <button type="button" disabled={busy} onClick={() => selectTrayPhoto(photo)} className="min-h-9 text-sapphire underline underline-offset-4 disabled:opacity-50">استفاده روی سینی</button>}
          </div>;
        })}
      </fieldset>}
      {mediaEditor("gallery", "تصاویر شناسنامه")}
      {mediaEditor("packaging_gallery", "تصاویر بسته‌بندی")}
      <fieldset className="rounded-lg border border-silver p-4">
        <legend className="px-2 text-sm">شناسنامهٔ روی میز</legend>
        <p className="mb-3 text-sm leading-7 text-graphite/75">مقدارهای تأییدشده را وارد کنید و وزن و ابعاد را همراه واحد بنویسید.</p>
        {form.slug && <p className="mb-3 rounded-md bg-ivory-muted px-3 py-2 text-xs leading-6 text-sapphire" role="status">
          {formGaps.length ? `برای تکمیل شناسنامه، ${missingLabels} را بررسی کنید.` : "همهٔ فیلدهای لازم برای این شناسنامه پر شده‌اند."}
        </p>}
        <div className="grid gap-3 md:grid-cols-2">
          {dossierFields.map((field) => <label className={labelClass} key={field.id}>
            {field.label}
            <input
              name={`dossier-${field.id}`}
              className={fieldClass}
              maxLength={240}
              placeholder={field.placeholder}
              value={readDossierField(form.details, field.id)}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, details: updateDossierField(current.details, field.id, value) }));
              }}
            />
          </label>)}
        </div>
        {(form.name.trim() || form.stand_image_path) && <>
          <figure className={trayStyles.staffTrayPreview} aria-label="پیش‌نمایش سینی در گالری">
            <GalleryTrayBackdrop portrait />
            <div className={trayStyles.tableComposition}>
              <div className={trayStyles.tableDisplay}>
                {trayPath && <div className={trayStyles.tableProduct}>
                  <div className={trayStyles.catalogCutout} data-table-product={form.slug}>
                    <Image
                      key={trayPath}
                      src={trayPath}
                      alt="پیش‌نمایش تصویر اثر روی سینی"
                      fill
                      sizes="(max-width: 700px) 124px, 190px"
                      loading="eager"
                      unoptimized
                      style={{ visibility: trayReady ? "visible" : "hidden" }}
                      onLoad={(event) => setTrayPreview({ path: trayPath, transparent: /\.(png|webp)$/.test(trayPath) && hasVisibleCutout(event.currentTarget) })}
                      onError={() => setTrayPreview({ path: trayPath, transparent: false })}
                    />
                  </div>
                </div>}
              </div>
              <div className={trayStyles.tablePaper}>
                <GalleryTrayDossier name={previewName} details={form.details} heading="h2" />
              </div>
            </div>
          </figure>
          <details className={trayStyles.staffDossierText}>
            <summary>متن شناسنامه</summary>
            <GalleryTrayDossier name={previewName} details={form.details} heading="h2" />
          </details>
        </>}
        <details className="mt-4 border-t border-silver pt-3">
          <summary className="cursor-pointer text-sm text-graphite">سایر مشخصات کاتالوگ</summary>
          {form.details.map((item, index) => (!isDossierField(item.label) || !item.value.trim()) && <div key={index} className="my-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
            <input className={fieldClass} aria-label={`عنوان مشخصهٔ ${index + 1}`} value={item.label} onChange={(event) => updateDetail(index, "label", event.target.value)} />
            <input className={fieldClass} aria-label={`مقدار مشخصهٔ ${index + 1}`} value={item.value} onChange={(event) => updateDetail(index, "value", event.target.value)} />
            <button type="button" onClick={() => update("details", form.details.filter((_, position) => position !== index))} className="text-sm text-sapphire">حذف</button>
          </div>)}
          <button type="button" disabled={form.details.length >= 20} onClick={() => update("details", [...form.details, { label: "", value: "" }])} className="mt-2 text-sm text-sapphire underline underline-offset-4 disabled:opacity-50">افزودن مشخصه</button>
        </details>
      </fieldset>
      <label className={labelClass}>ویدیوی چرخش، در صورت آماده‌بودن<input className={fieldClass} dir="ltr" value={form.turntable_video_path ?? ""} onChange={(event) => update("turntable_video_path", event.target.value || null)} placeholder="مسیر کامل فایل ویدیو" /></label>
      <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox" checked={form.gallery_placement_verified} disabled={busy || (!form.gallery_placement_verified && trayReady !== true)} aria-describedby={form.stand_image_path ? "tray-file-review" : undefined} onChange={(event) => update("gallery_placement_verified", event.target.checked)} className="mt-2" />جای‌گذاری اثر روی سینی و نسبت تصویر بررسی شده است.</label>
      <label className={labelClass}>وضعیت<select className={fieldClass} value={form.status} onChange={(event) => update("status", event.target.value as CatalogProductInput["status"])}><option value="review">در بازبینی</option><option value="published">انتشار عمومی</option><option value="archived">بایگانی</option></select></label>
      </fieldset>
      <p className="text-xs leading-6 text-graphite/65">فایل‌های PNG، JPEG و WebP تا ۴ مگابایت پذیرفته می‌شوند. برای نمایش مستقیم اثر روی سینی، برش شفاف PNG یا WebP را انتخاب و جای‌گذاری را بازبینی کنید.</p>
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
