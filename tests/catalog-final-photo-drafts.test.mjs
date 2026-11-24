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
const { galleryRenders, visibleGalleryRenders } = load("lib/constants/gallery-renders.ts");
const trayCutouts = load("lib/constants/gallery-tray-cutouts.ts");
const photoDraft = load("lib/catalog/photo-draft.ts", { "../constants/catalog": catalog, "../constants/gallery-tray-cutouts": trayCutouts });
const { draftCatalogFormFromPhoto } = photoDraft;

test("ready final photos start private review records, but the marked duplicate cannot", () => {
  assert.equal(galleryRenders.length, 53);
  const slugs = new Set();
  for (const photo of galleryRenders) {
    const draft = draftCatalogFormFromPhoto(photo);
    if (photo.number === "06") {
      assert.equal(draft, null);
      continue;
    }
    assert.ok(draft, `photo ${photo.number} needs a category`);
    assert.equal(draft.image_path, photo.src);
    assert.deepEqual(draft.gallery, [{ src: photo.src, alt: photo.title }]);
    assert.equal(draft.category_id, photo.categoryId);
    assert.equal(draft.status, "review");
    assert.equal(draft.gallery_placement_verified, false);
    assert.equal(draft.stand_image_path, photo.src.replace("/final-renders/", "/tray-cutouts/"));
    assert.equal(draft.description, "");
    assert.equal(slugs.has(draft.slug), false);
    slugs.add(draft.slug);
  }
});

test("review classifies exact photo claims across cover, stand and gallery without double counting a work", () => {
  const photos = galleryRenders.filter((photo) => ["01", "02", "03", "06", "07"].includes(photo.number));
  const byNumber = Object.fromEntries(photos.map((photo) => [photo.number, photo]));
  const cover = { slug: "pin", name: "سنجاق", image_path: byNumber["01"].src, stand_image_path: null, gallery: [{ src: byNumber["01"].src }, { src: byNumber["07"].src }] };
  const stand = { slug: "pendant", name: "آویز", image_path: null, stand_image_path: byNumber["02"].src, gallery: [{ src: byNumber["07"].src }] };
  assert.equal(typeof photoDraft.reviewCatalogPhotos, "function");
  const review = photoDraft.reviewCatalogPhotos(photos, [cover, stand]);
  assert.deepEqual(review.available.map((photo) => photo.number), ["03"]);
  assert.deepEqual(review.excluded.map((photo) => photo.number), ["06"]);
  assert.deepEqual(review.assigned.map(({ photo, owners }) => [photo.number, owners.map(({ slug }) => slug)]),
    [["01", ["pin"]], ["02", ["pendant"]], ["07", ["pin", "pendant"]]]);
});

test("a legacy claim of duplicate photo 06 also keeps its byte-identical original 04 out of the unassigned queue", () => {
  const originals = galleryRenders.filter((photo) => ["04", "06"].includes(photo.number));
  const old = { slug: "old-ring", name: "انگشتر", image_path: originals[1].src, stand_image_path: null, gallery: [] };
  const review = photoDraft.reviewCatalogPhotos(originals, [old]);
  assert.deepEqual(review.available, []);
  assert.deepEqual(review.assigned.map(({ photo, owners }) => [photo.number, owners[0].slug]), [["04", "old-ring"]]);
  assert.deepEqual(review.excluded.map(({ number }) => number), ["06"]);
});

test("the recovered signets have review drafts with complete tray images and the duplicate stays out", () => {
  const [bull, dark] = ["04", "19"].map((number) => visibleGalleryRenders.find((photo) => photo.number === number));
  assert.ok(bull && dark);
  assert.equal(visibleGalleryRenders.some(({ number }) => number === "06"), false);
  assert.deepEqual([bull.height, dark.height], [762, 761]);
  for (const photo of [bull, dark]) {
    const draft = draftCatalogFormFromPhoto(photo);
    assert.equal(draft.image_path, photo.src);
    assert.ok(draft.stand_image_path);
    assert.equal(draft.status, "review");
    assert.equal(draft.gallery_placement_verified, false);
  }
});

test("a claim on an exact tray derivative keeps the source photo out of the unassigned queue", () => {
  const photo = galleryRenders.find(({ number }) => number === "02");
  const owner = { slug: "pendant", name: "آویز", image_path: null, stand_image_path: trayCutouts.galleryTrayCutout(photo).src, gallery: [] };
  const review = photoDraft.reviewCatalogPhotos([photo], [owner]);
  assert.deepEqual(review.available, []);
  assert.deepEqual(review.assigned.map(({ photo: assigned, owners }) => [assigned.src, owners[0].slug]), [[photo.src, owner.slug]]);
});

test("a compatible photo adds an extra view without changing the identity or review state", () => {
  const [anchor, extra, unrelated, duplicate] = ["01", "07", "03", "06"].map((number) => galleryRenders.find((photo) => photo.number === number));
  const input = { ...draftCatalogFormFromPhoto(anchor), name: "سنجاق‌سینهٔ نمونه" };
  assert.equal(typeof photoDraft.appendCatalogPhotoView, "function");
  const appended = photoDraft.appendCatalogPhotoView(input, extra);
  assert.equal(appended.slug, input.slug);
  assert.equal(appended.image_path, anchor.src);
  assert.equal(appended.status, "review");
  assert.deepEqual(appended.gallery.map((item) => item.src), [anchor.src, extra.src]);
  assert.equal(input.gallery.length, 1);
  assert.equal(photoDraft.appendCatalogPhotoView(appended, extra), null);
  assert.equal(photoDraft.appendCatalogPhotoView(input, unrelated), null);
  assert.equal(photoDraft.appendCatalogPhotoView(input, duplicate), null);
  assert.equal(photoDraft.appendCatalogPhotoView({ ...input, gallery: Array(12).fill(input.gallery[0]) }, extra), null);
});
