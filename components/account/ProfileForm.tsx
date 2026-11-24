"use client";

import { type ChangeEvent, type FormEvent, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveProfile, type ProfileActionState } from "@/app/account/actions";
import { normalizeIranianPhone } from "@/lib/auth/inputs";

const initialState: ProfileActionState = { status: "idle", message: "" };

export function ProfileForm({ displayName, phone, designNote, province, city, postalCode, addressLine, requireAddress = false, galleryMode = false, onReturnToGallery, onSaved }: { displayName: string; phone: string; designNote: string; province: string; city: string; postalCode: string; addressLine: string; requireAddress?: boolean; galleryMode?: boolean; onReturnToGallery?: () => void; onSaved?: (profile: NonNullable<ProfileActionState["profile"]>) => void }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [fields, setFields] = useState({ displayName, phone, designNote, province, city, postalCode, addressLine });
  const [leaf, setLeaf] = useState<"identity" | "delivery">("identity");
  const [identityError, setIdentityError] = useState("");
  const baseHeading = useRef<HTMLHeadingElement>(null);
  const deliveryHeading = useRef<HTMLHeadingElement>(null);
  const identityLeaf = galleryMode && leaf === "identity";
  function field(name: keyof typeof fields) {
    return { name, value: fields[name], onChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const value = event.currentTarget.value;
      setFields((current) => ({ ...current, [name]: value }));
    } };
  }
  const fieldFocus = galleryMode ? " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire" : "";

  useEffect(() => {
    if (state.status === "success" && state.profile) onSaved?.(state.profile);
  }, [onSaved, state.profile, state.status]);

  useEffect(() => {
    if (state.status !== "success" || !requireAddress || !onReturnToGallery) return;
    const returnTimer = window.setTimeout(onReturnToGallery, 1200);
    return () => window.clearTimeout(returnTimer);
  }, [onReturnToGallery, requireAddress, state.status]);

  function nextLeaf(event: FormEvent<HTMLFormElement>) {
    if (!identityLeaf) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("displayName") ?? "").trim();
    const phone = normalizeIranianPhone(String(data.get("phone") ?? ""));
    if (requireAddress && (!name || !phone)) { setIdentityError("نام و شمارهٔ تماس را وارد کن."); return; }
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) { setIdentityError("شمارهٔ تماس را با پیش‌شمارهٔ درست وارد کن."); return; }
    setIdentityError("");
    setLeaf("delivery");
    requestAnimationFrame(() => deliveryHeading.current?.focus());
  }

  return (
    <form action={formAction} onSubmit={nextLeaf} data-gallery-account-form={galleryMode ? "true" : undefined} className="grid gap-5 sm:grid-cols-2">
      {requireAddress && <input type="hidden" name="requireAddress" value="true" />}
      <div className={!galleryMode || identityLeaf ? "contents" : "hidden"}>
      {galleryMode && <h3 className="sm:col-span-2" ref={baseHeading} tabIndex={-1}>۱. اطلاعات پایه</h3>}
      <label className="grid gap-2 text-sm text-graphite">
        <span>{galleryMode ? "نام" : "نامی که با آن صدایتان کنیم"}</span>
        <input {...field("displayName")} maxLength={80} autoComplete="name" required={requireAddress && identityLeaf} className={`border-b border-silver bg-transparent px-1 py-3 outline-none focus:border-sapphire${fieldFocus}`} />
      </label>
      <label className="grid gap-2 text-sm text-graphite">
        <span>{galleryMode ? "شمارهٔ تماس" : "شماره تماس برای هماهنگی درخواست‌ها"}</span>
        <input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel" required={requireAddress && (!galleryMode || identityLeaf)} dir="ltr" className={`border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire${fieldFocus}`} placeholder="۰۹۱۲…" />
      </label>
      {identityLeaf && <div className="grid gap-2 sm:col-span-2">
        {identityError && <p role="alert" className="text-sm text-sapphire">{identityError}</p>}
        <button type="submit" className="min-h-11 w-fit px-4">ادامه به اطلاعات تکمیلی</button>
      </div>}
      </div>
      <div className={identityLeaf ? "hidden" : "contents"}>
      {galleryMode && <h3 className="sm:col-span-2" ref={deliveryHeading} tabIndex={-1}>۲. اطلاعات تکمیلی</h3>}
      <label className="grid gap-2 text-sm text-graphite sm:col-span-2">
        <span>استان</span>
        <input {...field("province")} maxLength={80} autoComplete="address-level1" required={requireAddress && !identityLeaf} className={`border-b border-silver bg-transparent px-1 py-3 outline-none focus:border-sapphire${fieldFocus}`} />
      </label>
      <label className="grid gap-2 text-sm text-graphite">
        <span>شهر</span>
        <input {...field("city")} maxLength={80} autoComplete="address-level2" required={requireAddress && !identityLeaf} className={`border-b border-silver bg-transparent px-1 py-3 outline-none focus:border-sapphire${fieldFocus}`} />
      </label>
      <label className="grid gap-2 text-sm text-graphite">
        <span>کد پستی</span>
        <input {...field("postalCode")} maxLength={20} autoComplete="postal-code" dir="ltr" className={`border-b border-silver bg-transparent px-1 py-3 text-left outline-none focus:border-sapphire${fieldFocus}`} />
      </label>
      <label className="grid gap-2 text-sm text-graphite sm:col-span-2">
        <span>نشانی کامل</span>
        <textarea {...field("addressLine")} maxLength={500} rows={3} autoComplete="street-address" required={requireAddress && !identityLeaf} className={`resize-y border-b border-silver bg-transparent px-1 py-3 leading-7 outline-none focus:border-sapphire${fieldFocus}`} />
      </label>
      {galleryMode ? <input type="hidden" name="designNote" value={designNote} /> : <label className="grid gap-2 text-sm text-graphite sm:col-span-2">
        <span>برای دفعات بعد، چه چیزی از سلیقه‌ی طراحی‌تان به خاطر بسپاریم؟</span>
        <textarea {...field("designNote")} maxLength={500} rows={3} className={`resize-y border-b border-silver bg-transparent px-1 py-3 leading-7 outline-none focus:border-sapphire${fieldFocus}`} placeholder="مثلاً فرم یا رنگی که دوست دارید؛ نوشتن خاطره‌ی شخصی لازم نیست." />
        <span className="text-xs leading-6 text-graphite/55">اختیاری است؛ می‌توانید هر زمان ویرایشش کنید یا پاکش کنید. این یادداشت در حساب خصوصی شما و هنگام بررسی درخواست‌ها و طراحی‌های شما در دسترس تیم Ornova است.</span>
      </label>}
      <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        {galleryMode && <button type="button" disabled={pending} className="min-h-11 text-sm text-sapphire underline underline-offset-4" onClick={() => { setLeaf("identity"); requestAnimationFrame(() => baseHeading.current?.focus()); }}>بازگشت به اطلاعات پایه</button>}
        <button type="submit" disabled={pending} className={`${galleryMode ? "min-h-12 border border-[#8995a0] rounded-none bg-[#385a77] px-5 py-3 text-sm text-[#f5f0e7] shadow-[inset_0_0_0_1px_rgb(255_255_255/18%)] transition-colors hover:bg-[#273e53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#385a77]" : "rounded-full bg-sapphire px-5 py-3 text-sm text-ivory"} disabled:cursor-wait disabled:opacity-60`}>
          {pending ? "در حال ذخیره…" : "ذخیره‌ی اطلاعات"}
        </button>
        <div className="grid gap-2"><p aria-live="polite" role={state.status === "error" ? "alert" : "status"} className={`text-sm leading-7 ${state.status === "error" ? "text-graphite/70" : "text-sapphire"}`}>
          {state.status === "success" && requireAddress && onReturnToGallery ? `${state.message} در حال بازگشت به صندوق گالری…` : state.message || (galleryMode ? "" : "این اطلاعات فقط برای هماهنگی با شما استفاده می‌شود.")}
        </p>{state.status === "success" && (onReturnToGallery ? <button type="button" onClick={onReturnToGallery} className="w-fit text-sm text-sapphire underline underline-offset-4">بازگشت به صندوق گالری ←</button> : requireAddress && <Link href="/?galleryPanel=basket" className="w-fit text-sm text-sapphire underline underline-offset-4">بازگشت به صندوق گالری ←</Link>)}</div>
      </div>
      </div>
    </form>
  );
}
