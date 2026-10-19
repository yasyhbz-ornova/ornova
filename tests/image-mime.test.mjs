import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.env.ORNOVA_ROOT || process.cwd();
const sourceFiles = [
  "app/custom-design/page.tsx",
  "components/ornova/ArchiveHome.tsx",
  "components/ornova/RitualArchiveConcept.tsx",
  "components/ornova/TraceArchiveConcept.tsx",
  "lib/constants/products.ts",
];
const imagePairs = [
  ["lajvard-shab-01.jpg", "lajvard-shab-01.jfif"],
  ["goldan-khamoosh-01.jpg", "goldan-khamoosh-01.jfif"],
  ["goldan-khamoosh-02.jpg", "goldan-khamoosh-02.jfif"],
];

test("Ornova page sources use optimizer-compatible JPEG paths", () => {
  for (const sourceFile of sourceFiles) {
    const source = readFileSync(join(root, sourceFile), "utf8");
    assert.doesNotMatch(source, /\.jfif(?:["'`)]|$)/, `${sourceFile} still references JFIF`);
  }
});

test("JPEG aliases preserve the approved source image bytes", () => {
  const imageDirectory = join(root, "public", "images", "ornova");
  for (const [alias, source] of imagePairs) {
    assert.deepEqual(
      readFileSync(join(imageDirectory, alias)),
      readFileSync(join(imageDirectory, source)),
      `${alias} must be byte-identical to ${source}`,
    );
  }
});
