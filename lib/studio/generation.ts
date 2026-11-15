import "server-only";

export type StudioRecord = { id: string; user_id: string; idea: string; state: "generating" | "ready" | "failed"; storage_path: string | null; mime: string | null };
export type StudioImage = { bytes: Uint8Array; mime: string };
export type StudioStore = {
  reserve: (owner: string, requestId: string, idea: string) => Promise<{ record: StudioRecord; fresh: boolean }>;
  upload: (record: StudioRecord, image: StudioImage) => Promise<string>;
  complete: (record: StudioRecord, path: string, mime: string) => Promise<void>;
  fail: (record: StudioRecord) => Promise<void>;
};
export class StudioError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function generateForUser(
  access: { userId: string | null; allowed: boolean }, input: unknown,
  prepare: () => { store: StudioStore; generate: (idea: string) => Promise<StudioImage> },
) {
  if (!access.userId) throw new StudioError(401, "برای ساخت تصویر وارد حساب شو؛ ایده‌ات را می‌توانی برای ادامه نگه داری.");
  if (!access.allowed) throw new StudioError(403, "ساخت تصویر هنوز در مرحلهٔ آزمون محدود است؛ ایده‌ات را برای ادامه نگه دار.");
  const body = input as { requestId?: unknown; idea?: unknown; consent?: unknown; accountId?: unknown } | null;
  if (!body || body.consent !== true || typeof body.idea !== "string" || body.idea.trim().length < 3 || body.idea.length > 1500
    || typeof body.accountId !== "string" || !body.accountId
    || typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    throw new StudioError(400, "ایده، شناسهٔ درخواست یا تأیید ارسال به سرویس تصویر کامل نیست.");
  }
  // The claim never authorizes access: it binds the reviewed consent to the
  // already authenticated owner and prevents another tab's account switch.
  if (body.accountId !== access.userId) throw new StudioError(409, "حساب فعال تغییر کرده است. برای ادامهٔ امن، صفحه را دوباره باز کن.");
  const idea = body.idea.trim();
  const { store, generate } = prepare();
  const { record, fresh } = await store.reserve(access.userId, body.requestId, idea);
  if (record.user_id !== access.userId || record.idea !== idea || record.id !== body.requestId) throw new StudioError(409, "این شناسه مربوط به ایدهٔ دیگری است؛ یک درخواست تازه شروع کن.");
  const result = { id: record.id, state: "ready" as const, imageUrl: `/api/studio/generations/${record.id}/image`, galleryUrl: "/account/gallery" };
  if (!fresh) {
    if (record.state === "ready") return result;
    throw new StudioError(409, record.state === "failed" ? "این تلاش به نتیجه نرسید. برای تلاش تازه، شناسهٔ جدید بگیر." : "این درخواست هنوز نتیجهٔ قطعی ندارد؛ گالری را بررسی کن. ساخت دوباره خودکار انجام نمی‌شود.");
  }
  try {
    const image = await generate(idea);
    const path = await store.upload(record, image);
    await store.complete(record, path, image.mime);
    return result;
  } catch {
    try { await store.fail(record); } catch { /* Preserve the original safe error; no false success. */ }
    throw new StudioError(503, "ساخت یا ذخیرهٔ تصویر تأیید نشد. ایده‌ات همین‌جا مانده؛ پیش از تلاش تازه، گالری را بررسی کن.");
  }
}
