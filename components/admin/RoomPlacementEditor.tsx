"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { CatalogProductInput } from "@/lib/catalog/product-input";
import { roomPlacementSchema, type RoomPlacement } from "@/lib/catalog/room-placement";
import { galleryRoomStands } from "@/lib/constants/gallery-room";
import { GalleryStandSurface } from "@/components/ornova/GalleryStandSurface";
import { isWithheldGalleryPhoto } from "@/lib/catalog/gallery-product-link";

type CatalogRow = CatalogProductInput & { room_placement?: RoomPlacement | null };
type Props = { product: CatalogRow; disabled: boolean; onSaved: (product: CatalogRow) => void };
const number = new Intl.NumberFormat("fa-IR");
const fieldClass = "w-full rounded-md border border-silver bg-ivory px-3 py-2 text-sm text-graphite outline-none focus-visible:border-sapphire focus-visible:ring-2 focus-visible:ring-sapphire/30";

export function RoomPlacementEditor({ product, disabled, onSaved }: Props) {
  const [draft, setDraft] = useState<RoomPlacement | null>(product.room_placement ?? null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stand = galleryRoomStands.find((item) => item.categoryId === product.category_id);
  const withheld = isWithheldGalleryPhoto(product.stand_image_path);

  async function prepare() {
    if (!product.stand_image_path) { setError("ابتدا تصویر اثر روی استند را ذخیره کنید."); return; }
    setError(""); setBusy(true);
    try {
      const image = new window.Image();
      image.src = product.stand_image_path;
      await image.decode();
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width < 100 || height < 100 || width > 6000 || height > 6000) throw new Error("اندازهٔ تصویر برای جای‌گذاری معتبر نیست.");
      setDraft({ src: product.stand_image_path, image: [width, height], bounds: [0, 0, width, height] });
      setConfirmed(false);
    } catch { setError("خواندن تصویر انجام نشد. مسیر فایل و دسترسی آن را بررسی کنید."); }
    finally { setBusy(false); }
  }

  function updateBound(index: number, value: number) {
    setDraft((current) => {
      if (!current) return current;
      const bounds = [...current.bounds] as RoomPlacement["bounds"];
      bounds[index] = value;
      return { ...current, bounds };
    });
    setConfirmed(false);
  }

  async function save(placement: RoomPlacement | null) {
    if (disabled || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/catalog/placement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: product.slug, revision: product.revision, placement }) });
      const body = await response.json() as { product?: CatalogRow; error?: string };
      if (!response.ok || !body.product) throw new Error(body.error || "جای‌گذاری ذخیره نشد.");
      onSaved(body.product);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "جای‌گذاری ذخیره نشد."); }
    finally { setBusy(false); }
  }

  const valid = draft && roomPlacementSchema.safeParse(draft).success && draft.src === product.stand_image_path;
  const [iw, ih] = draft?.image ?? [1, 1];
  const [x, y, width, height] = draft?.bounds ?? [0, 0, 1, 1];
  return <section className="rounded-xl border border-silver bg-ivory p-5 md:p-7" aria-label="جای‌گذاری عکس تازه در ویترین گالری">
    <h2 className="text-xl text-graphite">جای‌گذاری عکس در ویترین</h2>
    <p className="mt-2 text-sm leading-7 text-graphite/70">این بخش برای عکس کامل اثر روی استند آبیِ همین دسته است. چهار عدد زیر باید محدودهٔ خود استند در عکس اصلی را مشخص کنند؛ تصویر اصلی تغییر نمی‌کند.</p>
    {withheld ? <>
      <p className="mt-3 text-sm text-sapphire">عکس قبلی از ویترین کنار گذاشته شده است. ابتدا برش تازهٔ اثر را در کاتالوگ ذخیره کنید.</p>
      {product.room_placement && <button type="button" disabled={busy || disabled} onClick={() => { void save(null); }} className="mt-4 rounded-md border border-silver px-4 py-2 text-sm text-graphite disabled:opacity-50">برداشتن از چرخش</button>}
      {error && <p role="alert" className="mt-3 text-sm text-sapphire">{error}</p>}
    </> : !stand ? <p className="mt-4 text-sm">برای این دسته هنوز استند اختصاصی سالن آماده نیست.</p> : <>
      {disabled && <p className="mt-3 text-sm text-sapphire">ابتدا تغییرات اصلی اثر را ذخیره کنید.</p>}
      {!product.gallery_placement_verified && <p className="mt-3 text-sm text-sapphire">بررسی جای‌گذاری تصویر در فرم اثر را تأیید و ذخیره کنید.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy || disabled || !product.stand_image_path} onClick={() => { void prepare(); }} className="rounded-md border border-sapphire px-4 py-2 text-sm text-sapphire disabled:opacity-50">خواندن اندازهٔ عکس استند</button>
        {product.room_placement && <button type="button" disabled={busy || disabled} onClick={() => { void save(null); }} className="rounded-md border border-silver px-4 py-2 text-sm text-graphite disabled:opacity-50">برداشتن از چرخش</button>}
      </div>
      {draft && <>
        <p className="mt-4 text-xs text-graphite/70">اندازهٔ تصویر: {number.format(iw)} × {number.format(ih)} پیکسل</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{(["فاصله از چپ", "فاصله از بالا", "عرض استند", "ارتفاع استند"] as const).map((label, index) => <label key={label} className="text-xs leading-7 text-graphite">{label}<input type="number" min={0} max={6000} step={1} className={fieldClass} value={draft.bounds[index]} onChange={(event) => updateBound(index, Number(event.target.value))} /></label>)}</div>
        <div className="mt-4 flex flex-wrap items-start gap-6">
          <figure><div className="relative max-w-full border border-silver bg-ivory-muted" style={{ width: 280, aspectRatio: `${iw} / ${ih}` }}><Image src={draft.src} alt="عکس اصلی برای تعیین محدودهٔ استند" width={iw} height={ih} unoptimized className="h-full w-full" /><span className="pointer-events-none absolute border-2 border-sapphire" style={{ left: `${x / iw * 100}%`, top: `${y / ih * 100}%`, width: `${width / iw * 100}%`, height: `${height / ih * 100}%` }} /></div><figcaption className="mt-2 text-xs text-graphite/70">محدودهٔ انتخاب‌شده روی عکس اصلی</figcaption></figure>
          <figure><div className="relative overflow-hidden border border-silver bg-ivory-muted" style={{ width: 240, aspectRatio: `${stand.bounds[2]} / ${stand.bounds[3]}` }}>
            <Image src={`/images/ornova/gallery/stands/${stand.asset}`} alt="" width={stand.image[0]} height={stand.image[1]} unoptimized style={{ position: "absolute", maxWidth: "none", width: `${stand.image[0] / stand.bounds[2] * 100}%`, height: `${stand.image[1] / stand.bounds[3] * 100}%`, left: `${-stand.bounds[0] / stand.bounds[2] * 100}%`, top: `${-stand.bounds[1] / stand.bounds[3] * 100}%` } as CSSProperties} />
            <GalleryStandSurface stand={stand} sample={{ number: `catalog:${product.slug}`, title: product.name, categoryId: stand.categoryId, src: draft.src, image: draft.image, bounds: draft.bounds, productSlug: product.slug }} />
          </div><figcaption className="mt-2 text-xs text-graphite/70">پیش‌نمایش روی استند سالن</figcaption></figure>
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm leading-7"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-2" />محدوده و ظاهر عکس روی استند سالن را بررسی و تأیید کردم.</label>
        <button type="button" disabled={busy || disabled || !product.gallery_placement_verified || !confirmed || !valid} onClick={() => { if (valid) void save(draft); }} className="mt-4 rounded-md bg-sapphire px-5 py-3 text-sm text-ivory disabled:opacity-50">ثبت در چرخش گالری</button>
      </>}
      {error && <p role="alert" className="mt-3 text-sm text-sapphire">{error}</p>}
    </>}
  </section>;
}
