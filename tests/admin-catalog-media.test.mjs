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
const auth = load("lib/auth/authorization.ts");
const signatures = load("lib/security/file-signature.ts");
function fixture(user = { app_metadata: { ornova_role: "staff" } }, authError = null) {
  const uploads = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    storage: { from: (bucket) => ({ upload: async (...args) => { uploads.push({ bucket, args }); return { error: null }; } }) },
  };
  const route = load("app/api/admin/catalog/media/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/auth/authorization": auth,
    "@/lib/security/file-signature": signatures,
  });
  function post(content = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), mime = "image/png", origin = "http://localhost:3058") {
    const body = new FormData(); body.set("file", new File([content], "sample.png", { type: mime }));
    return route.POST(new Request("http://localhost:3058/api/admin/catalog/media", { method: "POST", headers: { origin }, body }));
  }
  return { post, uploads };
}

test("catalog upload rejects cross-origin, anonymous, nonstaff and invalid sessions before storage", async () => {
  for (const [user,error,origin,expected] of [
    [null,null,"http://localhost:3058",401],
    [{ app_metadata: {} },null,"http://localhost:3058",403],
    [{ app_metadata: { ornova_role: "staff" } },{ message: "expired" },"http://localhost:3058",401],
    [{ app_metadata: { ornova_role: "staff" } },null,"http://outside.invalid",403],
  ]) {
    const item = fixture(user,error);
    assert.equal((await item.post(undefined,undefined,origin)).status,expected);
    assert.equal(item.uploads.length,0);
  }
});

test("catalog upload verifies file bytes, size and produces an immutable public path", async () => {
  const item = fixture();
  assert.equal((await item.post(new Uint8Array([1,2,3]),"image/png")).status,400);
  assert.equal((await item.post(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),"application/pdf")).status,400);
  assert.equal((await item.post(new Uint8Array(4 * 1024 * 1024 + 1),"image/png")).status,413);
  assert.equal(item.uploads.length,0);
  const response = await item.post();
  assert.equal(response.status,201);
  const { path } = await response.json();
  assert.match(path,/^\/images\/ornova\/catalog-media\/[0-9a-f-]{36}\.png$/);
  assert.equal(item.uploads[0].bucket,"ornova-catalog");
  assert.equal(item.uploads[0].args[2].upsert,false);
});

test("catalog media route only fetches validated names from the configured storage host", async () => {
  const originalHost = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalFetch = globalThis.fetch;
  const calls = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  globalThis.fetch = async (url) => { calls.push(url); return new Response(new Uint8Array([1,2,3]), { status: 200 }); };
  try {
    const route = load("app/images/ornova/catalog-media/[file]/route.ts");
    assert.equal((await route.GET(new Request("https://ornova.ir/images/ornova/catalog-media/bad.png"), { params: Promise.resolve({ file: "bad.png" }) })).status,404);
    assert.equal(calls.length,0);
    const file = "12345678-1234-1234-1234-123456789abc.webp";
    const response = await route.GET(new Request(`https://ornova.ir/images/ornova/catalog-media/${file}`), { params: Promise.resolve({ file }) });
    assert.equal(response.status,200);
    assert.equal(response.headers.get("content-type"),"image/webp");
    assert.equal(calls[0],`https://example.supabase.co/storage/v1/object/public/ornova-catalog/${file}`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalHost === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalHost;
  }
});
