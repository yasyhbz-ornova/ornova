"use client";

import { useEffect, useRef, useState } from "react";

export function PrintDocumentButton() {
  const mounted = useRef(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function print() {
    if (!mounted.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      await document.fonts.ready;
      if (mounted.current) window.print();
    } catch { if (mounted.current) setError(true); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <div className="grid gap-2"><button type="button" disabled={busy} onClick={print} className="min-h-11 rounded-full border border-silver px-5 py-2 text-sm text-sapphire focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sapphire disabled:opacity-60">{busy ? "آماده‌سازی چاپ…" : "چاپ / ذخیرهٔ پی‌دی‌اف"}</button>{error && <p role="alert" className="text-xs leading-6 text-graphite">چاپ باز نشد؛ از گزینهٔ چاپ مرورگر استفاده کنید.</p>}</div>;
}
