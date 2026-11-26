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
const authorization = load("lib/auth/authorization.ts");
const requestBody = load("lib/commerce/quote-request.ts");
const placementSchema = load("lib/catalog/room-placement.ts");
const placement = { src: "/images/ornova/catalog-media/12345678-1234-4234-8234-123456789abc.webp", image: [994, 608], bounds: [50, 84, 893, 439] };
function fixture({ user = { app_metadata: { ornova_role: "staff" } }, authError = null, rpcError = null } = {}) {
  const writes = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    rpc: async (...args) => { writes.push(args); return { data: { slug: "new-silver-ring", revision: 3, room_placement: args[1].p_placement }, error: rpcError }; },
  };
  const route = load("app/api/admin/catalog/placement/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/auth/authorization": authorization,
    "@/lib/commerce/quote-request": requestBody,
    "@/lib/catalog/room-placement": placementSchema,
    "@/lib/catalog/gallery-product-link": load("lib/catalog/gallery-product-link.ts"),
  });
  const post = (value = { slug: "new-silver-ring", revision: 2, placement }, origin = "http://localhost:3058") => route.POST(new Request("http://localhost:3058/api/admin/catalog/placement", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) }));
  return { post, writes };
}

test("room placement requires same origin and trusted staff before database writes", async () => {
  for (const options of [{ user: null }, { user: { app_metadata: {} } }, { authError: { message: "invalid" } }]) {
    const subject = fixture(options);
    assert.notEqual((await subject.post()).status, 200);
    assert.equal(subject.writes.length, 0);
  }
  const subject = fixture();
  assert.equal((await subject.post(undefined, "http://outside.invalid")).status, 403);
  assert.equal(subject.writes.length, 0);
});

test("room placement accepts only measured in-image bounds and maps conflicts", async () => {
  const invalid = fixture();
  assert.equal((await invalid.post({ slug: "new-silver-ring", revision: 2, placement: { ...placement, bounds: [50, 84, 990, 439] } })).status, 400);
  assert.equal(invalid.writes.length, 0);
  const ready = fixture();
  assert.equal((await ready.post()).status, 200);
  assert.equal(ready.writes[0][0], "save_catalog_room_placement");
  assert.deepEqual(ready.writes[0][1].p_placement, placement);
  assert.equal((await ready.post({ slug: "new-silver-ring", revision: 3, placement: null })).status, 200);
  const conflict = fixture({ rpcError: { message: "CATALOG_CONFLICT" } });
  assert.equal((await conflict.post()).status, 409);
});

test("room placement cannot restore an image withheld from the gallery", async () => {
  const subject = fixture();
  const body = { slug: "silent-vase-pin", revision: 2 };
  const src = "/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp";
  assert.equal((await subject.post({ ...body, placement: { ...placement, src } })).status, 400);
  assert.equal(subject.writes.length, 0);
  assert.equal((await subject.post({ ...body, placement: null })).status, 200);
});
