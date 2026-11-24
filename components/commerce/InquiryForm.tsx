"use client";

import Link from "next/link";
import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { buildInquiryMessage, getRequestItemKey, getRequestItemReviewNote, mergeRequestDraftItems, parseRequestBasketReview, readRequestBasketSnapshot, REQUEST_BASKET_STORAGE_KEY, type RequestItem } from "@/lib/commerce/request-basket";
import { getInquiryItems, removeSubmittedRequestItems } from "@/lib/commerce/request-selection";
import { buildCustomDesignBrief } from "@/lib/commerce/custom-design-brief";
import { type InquiryReceipt } from "@/lib/commerce/inquiry-receipt";
import { canClearSubmittedRing, canReplacePendingUpload, classifyInquirySubmission, hasUncertainInquiryDraft } from "@/lib/commerce/inquiry-submission";
import { consumeCrossTabDraft, readSessionDraft, removeSessionDraft, saveSessionDraft, shareSessionDraftWithNextTab } from "@/lib/commerce/session-draft";
import { parseRingDesignDraft } from "@/lib/commerce/ring-design";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getInquiryContactDefaults } from "@/lib/account/inquiry-contact";
import { uploadInquiryReferenceFile } from "@/lib/commerce/upload-inquiry-file";
import { GalleryOrderReceipt } from "./GalleryOrderReceipt";
import { ProductPreferencesSummary } from "./ProductPreferencesSummary";

const DRAFT_KEY = "ornova-inquiry-draft";
const BASKET_KEY = REQUEST_BASKET_STORAGE_KEY;
const RING_DRAFT_KEY = "ornova-ring-draft";
const PENDING_UPLOAD_KEY = "ornova-pending-upload-inquiry";
const countFormat = new Intl.NumberFormat("fa-IR");
type SelectedItem = RequestItem;
type RingDesign = { base: string; shape: string; color: string; ornament: string; ringSizeEu?: string };
type InquirySourceContext = "custom-design" | "ring-builder";
type ProductIntent = "price" | "question";
type LocalDraft = { name?: string; contact?: string; message?: string; designPreserve?: string; designAvoid?: string; savedAt?: string; items?: SelectedItem[]; ringDesign?: RingDesign | null; fileNeedsReselection?: boolean; sourceContext?: InquirySourceContext; submissionUncertain?: boolean };
type SubmissionState = "idle" | "saving" | "registered" | "local" | "uncertain";
const FILE_UNCONFIRMED = "تأیید پیوست فایل دریافت نشد؛ ممکن است فایل رسیده باشد. ابتدا پرونده را در حساب بررسی کنید و فقط در صورت نبودن فایل، دوباره آن را پیوست کنید.";

function getBasketSnapshot() {
  try { return readRequestBasketSnapshot(window.localStorage); } catch { return "null"; }
}

function getRingDraftSnapshot() {
  try { return window.localStorage.getItem(RING_DRAFT_KEY); } catch { return null; }
}

function getLocalDraftSnapshot(draftKey: string) {
  try {
    const transferId = new URLSearchParams(window.location.search).get("draftTransfer");
    if (transferId && /^[0-9a-f-]{36}$/i.test(transferId)) {
      const transferredDraft = consumeCrossTabDraft(
        window.sessionStorage,
        window.localStorage,
        `ornova-inquiry-handoff:${transferId}`,
        draftKey,
      );
      if (transferredDraft) return transferredDraft;
    }
    return readSessionDraft(window.sessionStorage, window.localStorage, draftKey);
  } catch { return null; }
}

function getPendingUploadSnapshot() {
  try { return window.localStorage.getItem(PENDING_UPLOAD_KEY); } catch { return null; }
}

function saveLocalValue(key: string, value: string) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

function removeLocalValue(key: string) {
  try { window.localStorage.removeItem(key); return true; } catch { return false; }
}

function removeSubmittedBasketItems(items: RequestItem[]) {
  if (items.length === 0) return true;
  const current = parseRequestBasketReview(getBasketSnapshot());
  if (!current.valid) return false;
  const currentItems = current.items;
  if (!currentItems.some((item) => items.some((submitted) => submitted.slug === item.slug))) return true;
  const remainingItems = removeSubmittedRequestItems(currentItems, items);
  if (!saveLocalValue(BASKET_KEY, JSON.stringify(remainingItems))) return false;
  notifyLocalUpdate("ornova-basket-updated");
  return true;
}

function withBasketCleanupWarning(current: string | null) {
  return [
    current,
    "درخواست ثبت شد، اما پاک‌سازی انتخاب‌های ارسال‌شده در مرورگر انجام نشد؛ سبد را مرور کنید.",
  ].filter(Boolean).join(" ");
}

function saveInquiryDraft(draftKey: string, value: string) {
  try { return saveSessionDraft(window.sessionStorage, draftKey, value); } catch { return false; }
}

function removeInquiryDraft(draftKey: string) {
  try { removeSessionDraft(window.sessionStorage, window.localStorage, draftKey); } catch { /* storage may be unavailable */ }
}

