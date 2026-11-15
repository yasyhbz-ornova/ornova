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
const catalog = load("lib/constants/catalog.ts");
const schema = load("lib/catalog/product-input.ts", { "@/lib/constants/catalog": catalog });
const authorization = load("lib/auth/authorization.ts");
const requestBody = load("lib/commerce/quote-request.ts");
const product = {
  slug: "new-silver-ring", revision: 0, name: "انگشتر نمونه", category_id: "rings", category_label: "انگشتر", subtype_id: null,
  description: "شرح بررسی‌شده", image_path: "/images/ornova/ring.webp", stand_image_path: "/images/ornova/ring.webp",
  gallery: [{ src: "/images/ornova/ring.webp", alt: "انگشتر" }], details: [], packaging_gallery: [],
  turntable_video_path: null, image_fit: "contain", gallery_placement_verified: true, status: "published",
};
function fixture({ user = { app_metadata: { ornova_role: "staff" } }, authError = null, rpcError = null, listError = null } = {}) {
  const writes = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [product], error: listError }) }) }) }),
    rpc: async (...args) => { writes.push(args); return { data: rpcError ? null : { ...product, revision: product.revision + 1 }, error: rpcError }; },
  };
  const route = load("app/api/admin/catalog/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/auth/authorization": authorization,
    "@/lib/commerce/quote-request": requestBody,
    "@/lib/catalog/product-input": schema,
  });
  const post = (value = product, origin = "http://localhost:3058") => route.POST(new Request("http://localhost:3058/api/admin/catalog", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) }));
  return { ...route, post, writes };
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

test("catalog list is staff-only and reports database failure", async () => {
  assert.equal((await fixture({ user: { app_metadata: {} } }).GET()).status, 403);
  assert.equal((await fixture({ listError: { message: "missing" } }).GET()).status, 503);
  const response = await fixture().GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
