import { NextResponse } from "next/server";

export async function readQuoteBody(request: Request): Promise<{ value: unknown; status?: never } | { status: 400 | 413; value?: never }> {
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 };
  let size = 0, body = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); return { status: 413 }; }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { value: JSON.parse(body) };
  } catch { return { status: 400 }; }
  finally { reader.releaseLock(); }
}
export function quoteError(status: number) {
  return NextResponse.json({ error: status === 503 ? "دریافت یا ثبت پیشنهاد فعلاً ممکن نیست؛ تنظیمات و اتصال باید بررسی شوند." : status === 409 ? "این نسخه با اطلاعات قبلی یا وضعیت پرونده سازگار نیست؛ سند را دوباره بررسی کنید." : status === 413 ? "حجم اطلاعات پیشنهاد بیش از حد مجاز است." : "درخواست پیشنهاد قیمت معتبر یا در دسترس نیست." }, { status, headers: { "Cache-Control": "no-store" } });
}
export function quoteRpcStatus(error: { message?: string }): number {
  const message = error.message ?? "";
  if (/QUOTE_(CONFLICT|CLOSED|ACCEPTED|EXPIRED)/.test(message)) return 409;
  if (message.includes("QUOTE_NOT_FOUND")) return 404;
  if (message.includes("QUOTE_FORBIDDEN")) return 403;
  if (message.includes("QUOTE_INVALID")) return 400;
  return 503;
}
