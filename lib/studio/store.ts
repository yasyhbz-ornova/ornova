import "server-only";
import { createClient } from "@supabase/supabase-js";
import { StudioError, type StudioRecord, type StudioStore } from "./generation";

export function createStudioStore(): StudioStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StudioError(503, "ذخیره‌سازی خصوصی استودیو هنوز آماده نشده است؛ ایده‌ات را نگه دار.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let uploadedPath: string | null = null;
  return {
    async reserve(owner, requestId, idea) {
      const { data, error } = await admin.rpc("reserve_studio_generation", { p_user_id: owner, p_request_id: requestId, p_idea: idea });
      if (error) {
        if (error.message === "STUDIO_QUOTA") throw new StudioError(429, "سقف پنج تلاش در ۲۴ ساعت پر شده است؛ بعداً دوباره امتحان کن.");
        if (error.message === "STUDIO_BUSY") throw new StudioError(409, "یک درخواست دیگر در حال انجام است؛ کمی بعد گالری را بررسی کن.");
        if (error.message === "STUDIO_CONFLICT") throw new StudioError(409, "این شناسه قبلاً برای ایده‌ای دیگر استفاده شده است.");
        throw new StudioError(503, "ثبت امن درخواست فعلاً ممکن نشد؛ هیچ تصویر تازه‌ای درخواست نشد.");
      }
      if (!data?.record || typeof data.fresh !== "boolean") throw new StudioError(503, "پاسخ ثبت درخواست معتبر نبود.");
      return data as { record: StudioRecord; fresh: boolean };
    },
    async upload(record, image) {
      const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[image.mime];
      if (!extension || image.bytes.byteLength > 10 * 1024 * 1024) throw new StudioError(503, "قالب تصویر معتبر نبود.");
      const path = `${record.user_id}/${record.id}.${extension}`;
      const { error } = await admin.storage.from("ornova-designs").upload(path, image.bytes, { contentType: image.mime, upsert: false });
      if (error) throw new StudioError(503, "ذخیرهٔ تصویر انجام نشد.");
      uploadedPath = path;
      return path;
    },
    async complete(record, path, mime) {
      const { data, error } = await admin.from("studio_generations").update({ state: "ready", storage_path: path, mime }).eq("id", record.id).eq("user_id", record.user_id).eq("state", "generating").select("id").single();
      if (error || !data) throw new StudioError(503, "ثبت نتیجه تأیید نشد.");
    },
    async fail(record) {
      const { data, error } = await admin.from("studio_generations").update({ state: "failed" }).eq("id", record.id).eq("user_id", record.user_id).eq("state", "generating").select("id");
      // A timed-out completion may already have committed: never remove a ready image.
      if (!error && data?.length && uploadedPath) await admin.storage.from("ornova-designs").remove([uploadedPath]);
    },
  };
}
