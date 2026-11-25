export type TrayCrop = { x: number; y: number; width: number; height: number };

const maxPixels = 24_000_000;

export function visibleTrayCrop(image: HTMLImageElement): TrayCrop | null {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height || width * height > maxPixels) throw new Error("اندازهٔ تصویر برای تنظیم کادر مناسب نیست.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("تنظیم کادر در این مرورگر ممکن نیست.");

  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  canvas.width = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0, alpha = 3; y < height; y++) {
    for (let x = 0; x < width; x++, alpha += 4) {
      if (data[alpha] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = y;
    }
  }

  if (right < 0) return null;
  // Retain a transparent border even around an otherwise fully opaque rectangle.
  const crop = { x: left - 1, y: top - 1, width: right - left + 3, height: bottom - top + 3 };
  if (crop.width >= width && crop.height >= height && left === width - right - 1 && top === height - bottom - 1) return null;
  if (crop.width * crop.height > maxPixels) throw new Error("اندازهٔ کادرِ تنظیم‌شده بیش از حد مجاز است.");
  return crop;
}

export function drawTrayImage(canvas: HTMLCanvasElement, image: HTMLImageElement, turns: number, crop?: TrayCrop) {
  const { x, y, width, height } = crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  if (!width || !height || width * height > maxPixels) throw new Error("اندازهٔ تصویر برای آماده‌سازی مناسب نیست.");

  const swapAxes = turns % 2 === 1;
  canvas.width = swapAxes ? height : width;
  canvas.height = swapAxes ? width : height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("آماده‌سازی عکس در این مرورگر ممکن نیست.");

  context.imageSmoothingEnabled = false;
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(turns * Math.PI / 2);
  context.drawImage(image, -x - width / 2, -y - height / 2);
}

export async function prepareTrayImage(image: HTMLImageElement, turns: number, crop?: TrayCrop): Promise<File> {
  const canvas = document.createElement("canvas");
  drawTrayImage(canvas, image, turns, crop);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("نسخهٔ تنظیم‌شدهٔ تصویر آماده نشد.");
  return new File([blob], "adjusted-tray.png", { type: "image/png" });
}
