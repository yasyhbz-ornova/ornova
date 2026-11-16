import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(file, dependencies = {}) {
  const loaded = { exports: {} };
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  new Function("require", "exports", compiled.outputText)((name) => dependencies[name] ?? require(name), loaded.exports);
  return loaded.exports;
}

const catalog = load("lib/constants/catalog.ts");
const { galleryRenders } = load("lib/constants/gallery-renders.ts");
const { draftCatalogFormFromPhoto } = load("lib/catalog/photo-draft.ts", { "../constants/catalog": catalog });

test("all supplied final photos can start a private review record with their exact source", () => {
  assert.equal(galleryRenders.length, 53);
  const slugs = new Set();
  for (const photo of galleryRenders) {
    const draft = draftCatalogFormFromPhoto(photo);
    assert.ok(draft, `photo ${photo.number} needs a category`);
    assert.equal(draft.image_path, photo.src);
    assert.deepEqual(draft.gallery, [{ src: photo.src, alt: photo.title }]);
    assert.equal(draft.category_id, photo.categoryId);
    assert.equal(draft.status, "review");
    assert.equal(draft.gallery_placement_verified, false);
    assert.equal(draft.stand_image_path, null);
    assert.equal(draft.description, "");
    assert.equal(slugs.has(draft.slug), false);
    slugs.add(draft.slug);
  }
});
