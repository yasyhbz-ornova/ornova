import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = process.env.ORNOVA_RENDER_SOURCE_DIR ?? "D:/Temp";
const outputDir = path.join(root, "public/images/ornova/gallery/final-renders");
const manifestPath = path.join(root, "lib/constants/gallery-renders.ts");

// Final source render references from the 53-image owner-approved batch.
// 06 is a duplicate of 04 and 07 is an unidentified metal component, so neither
// is shown in the gallery archive. Their originals remain untouched.
const entries = [
  ["01", "2ae32afd", "brooches-pins", "سنجاق‌سینهٔ باریک", "ready"],
  ["02", "28a58529", "pendants", "آویز دندان", "ready"],
  ["03", "5ba0f400", "earrings", "گوشوارهٔ عنکبوتی", "ready"],
  ["04", "5fd8f6b5", "rings", "انگشتر مُهر گاو", "ready"],
  ["05", "3a602d9e", "rings", "انگشتر نگین‌دار", "ready"],
  ["06", "4501ed69", "rings", "تکرار تصویر ۰۴", "duplicate"],
  ["07", "7d31d155", null, "قطعهٔ فلزی؛ دسته نامشخص", "review"],
  ["08", "3f570c5c", "pendants", "آویز گل فیبوناچی", "ready"],
  ["09", "bdf057dd", "pendants", "آویز گل فیبوناچی", "ready"],
  ["10", "90a43642", "pendants", "آویز گل فیبوناچی", "ready"],
  ["11", "100964b7", "pendants", "آویز گل فیبوناچی", "ready"],
  ["12", "5afa9e2b", "pendants", "آویز گل فیبوناچی", "ready"],
  ["13", "e160ec1c", "jewelry-sets", "نیم‌ست صورت فلکی؛ مثلث و خوشه", "ready"],
  ["14", "8af3284b", "rings", "انگشتر نگین‌دار", "ready"],
  ["15", "f1e14d13", "rings", "انگشتر با نگین تیره", "ready"],
  ["16", "10439ecf", "jewelry-sets", "نیم‌ست صورت فلکی", "ready"],
  ["17", "506cd1ef", "jewelry-sets", "نیم‌ست خورشیدی", "ready"],
  ["18", "6b9ab99a", null, "نشان مدور؛ نوع زیور نامشخص", "review"],
  ["19", "cc5bc68e", "rings", "انگشتر مُهر با مینای تیره", "ready"],
  ["20", "916a01d1", "bracelets", "دستبند زودیاک حوت", "ready"],
  ["21", "989df897", "earrings", "گوشوارهٔ میخی نگین‌دار", "ready"],
  ["22", "b92fbb99", "earrings", "گوشوارهٔ میخی برف‌گون", "ready"],
  ["23", "38ed1cf5", "pendants", "آویز گل فیبوناچی", "ready"],
  ["24", "6a9574f9", "pendants", "آویز گل فیبوناچی", "ready"],
  ["25", "7ac39b2e", "pendants", "آویز گل فیبوناچی", "ready"],
  ["26", "fde51f49", "pendants", "آویز گل فیبوناچی", "ready"],
  ["27", "1b15f65a", "pendants", "آویز گل فیبوناچی", "ready"],
  ["28", "6e05b2bc", "pendants", "آویز گل فیبوناچی", "ready"],
  ["29", "628823d7", "pendants", "آویز گل فیبوناچی", "ready"],
  ["30", "edb2c3ff", "pendants", "آویز گل فیبوناچی", "ready"],
  ["31", "c6a13e54", "pendants", "آویز گل فیبوناچی", "ready"],
  ["32", "85d9d26e", "pendants", "آویز گل فیبوناچی", "ready"],
  ["33", "f70baa44", "pendants", "آویز گل فیبوناچی", "ready"],
  ["34", "cde5f81d", "pendants", "آویز گل فیبوناچی", "ready"],
  ["35", "01b87d89", "pendants", "آویز گل فیبوناچی", "ready"],
  ["36", "b3fd7fc3", "pendants", "آویز گل فیبوناچی", "ready"],
  ["37", "c9073c1e", "pendants", "آویز گل فیبوناچی", "ready"],
  ["38", "5384e9f7", "pendants", "آویز گل فیبوناچی", "ready"],
  ["39", "4bd216d9", "pendants", "آویز گل فیبوناچی", "ready"],
  ["40", "6156af94", "earrings", "گوشوارهٔ آویز بلند", "ready"],
  ["41", "4c746a8e", "jewelry-sets", "نیم‌ست صورت فلکی", "ready"],
  ["42", "c6efa868", "jewelry-sets", "نیم‌ست صورت فلکی", "ready"],
  ["43", "e33d7f40", "bracelets", "دستبند زودیاک", "ready"],
  ["44", "b2a154ae", "bracelets", "دستبند زودیاک", "ready"],
  ["45", "feb7a8a0", "bracelets", "دستبند زودیاک ثور؛ اردیبهشت", "ready"],
  ["46", "c304e541", "bracelets", "دستبند زودیاک", "ready"],
  ["47", "a3aed3a8", "bracelets", "دستبند زودیاک", "ready"],
  ["48", "13dee177", "bracelets", "دستبند زودیاک", "ready"],
  ["49", "03fc240a", "bracelets", "دستبند زودیاک", "ready"],
  ["50", "040f8e31", "bracelets", "دستبند زودیاک", "ready"],
  ["51", "21fbc57f", "bracelets", "دستبند زودیاک", "ready"],
  ["52", "98576685", "bracelets", "دستبند زودیاک", "ready"],
  ["53", "9c6e04f5", "bracelets", "دستبند زودیاک", "ready"],
];

