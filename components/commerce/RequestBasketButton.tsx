"use client";

import { useEffect, useState } from "react";
import { getRequestItemKey, LEGACY_REQUEST_BASKET_STORAGE_KEY, parseRequestBasketReview, readRequestBasketSnapshot, REQUEST_BASKET_STORAGE_KEY, updateRequestItemNote as updateBasketItemNote, type RequestItem } from "@/lib/commerce/request-basket";
import { productConfigurationKey, type ProductPreferences } from "@/lib/commerce/product-preferences";
import { applyProductConfiguration } from "@/lib/commerce/request-configurations";

export type { RequestItem } from "@/lib/commerce/request-basket";

const STORAGE_KEY = REQUEST_BASKET_STORAGE_KEY;

const MAX_REQUEST_QUANTITY = 20;

export function readItems(): RequestItem[] {
  return readItemsForWrite() ?? [];
}

function readItemsForWrite(): RequestItem[] | null {
  try {
    const review = parseRequestBasketReview(readRequestBasketSnapshot(window.localStorage));
    return review.valid ? review.items : null;
  } catch {
    return null;
  }
}

function writeItems(items: RequestItem[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("ornova-basket-updated"));
    return true;
  } catch {
    return false;
  }
}

export function addRequestItem(item: Omit<RequestItem, "quantity">, { keepExistingQuantity = false }: { keepExistingQuantity?: boolean } = {}) {
  const items = readItemsForWrite();
  if (!items) return false;
  const existing = items.find((entry) => productConfigurationKey(entry.slug, entry.preferences) === productConfigurationKey(item.slug, item.preferences));
  if (existing) {
    if (keepExistingQuantity) return true;
    return writeItems(items.map((entry) => getRequestItemKey(entry) === getRequestItemKey(existing) ? { ...entry, quantity: Math.min(entry.quantity + 1, MAX_REQUEST_QUANTITY) } : entry));
  }
  try {
    const result = applyProductConfiguration(items, item, item.preferences, crypto.randomUUID());
    return result.success && writeItems(result.items);
  } catch { return false; }
}

export function saveConfiguredRequestItem(item: Omit<RequestItem, "quantity" | "preferences">, preferences: ProductPreferences | undefined, targetKey?: string): { success: true; key: string } | { success: false; error: string } {
  try {
    const items = readItemsForWrite();
    if (!items) return { success: false, error: "سبد فعلی خوانده نشد؛ برای حفظ انتخاب‌های قبلی، چیزی جایگزین نشده است." };
    const result = applyProductConfiguration(items, item, preferences, crypto.randomUUID(), targetKey);
    if (!result.success) return result;
    if (writeItems(result.items)) return { success: true, key: result.key };
  } catch { /* Leave the current basket intact when storage or secure IDs are unavailable. */ }
  return { success: false, error: "ذخیره در این مرورگر انجام نشد؛ دسترسی به ذخیره‌سازی را بررسی کنید. درخواست ارسال نشده است." };
}

export function updateRequestItemQuantity(key: string, quantity: number) {
  if (!Number.isFinite(quantity)) return false;
  if (quantity < 1) {
    return removeRequestItem(key);
  }
  const items = readItemsForWrite();
  return items !== null && writeItems(items.map((item) => getRequestItemKey(item) === key ? { ...item, quantity: Math.min(Math.max(Math.trunc(quantity), 1), MAX_REQUEST_QUANTITY) } : item));
}

export function updateRequestItemNote(key: string, note: string) {
  const items = readItemsForWrite();
  return items !== null && writeItems(updateBasketItemNote(items, key, note));
}

export function removeRequestItem(key: string) {
  const items = readItemsForWrite();
  return items !== null && writeItems(items.filter((item) => getRequestItemKey(item) !== key));
}

export function clearRequestItems() {
  if (!writeItems([])) return false;
  try { window.localStorage.removeItem(LEGACY_REQUEST_BASKET_STORAGE_KEY); return true; } catch { return false; }
}

export function RequestBasketButton({ item, label = "افزودن به سبد درخواست", keepExistingQuantity = false, onAdded }: { item: Omit<RequestItem, "quantity">; label?: string; keepExistingQuantity?: boolean; onAdded?: () => void }) {
  const [added, setAdded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAdded(readItems().some((entry) => productConfigurationKey(entry.slug, entry.preferences) === productConfigurationKey(item.slug, item.preferences)));
      try { readRequestBasketSnapshot(window.localStorage); setStorageError(false); } catch { setStorageError(true); }
    };
    sync();
    window.addEventListener("ornova-basket-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ornova-basket-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.slug, item.preferences]);

  function addOrOpenBasket() {
    const saved = addRequestItem(item, { keepExistingQuantity });
    setAdded(saved || readItems().some((entry) => productConfigurationKey(entry.slug, entry.preferences) === productConfigurationKey(item.slug, item.preferences)));
    setStorageError(!saved);
    if (saved) onAdded?.();
  }

  const savedLabel = keepExistingQuantity ? "باز کردن صندوق" : "در سبد درخواست شما";

  return (
    <div className="grid justify-items-start gap-2">
      <button type="button" onClick={addOrOpenBasket} className="rounded-full border border-silver bg-ivory-soft px-4 py-2 text-sm text-graphite transition hover:border-sapphire">
        {added ? savedLabel : label}
      </button>
      {storageError && <p role="status" className="text-xs leading-6 text-graphite/65">ذخیره در این مرورگر در دسترس نیست؛ تنظیمات فضای ذخیره‌سازی را بررسی کنید.</p>}
    </div>
  );
}
