import { hasAllowedFileSignature } from "@/lib/security/file-signature";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function uploadInquiryReferenceFile(inquiryId: string, file: File): Promise<{ success: boolean; message?: string }> {
  if (!(await hasAllowedFileSignature(file))) {
    return { success: false, message: "محتوای فایل با قالب اعلام‌شده هم‌خوانی ندارد. یک تصویر JPEG، PNG، WebP یا PDF معتبر انتخاب کنید." };
  }

  const uploadUrlResponse = await fetch(`/api/inquiries/${inquiryId}/files/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ original_name: file.name, content_type: file.type, size_bytes: file.size }),
  });
  const uploadUrlResult = await uploadUrlResponse.json().catch(() => null) as { storage_path?: string; token?: string; error?: string } | null;
  if (!uploadUrlResponse.ok || !uploadUrlResult?.storage_path || !uploadUrlResult.token) {
    return { success: false, message: uploadUrlResult?.error ?? "آماده‌سازی بارگذاری فایل انجام نشد." };
  }

  const supabase = createSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from("ornova-private")
    .uploadToSignedUrl(uploadUrlResult.storage_path, uploadUrlResult.token, file, { contentType: file.type });
  if (uploadError) return { success: false, message: "بارگذاری فایل در فضای خصوصی انجام نشد؛ دوباره تلاش کنید." };

  const finalizeResponse = await fetch(`/api/inquiries/${inquiryId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_path: uploadUrlResult.storage_path,
      original_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
    }),
  });
  const finalizeResult = await finalizeResponse.json().catch(() => null) as { error?: string } | null;
  if (!finalizeResponse.ok) return { success: false, message: finalizeResult?.error ?? "ثبت مشخصات فایل انجام نشد." };

  return { success: true };
}
