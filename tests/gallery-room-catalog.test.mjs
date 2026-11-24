import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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
const { galleryTrayMask } = load("lib/constants/gallery-tray-masks.ts");
const tray = load("lib/constants/gallery-tray-cutouts.ts");
const { galleryTrayCutout } = tray;
const room = load("lib/constants/gallery-room-samples.ts", { "./gallery-renders": renders, "../catalog/gallery-product-link": links, "./gallery-tray-cutouts": tray });
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

test("an exact collection photograph locates its own tray position, even when it is another view of a published work", () => {
  const [primary, alternate] = room.galleryRoomSamplesByCategory.pendants;
  const work = { ...product, categoryId: "pendants", roomPlacement: null, gallery: [primary, alternate] };
  const archive = room.galleryShowcaseEntries([]);
  assert.equal(archive.pendants[room.findGalleryShowcasePhoto(archive, alternate).index].sample.src, alternate.src);
  const published = room.galleryShowcaseEntries([work]);
  assert.deepEqual(room.findGalleryShowcasePhoto(published, alternate), { categoryId: "pendants", index: 0 });
  assert.equal(room.findGalleryShowcasePhoto(published, { ...alternate, src: photo }), null);
  assert.equal(room.findGalleryShowcasePhoto(published, { ...alternate, categoryId: "rings" }), null);
});

test("a published exact tray cutout replaces its archive card without needing a second link in the photo gallery", () => {
  const original = room.galleryRoomSamplesByCategory.rings[0];
  const linked = { ...product, standImage: galleryTrayCutout(original).src, roomPlacement: null, gallery: [{ src: photo }] };
  const entries = room.galleryShowcaseEntries([linked]).rings;
  assert.equal(entries[0].sample?.src, original.src);
  assert.equal(entries.filter((entry) => entry.sample?.src === original.src).length, 1);
  assert.equal(entries.length, room.galleryRoomSamplesByCategory.rings.length);
  const review = room.galleryShowcaseEntries([{ ...linked, galleryPlacementVerified: false }]).rings;
  assert.ok(review.some((entry) => !entry.product && entry.sample.src === original.src));
});

test("tray cutouts cover the six displays and match their precise original photos", () => {
  const samples = room.galleryRoomSamples;
  assert.equal(samples.length, 52);
  assert.equal(new Set(samples.map((sample) => sample.categoryId)).size, 6);
  for (const sample of samples) {
    const mask = galleryTrayMask(sample);
    const cutout = galleryTrayCutout(sample);
    assert.ok(cutout, sample.src);
    assert.equal(galleryTrayMask({ ...sample, src: photo }), null);
    assert.equal(galleryTrayCutout({ ...sample, src: photo }), null);
    if (mask) assert.deepEqual(cutout.bounds, mask.viewBox.split(" ").map(Number), sample.src);
    const [left, top, width, height] = cutout.bounds;
    assert.ok(left >= 0 && top >= 0 && width > 0 && height > 0);
    assert.ok(left + width <= sample.image[0] && top + height <= sample.image[1]);
  }
});

test("distinct visible archive works have distinct titles in the book and on the tray", () => {
  const photos = renders.visibleGalleryRenders;
  assert.equal(new Set(photos.map(({ title }) => title)).size, photos.length);
  const sampleTitles = new Map(room.galleryRoomSamples.map(({ number, title }) => [number, title]));
  for (const { number, title } of photos) {
    assert.equal(sampleTitles.get(number), title, number);
  }
});

test("both signet faces extend above their stand in the corrected crops", () => {
  const rings = room.galleryRoomSamplesByCategory.rings;
  for (const number of ["04", "19"]) {
    const photo = rings.find((sample) => sample.number === number);
    const crop = galleryTrayCutout(photo);
    assert.ok(crop.bounds[1] <= photo.bounds[1] - 150);
    assert.ok(crop.bounds[1] + crop.bounds[3] > photo.bounds[1]);
  }
  assert.equal(rings.some(({ number }) => number === "06"), false);
});

test("each transparent tray image retains the original RGB of every visible pixel", async () => {
  const asset = (src) => fileURLToPath(new URL(`../public${src}`, import.meta.url));
  for (const sample of room.galleryRoomSamples) {
    const cutout = galleryTrayCutout(sample);
    if (!cutout) continue;
    const [left, top, width, height] = cutout.bounds;
    const [original, { data, info }] = await Promise.all([
      sharp(asset(sample.src)).extract({ left, top, width, height }).removeAlpha().raw().toBuffer(),
      sharp(asset(cutout.src)).raw().toBuffer({ resolveWithObject: true }),
    ]);
    assert.deepEqual([info.width, info.height, info.channels], [width, height, 4], sample.src);
    let visiblePixels = 0;
    for (let pixel = 0; pixel < width * height; pixel++) {
      const offset = pixel * 4;
      if (!data[offset + 3]) continue;
      const sourceOffset = pixel * 3;
      if (data[offset] !== original[sourceOffset] || data[offset + 1] !== original[sourceOffset + 1] || data[offset + 2] !== original[sourceOffset + 2]) {
        assert.fail(`${sample.src} differs from the original at pixel ${pixel}`);
      }
      visiblePixels++;
    }
    assert.ok(visiblePixels > 0 && visiblePixels < width * height, sample.src);
  }
});

test("the photographed earring pair and constellation sets rotate on their matching displays", () => {
  assert.ok(room.galleryRoomSamplesByCategory.earrings.some(({ number }) => number === "32"));
  assert.ok(room.galleryRoomSamplesByCategory.pendants.some(({ number }) => number === "13"));
  for (const number of ["33", "34", "35", "36", "37", "38", "39"]) {
    assert.ok(room.galleryRoomSamplesByCategory["jewelry-sets"].some((sample) => sample.number === number));
  }
});
