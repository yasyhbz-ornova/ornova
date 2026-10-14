"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ornova-request-basket";

export type RequestItem = { slug: string; name: string; category: string; quantity: number };

function readItems(): RequestItem[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeItems(items: RequestItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("ornova-basket-updated"));
}

export function addRequestItem(item: Omit<RequestItem, "quantity">) {
  const items = readItems();
  const existing = items.find((entry) => entry.slug === item.slug);
  writeItems(existing ? items.map((entry) => entry.slug === item.slug ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...items, { ...item, quantity: 1 }]);
}

export function removeRequestItem(slug: string) {
  writeItems(readItems().filter((item) => item.slug !== slug));
}

export function clearRequestItems() {
  writeItems([]);
}

export function RequestBasketButton({ item, label = "افزودن به سبد درخواست" }: { item: Omit<RequestItem, "quantity">; label?: string }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const sync = () => setAdded(readItems().some((entry) => entry.slug === item.slug));
    sync();
    window.addEventListener("ornova-basket-updated", sync);
    return () => window.removeEventListener("ornova-basket-updated", sync);
  }, [item.slug]);

  return (
    <button type="button" onClick={() => { addRequestItem(item); setAdded(true); }} className="rounded-full border border-silver bg-ivory-soft px-4 py-2 text-sm text-graphite transition hover:border-sapphire">
      {added ? "در سبد درخواست شما" : label}
    </button>
  );
}