function prepareLoginHandoff(event: ReactMouseEvent<HTMLAnchorElement>, loginNextPath: string, draftKey: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!window.crypto?.randomUUID) return;

  const handoffId = window.crypto.randomUUID();
  const handoffKey = `ornova-inquiry-handoff:${handoffId}`;
  const saved = shareSessionDraftWithNextTab(
    window.sessionStorage,
    window.localStorage,
    draftKey,
    handoffKey,
    Date.now() + 30 * 60 * 1000,
  );
  if (!saved) return;

  const next = new URL(loginNextPath, window.location.origin);
  next.searchParams.set("draftTransfer", handoffId);
  const login = new URL("/login", window.location.origin);
  login.searchParams.set("next", `${next.pathname}${next.search}${next.hash}`);
  event.preventDefault();
  window.location.assign(login.toString());
}

function notifyLocalUpdate(eventName: string) {
  window.dispatchEvent(new Event(eventName));
}

function subscribeToBasket(onChange: () => void) {
  window.addEventListener("ornova-basket-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ornova-basket-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeToRingDraft(onChange: () => void) {
  window.addEventListener("ornova-ring-draft-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ornova-ring-draft-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeToLocalDraft(onChange: () => void) {
  window.addEventListener("ornova-inquiry-draft-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ornova-inquiry-draft-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeToPendingUpload(onChange: () => void) {
  window.addEventListener("ornova-pending-upload-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ornova-pending-upload-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLocalDraft(draftKey: string): LocalDraft | null {
  try {
    const value: unknown = JSON.parse(readSessionDraft(window.sessionStorage, window.localStorage, draftKey) ?? "null");
    return value && typeof value === "object" ? value as LocalDraft : null;
  } catch {
    return null;
  }
}

function readDraftValue(snapshot: string | null): unknown {
  try { return JSON.parse(snapshot ?? "null"); } catch { return null; }
}

type InquiryFormProps = { productContext?: Omit<SelectedItem, "quantity">; productSelectionKey?: string; sourceContext?: InquirySourceContext; requestBasketContext?: boolean; intent?: ProductIntent; includeRingDraft?: boolean; loginNextPath?: string; galleryMode?: boolean; archiveOrder?: { number: string; title: string }; onOpenReceipt?: (id: string) => void };

export function InquiryForm(props: InquiryFormProps) {
  const key = JSON.stringify([props.productContext, props.productSelectionKey, props.sourceContext, props.requestBasketContext, props.intent, props.includeRingDraft, props.loginNextPath, props.galleryMode, props.archiveOrder?.number]);
  return <InquiryFormSession key={key} {...props} />;
}

function InquiryFormSession({ productContext, productSelectionKey, sourceContext, requestBasketContext = false, intent, includeRingDraft = true, loginNextPath = "/contact", galleryMode = false, archiveOrder, onOpenReceipt }: InquiryFormProps) {
  const draftKey = archiveOrder ? `${DRAFT_KEY}:archive:${archiveOrder.number}` : DRAFT_KEY;
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(false);
  const operation = useRef<symbol | null>(null);
  const submissionBlocked = useRef(false);
  const [working, setWorking] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null);
  const [registeredAt, setRegisteredAt] = useState("");
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [retryingUpload, setRetryingUpload] = useState(false);
  const [submissionNote, setSubmissionNote] = useState<string | null>(null);
  const [identityPrefilled, setIdentityPrefilled] = useState(false);
  const [referenceFileName, setReferenceFileName] = useState("");
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const [inMemoryPendingUploadId, setInMemoryPendingUploadId] = useState<string | null>(null);
  const [dismissedPendingUploadId, setDismissedPendingUploadId] = useState<string | null>(null);
  const basketSnapshot = useSyncExternalStore(subscribeToBasket, getBasketSnapshot, () => "[]");
  const ringDraftSnapshot = useSyncExternalStore(subscribeToRingDraft, getRingDraftSnapshot, () => null);
  const localDraftSnapshot = useSyncExternalStore(subscribeToLocalDraft, () => getLocalDraftSnapshot(draftKey), () => null);
  const storedPendingUploadInquiryId = useSyncExternalStore(subscribeToPendingUpload, getPendingUploadSnapshot, () => null);
  const pendingUploadInquiryId = inMemoryPendingUploadId
    ?? (storedPendingUploadInquiryId !== dismissedPendingUploadId && (!receipt || storedPendingUploadInquiryId === receipt.id) ? storedPendingUploadInquiryId : null);
  const uncertain = !receipt && submissionState !== "saving" && (submissionState === "uncertain" || hasUncertainInquiryDraft(readDraftValue(localDraftSnapshot)));
  const basketReady = useSyncExternalStore(subscribeToBasket, () => true, () => false);
  const fieldsLocked = !basketReady || working || submissionState === "registered" || uncertain;
  const fileLocked = !basketReady || working || uncertain || (submissionState === "registered" && !pendingUploadInquiryId);
  const basketReview = useMemo(() => parseRequestBasketReview(basketSnapshot), [basketSnapshot]);
  const selectedItems = basketReview.items;
  const unreadableBasket = basketReady && (requestBasketContext || Boolean(productContext)) && !basketReview.valid;
  const emptyRequestBasket = basketReady && requestBasketContext && basketReview.valid && basketReview.items.length === 0;
  const requestItems = getInquiryItems(selectedItems, productContext, requestBasketContext, productSelectionKey);
  const missingSelection = Boolean(productSelectionKey && requestItems.length === 0);
  const omittedDraftChoices = useMemo(() => {
    try { return mergeRequestDraftItems(selectedItems, (JSON.parse(localDraftSnapshot ?? "null") as LocalDraft | null)?.items).omitted; } catch { return 0; }
  }, [selectedItems, localDraftSnapshot]);
  const reviewedItems = submissionState === "registered" ? receipt?.items ?? [] : requestItems;
  const restoredSourceContext = useMemo(() => {
    try {
      const draft = JSON.parse(localDraftSnapshot ?? "null") as LocalDraft | null;
      return draft?.sourceContext === "custom-design" || draft?.sourceContext === "ring-builder" ? draft.sourceContext : undefined;
    } catch { return undefined; }
  }, [localDraftSnapshot]);
  const effectiveSourceContext = sourceContext ?? (productContext || requestBasketContext || archiveOrder ? undefined : restoredSourceContext);
  const isCustomDesign = effectiveSourceContext === "custom-design";
  const ringDesign = useMemo(() => {
    if (!includeRingDraft || isCustomDesign) return null;
    try {
      const value: unknown = JSON.parse(ringDraftSnapshot ?? "null");
      if (!value || typeof value !== "object") return null;
      return parseRingDesignDraft(value, {
        shapes: ["گرد", "بیضی", "اشکی", "مارکیز", "کابوشن", "مربع"],
        colors: [["لاجوردی", "bg-stone-lapis"], ["سفید شفاف", "bg-stone-clear"], ["مشکی اونیکس", "bg-stone-onyx"], ["زمردی", "bg-stone-emerald"], ["صورتی ملایم", "bg-stone-rose"], ["بنفش", "bg-stone-violet"], ["شامپاینی", "bg-stone-champagne"]],
        details: ["بدون جزئیات افزوده", "یک تأکید کوچک", "خط پیوسته", "جزئیات پیرامون سنگ"],
      });
    } catch { return null; }
  }, [includeRingDraft, isCustomDesign, ringDraftSnapshot]);
  const hasLocalDraft = localDraftSnapshot !== null;
  const draftNeedsReselection = useMemo(() => {
    try {
      const draft = JSON.parse(localDraftSnapshot ?? "null") as LocalDraft | null;
      return draft?.fileNeedsReselection === true;
    } catch { return false; }
  }, [localDraftSnapshot]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current = null; };
  }, []);

  useEffect(() => {
    const draft = readLocalDraft(draftKey);
    notifyLocalUpdate("ornova-inquiry-draft-updated");
    const form = formRef.current;
    if (draft && form) {
      const name = form.elements.namedItem("name") as HTMLInputElement | null;
      const contact = form.elements.namedItem("contact") as HTMLInputElement | null;
      const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
      const designPreserve = form.elements.namedItem("designPreserve") as HTMLTextAreaElement | null;
      const designAvoid = form.elements.namedItem("designAvoid") as HTMLTextAreaElement | null;
      if (name && typeof draft.name === "string") name.value = draft.name;
      if (contact && typeof draft.contact === "string") contact.value = draft.contact;
      if (message && typeof draft.message === "string") message.value = draft.message;
      if (designPreserve && typeof draft.designPreserve === "string") designPreserve.value = draft.designPreserve;
      if (designAvoid && typeof draft.designAvoid === "string") designAvoid.value = draft.designAvoid;
      const designDetails = form.querySelector<HTMLDetailsElement>("details[data-design-preferences]");
      if (designDetails && (designPreserve?.value.trim() || designAvoid?.value.trim())) designDetails.open = true;
      if (Array.isArray(draft.items)) {
        const current = parseRequestBasketReview(getBasketSnapshot());
        if (!current.valid) return;
        const currentItems = current.items;
        const restored = mergeRequestDraftItems(currentItems, draft.items);
        if (restored.items.length > currentItems.length) {
          if (saveLocalValue(BASKET_KEY, JSON.stringify(restored.items))) notifyLocalUpdate("ornova-basket-updated");
        }
      }
    }

  }, [draftKey]);

  useEffect(() => {
    let cancelled = false;

    async function prefillAccountContact() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name,phone")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;

        const defaults = getInquiryContactDefaults(profile, user);
        const form = formRef.current;
        if (!form) return;

        const name = form.elements.namedItem("name") as HTMLInputElement | null;
        const contact = form.elements.namedItem("contact") as HTMLInputElement | null;
        let didPrefill = false;

        if (name && !name.value.trim() && document.activeElement !== name && defaults.name) {
          name.value = defaults.name;
          didPrefill = true;
        }
        if (contact && !contact.value.trim() && document.activeElement !== contact && defaults.contact) {
          contact.value = defaults.contact;
          didPrefill = true;
        }
        if (didPrefill) setIdentityPrefilled(true);
      } catch {
        // Contact details remain editable when account prefill is unavailable.
      }
    }

    void prefillAccountContact();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mounted.current || operation.current || submissionBlocked.current || uncertain || pendingUploadInquiryId || hasUncertainInquiryDraft(readLocalDraft(draftKey))) return;
    const form = new FormData(event.currentTarget);
    setSubmissionNote(null);
    setUploadWarning(null);

    const rawMessage = String(form.get("message") ?? "").trim();
    const customDesignBrief = effectiveSourceContext === "custom-design"
      ? buildCustomDesignBrief(form.get("designPreserve") ?? "", form.get("designAvoid") ?? "")
      : { success: true as const, value: "" };
    if (!customDesignBrief.success) {
      setSubmissionNote(customDesignBrief.message);
      return;
    }
    const selectedFile = form.get("file");
    const referenceFile = selectedFile instanceof File && selectedFile.size > 0 ? selectedFile : null;
    if (effectiveSourceContext === "custom-design" && !rawMessage && !customDesignBrief.value && !referenceFile) {
      setSubmissionNote("برای شروع بررسی، یک توضیح کوتاه، یکی از راهنماهای طراحی یا یک فایل مرجع کافی است.");
      return;
    }

    const customerMessage = rawMessage || (intent === "price" && productContext ? `درخواست قیمت برای ${productContext.name}.` : "");
    const currentRingDesign = ringDesign;
    const sourceNote = effectiveSourceContext
      ? `مسیر درخواست: ${effectiveSourceContext === "ring-builder" ? "پیش‌طرح طراحی انگشتر" : "طراحی اختصاصی"}`
      : "";
    const designNote = currentRingDesign
      ? `پیش‌طرح مفهومی انگشتر برای بررسی:\n- پهنای رکاب: ${currentRingDesign.base}\n- فرم سنگ: ${currentRingDesign.shape}\n- رنگ سنگ: ${currentRingDesign.color}\n- جزئیات انتخابی: ${currentRingDesign.ornament}${currentRingDesign.ringSizeEu ? `\n- سایز اروپایی انگشتر: ${currentRingDesign.ringSizeEu}` : ""}`
      : "";
    const contextNotes = [sourceNote, designNote, customDesignBrief.value].filter(Boolean).join("\n\n");
    const orderMessage = requestBasketContext && !customerMessage ? "درخواست سفارش قطعات انتخاب‌شده." : customerMessage;
    const messageBase = [orderMessage, contextNotes].filter(Boolean).join("\n\n");
    const currentBasket = parseRequestBasketReview(getBasketSnapshot());
    if ((requestBasketContext || productContext) && !currentBasket.valid) {
      setSubmissionNote("سبد این مرورگر کامل خوانده نشد. پیش از ارسال، انتخاب‌ها را در سبد بررسی کنید.");
      return;
    }
    if (requestBasketContext && currentBasket.items.length === 0) {
      setSubmissionNote("سبد درخواست خالی است؛ ابتدا قطعات موردنظر را انتخاب کنید.");
      return;
    }
    const basketItems = currentBasket.items;
    const items = getInquiryItems(basketItems, productContext, requestBasketContext, productSelectionKey);
    if (productSelectionKey && items.length === 0) {
      setSubmissionNote("انتخاب مشخص‌شده دیگر در سبد نیست؛ برای ادامه، سبد را مرور کنید.");
      setSubmissionState("idle"); return;
    }
    const messageResult = buildInquiryMessage(messageBase, items);
    if (!messageResult.success) {
      setSubmissionNote(messageResult.error);
      setSubmissionState("idle");
      return;
    }
    const message = messageResult.value;
    const localDraft: LocalDraft = {
      name: String(form.get("name") ?? "").trim(),
      contact: String(form.get("contact") ?? "").trim(),
      message: customerMessage,
      ...(effectiveSourceContext === "custom-design" ? {
        designPreserve: String(form.get("designPreserve") ?? ""),
        designAvoid: String(form.get("designAvoid") ?? ""),
      } : {}),
      savedAt: new Date().toISOString(),
      items: archiveOrder ? [] : productContext ? items : basketItems,
      ringDesign: currentRingDesign,
      fileNeedsReselection: Boolean(referenceFile),
      sourceContext: effectiveSourceContext,
    };

    const job = Symbol("inquiry");
    operation.current = job;
    const owns = () => mounted.current && operation.current === job;
    setWorking(true);
    setSubmissionState("saving");
    submissionBlocked.current = true;
    // A lost reply or navigation must not silently enable another POST.
    const uncertainDraft = JSON.stringify({ ...localDraft, submissionUncertain: true });
    const markerSaved = saveInquiryDraft(draftKey, uncertainDraft);
    if (markerSaved) notifyLocalUpdate("ornova-inquiry-draft-updated");
    let outcome: ReturnType<typeof classifyInquirySubmission> = { kind: "uncertain" };
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: localDraft.name,
          message,
          contact: localDraft.contact,
          ...(archiveOrder ? { archive_photo: archiveOrder.number } : {}),
          items: items.map((item) => ({ product_slug: item.slug, quantity: item.quantity, ...(item.preferences ? { preferences: item.preferences } : {}) })),
        }),
      });

      const responseBody: unknown = await response.json().catch(() => null);
      outcome = classifyInquirySubmission(response.status, responseBody, items);
    } catch { /* A lost reply does not prove that the server rejected the request. */ }
    if (!owns()) return;
    try {
      if (outcome.kind === "uncertain") {
        setSubmissionState("uncertain");
        if (!markerSaved) setSubmissionNote("مرورگر پیش‌نویس را ذخیره نکرد؛ پیش از خروج، متن را کپی و پرونده‌های حساب را بررسی کنید.");
        return;
      }
      if (outcome.kind === "rejected") {
        const saved = saveInquiryDraft(draftKey, JSON.stringify(localDraft));
        if (saved) notifyLocalUpdate("ornova-inquiry-draft-updated");
        submissionBlocked.current = false;
        setSubmissionState("local");
        setSubmissionNote(outcome.message + (saved ? "" : " مرورگر پیش‌نویس را ذخیره نکرد؛ متن را پیش از خروج کپی کنید."));
        return;
      }
      const registeredReceipt = outcome.receipt;
      setReceipt(registeredReceipt);
      setRegisteredAt(new Date().toISOString());
      setSubmissionState("registered");
      if (referenceFile) {
        setInMemoryPendingUploadId(registeredReceipt.id);
        const saved = canReplacePendingUpload(getPendingUploadSnapshot(), registeredReceipt.id) && saveLocalValue(PENDING_UPLOAD_KEY, registeredReceipt.id);
        if (saved) notifyLocalUpdate("ornova-pending-upload-updated");
        else setUploadWarning("شناسهٔ پیوست در مرورگر ذخیره نشد؛ اگر از صفحه خارج شدید، فایل همین درخواست را از پروندهٔ حساب پیگیری کنید.");
      }
      if (!removeSubmittedBasketItems(items)) setUploadWarning(withBasketCleanupWarning);
      if (getLocalDraftSnapshot(draftKey) === uncertainDraft) removeInquiryDraft(draftKey);
      if (canClearSubmittedRing(ringDraftSnapshot, getRingDraftSnapshot(), Boolean(currentRingDesign))) {
        removeLocalValue(RING_DRAFT_KEY);
        notifyLocalUpdate("ornova-ring-draft-updated");
      }
      notifyLocalUpdate("ornova-inquiry-draft-updated");
      if (referenceFile && owns()) {
        let uploaded = false;
        try { uploaded = (await uploadInquiryReferenceFile(registeredReceipt.id, referenceFile)).success; } catch { /* Keep the known target available. */ }
        if (!owns()) return;
        if (uploaded) completeFileUpload(registeredReceipt.id);
        else setUploadWarning(current => [current, FILE_UNCONFIRMED].filter(Boolean).join(" "));
      }
    } finally {
      if (owns()) { operation.current = null; setWorking(false); }
    }
  }

  function completeFileUpload(target: string) {
    if (getPendingUploadSnapshot() === target && !removeLocalValue(PENDING_UPLOAD_KEY)) {
      setUploadWarning("فایل پیوست شد، اما یادآور مرورگر پاک نشد؛ پیش از تلاش دوباره پرونده را بررسی کنید.");
    }
    setDismissedPendingUploadId(target);
    setInMemoryPendingUploadId(null);
    notifyLocalUpdate("ornova-pending-upload-updated");
    if (referenceFileRef.current) referenceFileRef.current.value = "";
    setReferenceFileName("");
  }

  async function retryReferenceUpload() {
    if (!mounted.current || operation.current || uncertain || !pendingUploadInquiryId || !formRef.current) return;
    const target = pendingUploadInquiryId;
    const fileInput = formRef.current.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadWarning("ابتدا فایل مرجع را دوباره انتخاب کنید.");
      fileInput?.focus();
      return;
    }
    const job = Symbol("upload");
    operation.current = job;
    const owns = () => mounted.current && operation.current === job;
    setWorking(true);
    setRetryingUpload(true);
    setUploadWarning(null);
    try {
      const result = await uploadInquiryReferenceFile(target, file);
      if (!owns()) return;
      if (!result.success) {
        setUploadWarning(FILE_UNCONFIRMED);
        return;
      }
      setUploadWarning("فایل با موفقیت به همان درخواست پیوست شد.");
      completeFileUpload(target);
    } catch {
      if (owns()) setUploadWarning(FILE_UNCONFIRMED);
    } finally {
      if (owns()) { operation.current = null; setWorking(false); setRetryingUpload(false); }
    }
  }

  function acknowledgeUncertainSubmission() {
    if (operation.current) return;
    const draft = readLocalDraft(draftKey);
    if (hasUncertainInquiryDraft(draft)) {
      const saved = saveInquiryDraft(draftKey, JSON.stringify({ ...draft, submissionUncertain: false }));
      if (!saved) { setSubmissionNote("مرورگر اجازهٔ تغییر پیش‌نویس را نداد؛ متن را نگه دارید و از پروندهٔ حساب پیگیری کنید."); return; }
      notifyLocalUpdate("ornova-inquiry-draft-updated");
    }
    submissionBlocked.current = false;
    setSubmissionNote(null);
    setSubmissionState("idle");
  }

  return (
    <form ref={formRef} method="post" onSubmit={handleSubmit} aria-busy={!basketReady || working} data-gallery-inquiry={galleryMode ? "true" : undefined} className={isCustomDesign ? "min-w-0 border-t border-silver pt-7 md:border-t-0 md:border-r md:pt-0 md:pr-10" : galleryMode ? "min-w-0 border-y border-silver bg-transparent px-0 py-6" : "rounded-[30px] border border-silver bg-ivory-soft p-6 md:p-8"}>
      <noscript><p className="mb-5 text-sm leading-7 text-graphite">برای تکمیل و ارسال این فرم، جاوااسکریپت مرورگر باید فعال باشد.</p></noscript>
      {archiveOrder ? <div>
        <p className="text-sm text-sapphire">اثر انتخاب‌شده از آرشیو</p>
        <h2 className="mt-2 text-xl font-medium text-graphite">{archiveOrder.title}</h2>
        <p className="mt-2 text-sm leading-7 text-graphite/70">درخواست این اثر برای بررسی موجودی و مبلغ ثبت می‌شود.</p>
      </div> : isCustomDesign ? <div><h2 className="text-xl font-medium text-graphite">ایده‌ات را اینجا بگذار.</h2><p className="mt-2 text-sm leading-7 text-graphite/65">متن یا تصویر مرجع؛ هر کدام که برایت راحت‌تر است.</p></div> : <>
      <p className="text-sm text-sapphire">{intent === "price" ? "درخواست قیمت" : intent === "question" ? "پرسش دربارهٔ قطعه" : requestBasketContext ? "درخواست قطعات" : "ارتباط با Ornova by Yas"}</p>
      <h2 className="mt-3 text-2xl font-semibold text-graphite">{intent === "price" ? "مشخصات درخواست قیمت" : intent === "question" ? "پرسش دربارهٔ قطعه" : requestBasketContext ? "جزئیات درخواست تو" : "دربارهٔ ایده‌ات بنویس"}</h2>
      <p className="mt-3 text-sm leading-7 text-graphite/70">{intent === "price" ? "این درخواست برای بررسی قیمت قطعه ارسال می‌شود؛ مبلغ پس از بررسی جزئیات اعلام خواهد شد." : "با ورود به حساب، درخواست برای Ornova ثبت می‌شود. اگر هنوز وارد نشده‌اید، اطلاعات فقط در همین مرورگر به‌صورت پیش‌نویس می‌ماند و ارسال نمی‌شود."}</p>
      {identityPrefilled && <p className="mt-2 text-xs leading-6 text-graphite/55">اطلاعات موجود در حساب برای راحتی پیش‌پر شده؛ پیش از ارسال می‌توانید ویرایشش کنید.</p>}
      </>}
      {submissionState !== "registered" && basketReady && missingSelection && <div role="alert" className="mt-5 text-sm leading-7 text-sapphire"><p>این انتخاب دیگر در سبد نیست؛ مشخصات ردیف دیگری جای آن انتخاب نشده است.</p><Link href="/?galleryPanel=basket" className="inline-flex min-h-11 items-center underline underline-offset-4">مرور صندوق گالری</Link></div>}
      {submissionState !== "registered" && submissionState !== "saving" && unreadableBasket && <div role="alert" className="mt-5 text-sm leading-7 text-sapphire"><p>سبد این مرورگر کامل خوانده نشد؛ ارسال انتخاب‌های ناقص متوقف شده است.</p><Link href="/?galleryPanel=basket" className="inline-flex min-h-11 items-center underline underline-offset-4">بررسی صندوق گالری</Link></div>}
      {submissionState !== "registered" && submissionState !== "saving" && emptyRequestBasket && <div role="alert" className="mt-5 text-sm leading-7 text-sapphire"><p>سبد درخواست خالی است.</p><Link href="/shop" className="inline-flex min-h-11 items-center underline underline-offset-4">انتخاب از فروشگاه</Link></div>}
      {omittedDraftChoices > 0 && submissionState !== "registered" && <p role="alert" className="mt-5 text-sm leading-7 text-sapphire">بخشی از انتخاب‌های پیش‌نویس به‌دلیل ظرفیت سبد بازیابی نشد؛ سبد و پیش‌نویس را پیش از ارسال مرور کنید.</p>}
      {effectiveSourceContext === "ring-builder" && <div className="mt-6 border-r border-sapphire pr-4 text-sm leading-7 text-graphite/75"><p className="text-xs text-sapphire">مسیر این درخواست</p><p>پیش‌طرح طراحی انگشتر برای بررسی Ornova</p></div>}
      {reviewedItems.length > 0 && <div className="mt-6 border-y border-silver py-4"><p className="text-xs text-sapphire">{productContext && reviewedItems.length === 1 ? "قطعه‌ی موضوع گفت‌وگو" : "قطعات همراه درخواست"}</p><ul className="mt-3 grid gap-4">{reviewedItems.map((item) => {
        const reviewNote = getRequestItemReviewNote(item.note);
        return <li key={getRequestItemKey(item)} className="flex items-start justify-between gap-4 text-sm text-graphite"><div className="min-w-0"><p>{item.name}</p><ProductPreferencesSummary value={item.preferences} />{reviewNote && <p dir="auto" className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-graphite/60">یادداشت همراه: {reviewNote}</p>}</div><span className="shrink-0 pt-0.5 text-xs text-graphite/55">تعداد {countFormat.format(item.quantity)}</span></li>;
      })}</ul></div>}
      {ringDesign && <div className="mt-6 border-b border-silver pb-4"><p className="text-xs text-sapphire">پیش‌طرح مفهومی همراه درخواست</p><p className="mt-2 text-sm leading-7 text-graphite">رکاب {ringDesign.base} / {ringDesign.shape} / {ringDesign.color} / {ringDesign.ornament}</p>{ringDesign.ringSizeEu && <p className="mt-1 text-sm text-graphite">سایز اروپایی انگشتر: <bdi dir="ltr">{ringDesign.ringSizeEu}</bdi></p>}<p className="mt-1 text-xs leading-6 text-graphite/55">این انتخاب‌ها برای بررسی همراه درخواست می‌روند و طرح نهایی یا تضمین امکان ساخت نیستند.</p></div>}
      <div className="mt-7 grid gap-5">
        {!isCustomDesign && <>
        <label className="grid gap-2 text-sm text-graphite"><span>نام</span><input required name="name" disabled={fieldsLocked} autoComplete="name" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
        <label className="grid gap-2 text-sm text-graphite"><span>راه ارتباطی</span><input required name="contact" disabled={fieldsLocked} autoComplete="email tel" className="rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" placeholder="ایمیل یا شماره تماس" /></label>
        </>}
        <label className="grid gap-2 text-sm text-graphite"><span>{isCustomDesign ? "چه چیزی می‌خواهی طراحی شود؟ (اختیاری)" : intent === "question" ? "پرسش شما" : archiveOrder || intent === "price" || requestBasketContext ? "یادداشت تکمیلی (اختیاری)" : "ایده یا پرسش"}</span><textarea required={!archiveOrder && (intent === "question" || (!requestBasketContext && !intent && !effectiveSourceContext))} maxLength={archiveOrder ? 4800 : undefined} name="message" disabled={fieldsLocked} rows={isCustomDesign ? 4 : 5} placeholder={isCustomDesign ? "مثلاً یک انگشتر نقره با فرم نرم و سنگ آبی؛ برای استفادهٔ روزمره." : undefined} className="resize-y rounded-[16px] border border-silver bg-ivory px-4 py-3 leading-7 outline-none placeholder:text-graphite/65 focus:border-sapphire" /></label>
        <div className="grid gap-2 text-sm text-graphite"><label htmlFor="reference-file">{isCustomDesign ? "تصویر مرجع (اختیاری)" : "تصویر یا فایل مرجع (اختیاری، حداکثر ۱۰ مگابایت)"}</label><div className="flex min-h-12 items-center justify-between gap-4 rounded-[16px] border border-silver bg-ivory px-4 py-2"><input ref={referenceFileRef} id="reference-file" name="file" disabled={fileLocked} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReferenceFileName(event.target.files?.[0]?.name ?? "")} className="hidden" /><span aria-live="polite" className="min-w-0 truncate text-sm text-graphite/65"><bdi dir="auto">{referenceFileName || "فایلی انتخاب نشده"}</bdi></span><button type="button" disabled={fileLocked} onClick={() => { if (!fileLocked) referenceFileRef.current?.click(); }} className="shrink-0 border-r border-silver pr-4 text-xs text-sapphire transition-colors hover:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire">انتخاب فایل</button></div>{isCustomDesign && <p className="text-xs leading-6 text-graphite/65">تصویر یا پی‌دی‌اف، تا ۱۰ مگابایت. فایل پس از ثبت، در پروندهٔ خصوصی تو نگه‌داری می‌شود.</p>}</div>
        {isCustomDesign && <>
          <details data-design-preferences className="border-y border-silver py-4">
            <summary className="cursor-pointer text-sm text-graphite marker:text-sapphire focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire">جزئیات بیشتر (اختیاری)</summary>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-graphite"><span>چه چیزی باید در طرح حفظ شود؟</span><textarea name="designPreserve" disabled={fieldsLocked} maxLength={500} rows={2} className="resize-y rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
              <label className="grid gap-2 text-sm text-graphite"><span>چه چیزی را نمی‌خواهی؟</span><textarea name="designAvoid" disabled={fieldsLocked} maxLength={500} rows={2} className="resize-y rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
            </div>
          </details>
          <fieldset className="grid gap-4"><legend className="mb-4 text-sm font-medium text-graphite">برای پیگیری درخواست</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-graphite"><span>نام</span><input required name="name" disabled={fieldsLocked} autoComplete="name" className="min-w-0 rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none focus:border-sapphire" /></label>
              <label className="grid gap-2 text-sm text-graphite"><span>راه ارتباطی</span><input required name="contact" disabled={fieldsLocked} autoComplete="email" className="min-w-0 rounded-[16px] border border-silver bg-ivory px-4 py-3 outline-none placeholder:text-graphite/65 focus:border-sapphire" placeholder="ایمیل یا شماره تماس" /></label>
            </div>
            {identityPrefilled && <p className="text-xs leading-6 text-graphite/65">اطلاعات حسابت پیش‌پر شده و قابل ویرایش است.</p>}
          </fieldset>
        </>}
      </div>
      {isCustomDesign && <p className="mt-5 text-xs leading-6 text-graphite/65">ارسال با ورود به حساب انجام می‌شود. فایل در پیش‌نویس ذخیره نمی‌شود.</p>}
      <button type="submit" disabled={!basketReady || working || uncertain || submissionState === "registered" || Boolean(pendingUploadInquiryId) || unreadableBasket || emptyRequestBasket || Boolean(productSelectionKey && (!basketReady || missingSelection))} className="mt-7 rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-60">{submissionState === "saving" ? "در حال ارسال…" : uncertain ? "نیاز به بررسی پرونده" : submissionState === "registered" ? "درخواست ثبت شد" : pendingUploadInquiryId ? "درخواست قبلی ثبت شده" : intent === "price" ? "ارسال درخواست قیمت" : intent === "question" ? "ارسال پرسش" : "ارسال درخواست برای Ornova"}</button>
      {submissionState === "idle" && !uncertain && submissionNote && <p role="alert" className="mt-4 text-sm leading-7 text-graphite">{submissionNote}</p>}
      {uncertain && <section role="status" className="mt-5 grid gap-3 border-t border-silver pt-5 text-sm leading-7 text-graphite">
        <p className="font-medium">نتیجهٔ ثبت درخواست تأیید نشد.</p>
        <p>ممکن است درخواست ثبت شده باشد. انتخاب‌ها حفظ شده‌اند؛ ابتدا پرونده‌های حسابتان را بررسی کنید و همین درخواست را دوباره نفرستید.</p>
        {draftNeedsReselection && <p>فایل در پیش‌نویس ذخیره نمی‌شود و در این مرحله پیوست نشده است.</p>}
        {submissionNote && <p role="alert">{submissionNote}</p>}
        <Link href="/account" className="w-fit text-sapphire underline underline-offset-4">بررسی پرونده‌های من</Link>
        <p className="text-xs text-graphite/65">اگر بعد از بررسی، درخواست را پیدا نکردید، می‌توانید ارسال تازه‌ای آماده کنید. ثبت قبلی ممکن است با تأخیر دیده شود و این کار احتمال ثبت تکراری دارد.</p>
        <button type="button" disabled={working} onClick={acknowledgeUncertainSubmission} className="min-h-11 w-fit text-sapphire underline underline-offset-4 disabled:opacity-60">پرونده‌ها را بررسی کردم؛ آماده‌سازی ارسال تازه</button>
      </section>}
      {submissionState === "registered" && <section role="status" className="mt-5 border-t border-silver pt-5 text-sm leading-7 text-graphite/75">
        <p className="font-medium text-sapphire">{receipt ? "درخواست شما ثبت شد." : "درخواست به سرویس رسید."}</p>
        {receipt && galleryMode ? <GalleryOrderReceipt receipt={receipt} archiveTitle={archiveOrder?.title} archiveNumber={archiveOrder?.number} registeredAt={registeredAt} /> : receipt ? <>
          {receipt.items.length > 0
            ? <ul className="mt-3 grid gap-3" aria-label="خلاصه‌ی قطعات ثبت‌شده">{receipt.items.map((item) => <li key={getRequestItemKey(item)} className="grid gap-1"><div className="flex justify-between gap-4"><span>{item.name}</span><span className="shrink-0 text-graphite/55">تعداد {countFormat.format(item.quantity)}</span></div><ProductPreferencesSummary value={item.preferences} />{item.note && <p className="whitespace-pre-wrap text-xs leading-6 text-graphite/60">یادداشت همراه: {item.note}</p>}</li>)}</ul>
            : <p className="mt-2">توضیحات و پیش‌طرح همراه همین پرونده ثبت شده‌اند.</p>}
          <p className="mt-3 text-xs leading-6 text-graphite/55">این ثبت، درخواست برای بررسی است؛ قیمت یا سفارش قطعی محسوب نمی‌شود.</p>
        </> : <p className="mt-2">برای دیدن وضعیت، پرونده‌های حساب را بررسی کنید و برای جلوگیری از ثبت تکراری، درخواست را دوباره نفرستید.</p>}
        {receipt && onOpenReceipt && <button type="button" disabled={working} onClick={() => onOpenReceipt(receipt.id)} className="mt-3 block min-h-11 text-sm text-sapphire underline decoration-silver underline-offset-4">دیدن رسید در صندوق ←</button>}
        <Link href="/account" className="mt-3 inline-flex text-sm text-sapphire underline decoration-silver underline-offset-4">دیدن پرونده در حساب Ornova ←</Link>
      </section>}
      {pendingUploadInquiryId && <p role="status" className="mt-4 text-sm leading-7 text-graphite/70">برای این پرونده، تأیید پیوست فایل دریافت نشده است. پیش از تلاش دوباره، فایل‌های پرونده را در حساب بررسی کنید.</p>}
      {pendingUploadInquiryId && <button type="button" onClick={retryReferenceUpload} disabled={working || uncertain} className="mt-4 w-fit text-sm text-sapphire underline underline-offset-4 disabled:opacity-60">{retryingUpload ? "در حال پیوست فایل…" : "تلاش دوباره برای پیوست فایل"}</button>}
      {submissionState === "idle" && !uncertain && hasLocalDraft && <div role="status" className="mt-4 grid gap-2 text-sm leading-7 text-graphite/75"><p>یک پیش‌نویس از همین زبانه بازیابی شد؛ هنوز برای Ornova ارسال نشده است.</p><p className="text-xs text-graphite/55">با انتخاب ادامه‌ی ورود، متن پیش‌نویس برای بازگشت از لینک ایمیل، تا ۳۰ دقیقه به‌صورت موقت در مرورگر قابل بازیابی است.</p><Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} onClick={(event) => prepareLoginHandoff(event, loginNextPath, draftKey)} className="w-fit text-sapphire underline underline-offset-4">ورود و ادامه‌ی ارسال درخواست</Link></div>}
      {submissionState === "local" && !uncertain && <div role="status" className="mt-4 grid gap-3 text-sm leading-7 text-graphite/75"><p>{submissionNote}</p><p>پیش‌نویس هنوز برای Ornova ارسال نشده است. برای ارسال، وارد حساب شوید و همین فرم را دوباره ثبت کنید.</p><p className="text-xs text-graphite/55">با انتخاب ادامه‌ی ورود، متن پیش‌نویس برای بازگشت از لینک ایمیل، تا ۳۰ دقیقه به‌صورت موقت در مرورگر قابل بازیابی است.</p>{draftNeedsReselection && <p>فایل پیوست ذخیره نمی‌شود؛ پس از ورود، آن را دوباره انتخاب کنید.</p>}<Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} onClick={(event) => prepareLoginHandoff(event, loginNextPath, draftKey)} className="w-fit text-sapphire underline underline-offset-4">ورود و ادامه‌ی ارسال درخواست</Link></div>}
      {submissionState === "idle" && !uncertain && hasLocalDraft && draftNeedsReselection && <p role="status" className="mt-3 text-sm leading-7 text-graphite/70">فایل پیوست در پیش‌نویس ذخیره نشده است؛ پس از ورود، آن را دوباره انتخاب کنید.</p>}
      {uploadWarning && <p role="status" className="mt-4 text-sm leading-7 text-graphite/70">{uploadWarning}</p>}
    </form>
  );
}
