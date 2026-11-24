import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = process.env.ORNOVA_RENDER_SOURCE_DIR ?? "D:/Temp";
const outputDir = path.join(root, "public/images/ornova/gallery/final-renders");
const manifestPath = path.join(root, "lib/constants/gallery-renders.ts");

// Final source render references from the 53-image owner-approved batch.
// 06 is a duplicate of 04. The original files remain untouched.
const entries = [
  ["01", "2ae32afd", "brooches-pins", "سنجاق‌سینهٔ طرح جام", "ready"],
  ["02", "28a58529", "pendants", "آویز دندان", "ready"],
  ["03", "5ba0f400", "earrings", "گوشوارهٔ عنکبوتی", "ready"],
  ["04", "5fd8f6b5", "rings", "انگشتر مُهر گاو", "ready", { needsCompleteView: true }],
  ["05", "3a602d9e", "rings", "انگشتر با نگین اشکی", "ready"],
  ["06", "4501ed69", "rings", "تکرار تصویر ۰۴", "duplicate", { duplicateOf: "04" }],
  ["07", "7d31d155", "brooches-pins", "سنجاق‌سینهٔ نواری مشبک", "ready"],
  ["08", "3f570c5c", "pendants", "آویز فیبوناچی با نگین ارغوانی", "ready"],
  ["09", "bdf057dd", "pendants", "آویز گل فیبوناچی مرداد", "ready"],
  ["10", "90a43642", "pendants", "آویز گل مارپیچ", "ready"],
  ["11", "100964b7", "pendants", "آویز گلبرگ باز", "ready"],
  ["12", "5afa9e2b", "pendants", "آویز گل با گلبرگ‌های حلقه‌ای", "ready"],
  ["13", "e160ec1c", "pendants", "آویز گل زنگوله‌ای", "ready"],
  ["14", "8af3284b", "jewelry-sets", "نیم‌ست صورت فلکی آذر", "ready"],
  ["15", "f1e14d13", "rings", "انگشتر با نگین تیره", "ready"],
  ["16", "10439ecf", "jewelry-sets", "نیم‌ست صورت فلکی اسفند", "ready"],
  ["17", "506cd1ef", "jewelry-sets", "نیم‌ست خورشیدی", "ready"],
  ["18", "6b9ab99a", "brooches-pins", "سنجاق‌سینهٔ مدور با نقش بادبان", "ready"],
  ["19", "cc5bc68e", "rings", "انگشتر مُهر با مینای تیره", "ready", { needsCompleteView: true }],
  ["20", "916a01d1", "bracelets", "دستبند حوت · اسفند", "ready"],
  ["21", "989df897", "earrings", "گوشوارهٔ میخی نگین‌دار", "ready"],
  ["22", "b92fbb99", "earrings", "گوشوارهٔ میخی برف‌گون", "ready"],
  ["23", "38ed1cf5", "pendants", "آویز گل فیبوناچی اسفند", "ready"],
  ["24", "6a9574f9", "pendants", "آویز گل فیبوناچی مهر", "ready"],
  ["25", "7ac39b2e", "pendants", "آویز گل فیبوناچی فروردین", "ready"],
  ["26", "fde51f49", "pendants", "آویز گل فیبوناچی خرداد", "ready"],
  ["27", "1b15f65a", "pendants", "آویز فیبوناچی با نگین بنفش", "ready"],
  ["28", "6e05b2bc", "pendants", "آویز گل فیبوناچی تیر", "ready"],
  ["29", "628823d7", "pendants", "آویز گل فیبوناچی آبان", "ready"],
  ["30", "edb2c3ff", "pendants", "آویز فیبوناچی با نگین صورتی", "ready"],
  ["31", "c6a13e54", "pendants", "آویز گل فیبوناچی اردیبهشت", "ready"],
  ["32", "85d9d26e", "earrings", "گوشوارهٔ آویز خوشه‌ای", "ready"],
  ["33", "f70baa44", "jewelry-sets", "نیم‌ست صورت فلکی فروردین", "ready"],
  ["34", "cde5f81d", "jewelry-sets", "نیم‌ست صورت فلکی سه‌شاخه", "ready"],
  ["35", "01b87d89", "jewelry-sets", "نیم‌ست صورت فلکی خرداد", "ready"],
  ["36", "b3fd7fc3", "jewelry-sets", "نیم‌ست صورت فلکی تیر", "ready"],
  ["37", "c9073c1e", "jewelry-sets", "نیم‌ست صورت فلکی لوزی", "ready"],
  ["38", "5384e9f7", "jewelry-sets", "نیم‌ست صورت فلکی شهریور", "ready"],
  ["39", "4bd216d9", "jewelry-sets", "نیم‌ست صورت فلکی با آویز زاویه‌دار", "ready"],
  ["40", "6156af94", "jewelry-sets", "نیم‌ست صورت فلکی مهر", "ready"],
  ["41", "4c746a8e", "jewelry-sets", "نیم‌ست صورت فلکی آبان", "ready"],
  ["42", "c6efa868", "jewelry-sets", "نیم‌ست صورت فلکی بهمن", "ready"],
  ["43", "e33d7f40", "bracelets", "دستبند حَمَل · فروردین", "ready"],
  ["44", "b2a154ae", "bracelets", "دستبند سرطان · تیر", "ready"],
  ["45", "feb7a8a0", "bracelets", "دستبند ثور · اردیبهشت", "ready"],
  ["46", "c304e541", "bracelets", "دستبند جوزا · خرداد", "ready"],
  ["47", "a3aed3a8", "bracelets", "دستبند سنبله · شهریور", "ready"],
  ["48", "13dee177", "bracelets", "دستبند دلو · بهمن", "ready"],
  ["49", "03fc240a", "bracelets", "دستبند اسد · مرداد", "ready"],
  ["50", "040f8e31", "bracelets", "دستبند قوس · آذر", "ready"],
  ["51", "21fbc57f", "bracelets", "دستبند عقرب · آبان", "ready"],
  ["52", "98576685", "bracelets", "دستبند میزان · مهر", "ready"],
  ["53", "9c6e04f5", "bracelets", "دستبند جدی · دی", "ready"],
];

