import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, dependencies = {}, network = globalThis.fetch, runtime = process) {
  const loaded = { exports: {} };
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  new Function("require", "exports", "fetch", "process", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)((name) => dependencies[name] ?? require(name), loaded.exports, network, runtime);
  return loaded.exports;
}
const catalog = load("lib/constants/catalog.ts");
const schema = load("lib/catalog/product-input.ts", { "@/lib/constants/catalog": catalog });
const authorization = load("lib/auth/authorization.ts");
const requestBody = load("lib/commerce/quote-request.ts");
const tray = load("lib/catalog/tray-image.ts");
const renders = load("lib/constants/gallery-renders.ts");
const product = {
  slug: "new-silver-ring", revision: 0, name: "انگشتر نمونه", category_id: "rings", category_label: "انگشتر", subtype_id: null,
  description: "شرح بررسی‌شده", image_path: "/images/ornova/ring.webp", stand_image_path: "/images/ornova/ring.webp",
  gallery: [{ src: "/images/ornova/ring.webp", alt: "انگشتر" }], details: [], packaging_gallery: [],
  turntable_video_path: null, image_fit: "contain", gallery_placement_verified: true, status: "published",
};
function fixture({ user = { app_metadata: { ornova_role: "staff" } }, authError = null, rpcError = null, listError = null, media = null, mediaStatus = 200 } = {}) {
  const writes = [];
  const mediaReads = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [product], error: listError }) }) }) }),
    rpc: async (...args) => { writes.push(args); return { data: rpcError ? null : { ...product, revision: product.revision + 1 }, error: rpcError }; },
    storage: { from: (bucket) => ({ getPublicUrl: (name) => ({ data: { publicUrl: `https://fixture.supabase.co/storage/v1/object/public/${bucket}/${name}` } }) }) },
  };
  const route = load("app/api/admin/catalog/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/auth/authorization": authorization,
    "@/lib/commerce/quote-request": requestBody,
    "@/lib/catalog/product-input": schema,
    "@/lib/catalog/tray-image": tray,
    "@/lib/constants/gallery-renders": renders,
  }, async (url, options) => { mediaReads.push({ url, options }); return new Response(media, { status: mediaStatus }); });
  const post = (value = product, origin = "http://localhost:3058") => route.POST(new Request("http://localhost:3058/api/admin/catalog", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) }));
  return { ...route, post, writes, mediaReads };
}

test("catalog write is staff-only, same-origin, and fails closed on auth errors", async () => {
  for (const options of [{ user: null }, { user: { app_metadata: {} } }, { authError: { message: "session invalid" } }]) {
    const caseFile = fixture(options);
    assert.notEqual((await caseFile.post()).status, 200);
    assert.equal(caseFile.writes.length, 0);
  }
  const wrongOrigin = fixture();
  assert.equal((await wrongOrigin.post(product, "http://outside.invalid")).status, 403);
  assert.equal(wrongOrigin.writes.length, 0);
});

test("catalog validation prevents unverified publication and database conflict is visible", async () => {
  const invalid = fixture();
  assert.equal((await invalid.post({ ...product, gallery_placement_verified: false })).status, 400);
  assert.equal(invalid.writes.length, 0);
  const conflict = fixture({ rpcError: { message: "CATALOG_CONFLICT" } });
  assert.equal((await conflict.post()).status, 409);
  assert.equal(conflict.writes.length, 1);
  const ready = fixture();
  assert.equal((await ready.post()).status, 201);
  assert.equal(ready.writes[0][0], "save_catalog_product");
  assert.equal(ready.writes[0][1].p_product.status, "published");
  assert.equal(ready.writes[0][1].p_product.slug, undefined);
});

test("a cropped archive reference stays linked during review and publication but cannot be the public cover or tray", async () => {
  const reference = fixture();
  for (const number of ["04", "06", "19"]) {
    const cropped = renders.galleryRenders.find((photo) => photo.number === number).src;
    assert.equal((await reference.post({ ...product, image_path: cropped })).status, 400);
    assert.equal((await reference.post({ ...product, stand_image_path: cropped })).status, 400);
    assert.equal(reference.writes.length, 0);
  }
  const cropped = renders.galleryRenders.find(({ number }) => number === "04").src;
  const gallery = [{ src: cropped, alt: "مرجع بررسی" }];
  assert.equal((await reference.post({ ...product, status: "review", image_path: cropped, stand_image_path: null, gallery, gallery_placement_verified: false })).status, 201);
  assert.equal((await reference.post({ ...product, gallery })).status, 201);
  assert.deepEqual(reference.writes.map(([, args]) => args.p_product.gallery), [gallery, gallery]);
});

