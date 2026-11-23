import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, dependencies = {}) {
  const loaded = { exports: {} };
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)((name) => dependencies[name] ?? require(name), loaded.exports);
  return loaded.exports;
}
const renders = load("lib/constants/gallery-renders.ts");
const links = load("lib/catalog/gallery-product-link.ts");
const room = load("lib/constants/gallery-room-samples.ts", { "./gallery-renders": renders, "../catalog/gallery-product-link": links });
const photo = "/images/ornova/catalog-media/12345678-1234-4234-8234-123456789abc.webp";
const product = { slug: "new-silver-ring", name: "انگشتر تازه", categoryId: "rings", publicationStatus: "published",
  galleryPlacementVerified: true, standImage: photo, roomPlacement: { src: photo, image: [994, 608], bounds: [50, 84, 893, 439] } };

test("reviewed catalog photos join the correct stand after the original final renders", () => {
  const originals = room.galleryRoomSamplesByCategory.rings;
  const samples = room.roomSamplesWithCatalog([product]);
  assert.deepEqual(samples.rings.slice(0, originals.length), originals);
  assert.equal(samples.rings.at(-1).src, photo);
  assert.equal(samples.rings.at(-1).productSlug, product.slug);
  assert.equal(samples.earrings.length, room.galleryRoomSamplesByCategory.earrings.length);
});

test("unreviewed, unpublished and stale stand-image placements cannot enter the rotation", () => {
  for (const changed of [{ galleryPlacementVerified: false }, { publicationStatus: "review" }, { standImage: "/images/ornova/other.webp" }]) {
    const samples = room.roomSamplesWithCatalog([{ ...product, ...changed }]);
    assert.equal(samples.rings.length, room.galleryRoomSamplesByCategory.rings.length);
  }
});

test("the showcase starts with the published collection, keeps one entry per work and retains the archive photos", () => {
  const original = room.galleryRoomSamplesByCategory.rings[0];
  const linked = { ...product, gallery: [{ src: original.src }] };
  const photographic = { ...product, slug: "silver-band", galleryPlacementVerified: false, roomPlacement: null, gallery: [] };
  const entries = room.galleryShowcaseEntries([photographic, linked]).rings;
  assert.deepEqual(entries.slice(0, 2).map((entry) => entry.product.slug), ["new-silver-ring", "silver-band"]);
  assert.equal(entries[0].sample.src, original.src);
  assert.equal(entries[1].sample, undefined);
  assert.equal(entries.filter((entry) => entry.sample?.src === original.src).length, 1);
  assert.equal(entries.filter((entry) => entry.product === null).length, room.galleryRoomSamplesByCategory.rings.length - 1);
});

test("the book can surface a published category without a physical display and never surfaces review drafts", () => {
  const published = { ...product, categoryId: "necklaces", roomPlacement: null, gallery: [] };
  const draft = { ...published, slug: "private-draft", publicationStatus: "review" };
  const entries = room.galleryShowcaseEntries([draft, published]);
  assert.deepEqual(entries.necklaces, [{ product: published }]);
  assert.ok(entries.earrings.length > 0);
});