await fs.mkdir(outputDir, { recursive: true });
const manifest = [];

for (const [number, sourcePrefix, categoryId, title, status, review = {}] of entries) {
  const sourceName = (await fs.readdir(sourceDir)).find((name) => name.toLowerCase().startsWith(`codex-clipboard-${sourcePrefix}`));
  if (!sourceName) throw new Error(`Missing source image ${sourcePrefix} in ${sourceDir}`);
  const source = path.join(sourceDir, sourceName);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;

  // Estimate the crop from the Afghan-blue stand. Views with incomplete
  // jewelry at the crop boundary remain marked for staff follow-up.
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
  manifest.push({ number, sourcePrefix, title, categoryId, status, ...review, src: `/images/ornova/gallery/final-renders/${filename}`, width, height });
}

const ts = `import type { CatalogCategoryId } from "./catalog";\n\nexport type GalleryRender = { number: string; sourcePrefix: string; title: string; categoryId: CatalogCategoryId | null; status: "ready" | "duplicate" | "review"; duplicateOf?: string; needsCompleteView?: boolean; src: string; width: number; height: number };\n\nexport const galleryRenders: readonly GalleryRender[] = ${JSON.stringify(manifest, null, 2)};\n\nexport const visibleGalleryRenders = galleryRenders.filter((render) => render.status === "ready" && render.categoryId && !render.needsCompleteView);\n`;
await fs.writeFile(manifestPath, ts, "utf8");
const visibleCount = manifest.filter((item) => item.status === "ready" && item.categoryId && !item.needsCompleteView).length;
console.log(`Prepared ${manifest.length} cropped renders in ${outputDir}; ${visibleCount} visible, ${manifest.length - visibleCount} held for review.`);
