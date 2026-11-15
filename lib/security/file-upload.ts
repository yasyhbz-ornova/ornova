export const MAX_PRIVATE_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type PrivateUploadMetadata = {
  original_name: string;
  content_type: string;
  size_bytes: number;
};

export function normalizeUploadMetadata(value: unknown): PrivateUploadMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const originalName = typeof candidate.original_name === "string" ? candidate.original_name.trim() : "";
  const contentType = candidate.content_type;
  const sizeBytes = candidate.size_bytes;

  if (
    originalName.length < 1
    || originalName.length > 240
    || typeof contentType !== "string"
    || !ALLOWED_UPLOAD_TYPES.has(contentType)
    || typeof sizeBytes !== "number"
    || !Number.isInteger(sizeBytes)
    || sizeBytes < 1
    || sizeBytes > MAX_PRIVATE_UPLOAD_BYTES
  ) {
    return null;
  }

  return { original_name: originalName, content_type: contentType, size_bytes: sizeBytes };
}

export function createInquiryStoragePath(userId: string, inquiryId: string, originalName: string, nonce: string) {
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^\.+/, "")
    .slice(-100) || "reference";

  return `${userId}/${inquiryId}/${nonce}-${safeName}`;
}

export function isInquiryStoragePath(path: string, userId: string, inquiryId: string) {
  const prefix = `${userId}/${inquiryId}/`;
  if (!path.startsWith(prefix)) return false;

  const fileName = path.slice(prefix.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/i.test(fileName);
}
