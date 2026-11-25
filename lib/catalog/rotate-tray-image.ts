export async function rotateTrayImage(image: HTMLImageElement, turns: number): Promise<File> {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height || width * height > 24_000_000) throw new Error("اندازهٔ تصویر برای چرخش مناسب نیست.");

  const canvas = document.createElement("canvas");
  const swapAxes = turns % 2 === 1;
  canvas.width = swapAxes ? height : width;
  canvas.height = swapAxes ? width : height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("چرخش عکس در این مرورگر ممکن نیست.");

  context.imageSmoothingEnabled = false;
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(turns * Math.PI / 2);
  context.drawImage(image, -width / 2, -height / 2);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("نسخهٔ چرخیدهٔ تصویر آماده نشد.");
  return new File([blob], "rotated-tray.png", { type: "image/png" });
}
