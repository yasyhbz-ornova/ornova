import sharp from "sharp";

export const catalogImageMaxBytes = 4 * 1024 * 1024;
export const trayImageError = "تصویر سینی باید برش شفافِ ثابت با فرمت PNG یا WebP باشد.";

export async function isTransparentTrayImage(file: Blob): Promise<boolean> {
  if (!file.size || file.size > catalogImageMaxBytes) return false;

  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 24_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if ((metadata.format !== "png" && metadata.format !== "webp") || !metadata.hasAlpha || (metadata.pages ?? 1) > 1) return false;

    const alpha = (await image.stats()).channels.at(-1);
    return alpha !== undefined && alpha.min === 0 && alpha.max > 0;
  } catch {
    return false;
  }
}