await fs.mkdir(outputDir, { recursive: true });
const manifest = [];

for (const [number, sourcePrefix, categoryId, title, status] of entries) {
  const sourceName = (await fs.readdir(sourceDir)).find((name) => name.toLowerCase().startsWith(`codex-clipboard-${sourcePrefix}`));
  if (!sourceName) throw new Error(`Missing source image ${sourcePrefix} in ${sourceDir}`);
  const source = path.join(sourceDir, sourceName);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;

  // Detect the Afghan-blue display stand. The jewelry and original render pixels
  // are preserved; only empty studio margins are cropped away.
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      if (b > r * 1.28 && b > g * 1.16 && b > 45) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) throw new Error(`Could not locate blue stand in ${sourceName}`);
  const padX = Math.round(info.width * 0.045);
  const padY = Math.round(info.height * 0.06);
  left = Math.max(0, left - padX); top = Math.max(0, top - padY);
  right = Math.min(info.width - 1, right + padX); bottom = Math.min(info.height - 1, bottom + padY);
  const width = right - left + 1, height = bottom - top + 1;
  const filename = `${number}-${sourcePrefix}.webp`;
  await sharp(source).extract({ left, top, width, height }).webp({ quality: 96, effort: 6, smartSubsample: false }).toFile(path.join(outputDir, filename));
  manifest.push({ number, sourcePrefix, title, categoryId, status, src: `/images/ornova/gallery/final-renders/${filename}`, width, height });
}

const ts = `import type { CatalogCategoryId } from "./catalog";\n\nexport type GalleryRender = { number: string; sourcePrefix: string; title: string; categoryId: CatalogCategoryId | null; status: "ready" | "duplicate" | "review"; src: string; width: number; height: number };\n\nexport const galleryRenders: readonly GalleryRender[] = ${JSON.stringify(manifest, null, 2)};\n\nexport const visibleGalleryRenders = galleryRenders.filter((render) => render.status === "ready" && render.categoryId);\n`;
await fs.writeFile(manifestPath, ts, "utf8");
console.log(`Prepared ${manifest.length} cropped renders in ${outputDir}; ${manifest.filter((item) => item.status === "ready").length} visible, ${manifest.filter((item) => item.status !== "ready").length} held for review.`);