test("public catalog filters cropped archive imagery and resolves a usable cover for older products", async () => {
  const cropped = renders.galleryRenders.find(({ number }) => number === "04").src;
  const reference = { src: cropped, alt: "مرجع بررسی" };
  const full = { src: "/images/ornova/full-ring.jpg", alt: "نمای کامل" };
  const rows = [
    { ...product, slug: "legacy", image_path: cropped, gallery: [reference, full], packaging_gallery: [reference, full] },
    { ...product, slug: "tray-only", image_path: cropped, gallery: [reference] },
    { ...product, slug: "missing-tray", stand_image_path: cropped },
    { ...product, slug: "reference-only", image_path: cropped, stand_image_path: cropped, gallery: [reference] },
    product,
  ];
  const client = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }) }) };
  const { getPublishedProducts } = load("lib/catalog/public-products.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/constants/catalog": catalog,
    "@/lib/constants/gallery-renders": renders,
    "@/lib/constants/products": { products: [] },
    "@/lib/catalog/room-placement": load("lib/catalog/room-placement.ts"),
  }, globalThis.fetch, { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test" } });
  const [legacy, trayOnly, missingTray, ordinary] = await getPublishedProducts();
  assert.equal(legacy.image, full.src);
  assert.deepEqual(legacy.gallery, [full]);
  assert.deepEqual(legacy.packagingGallery, [full]);
  assert.equal(trayOnly.image, product.stand_image_path);
  assert.deepEqual(trayOnly.gallery, []);
  assert.equal(missingTray.standImage, undefined);
  assert.equal(missingTray.galleryPlacementVerified, false);
  assert.equal(ordinary.slug, product.slug);
  assert.equal(ordinary.image, product.image_path);
  assert.deepEqual(ordinary.gallery, product.gallery);
});

test("marking an uploaded image as tray verified checks the stored file before writing", async () => {
  const fileName = "12345678-1234-4234-8234-123456789abc.png";
  const uploaded = { ...product, stand_image_path: `/images/ornova/catalog-media/${fileName}` };
  const opaque = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#ffffff" } }).png().toBuffer();
  const cutout = await sharp(Buffer.from([155, 174, 190, 255, 0, 0, 0, 0]), { raw: { width: 2, height: 1, channels: 4 } }).png().toBuffer();

  const bad = fixture({ media: opaque });
  assert.equal((await bad.post(uploaded)).status, 400);
  assert.equal(bad.writes.length, 0);
  assert.equal(bad.mediaReads.length, 1);
  assert.equal(bad.mediaReads[0].options.redirect, "error");
  for (const [upstream, expected] of [[404, 400], [503, 503]]) {
    const unavailable = fixture({ mediaStatus: upstream });
    assert.equal((await unavailable.post(uploaded)).status, expected);
    assert.equal(unavailable.writes.length, 0);
  }

  const ready = fixture({ media: cutout });
  assert.equal((await ready.post(uploaded)).status, 201);
  assert.equal(ready.mediaReads[0].url, `https://fixture.supabase.co/storage/v1/object/public/ornova-catalog/${fileName}`);
  assert.equal(ready.writes[0][1].p_product.stand_image_path, uploaded.stand_image_path);
  assert.equal(ready.writes[0][1].p_product.gallery_placement_verified, true);

  for (const change of [{ status: "review", gallery_placement_verified: false }, { status: "archived" }]) {
    const draft = fixture();
    assert.equal((await draft.post({ ...uploaded, ...change })).status, 201);
    assert.equal(draft.mediaReads.length, 0);
  }
});

test("catalog list is staff-only and reports database failure", async () => {
  assert.equal((await fixture({ user: { app_metadata: {} } }).GET()).status, 403);
  assert.equal((await fixture({ listError: { message: "missing" } }).GET()).status, 503);
  const response = await fixture().GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("staff dossier details reach storage in the existing catalog format", async () => {
  const ready = fixture();
  const details = [
    { label: "جنس", value: "نقره" },
    { label: "سنگ", value: "بدون سنگ" },
    { label: "وزن تقریبی", value: "۳٫۲ گرم" },
    { label: "ابعاد تقریبی", value: "۱۲ × ۸ میلی‌متر" },
  ];
  assert.equal((await ready.post({ ...product, details })).status, 201);
  assert.deepEqual(ready.writes[0][1].p_product.details, details);
});
