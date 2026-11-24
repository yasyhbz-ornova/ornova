import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
function load(path, dependencies = {}, browser) {
  const url = new URL(`../${path}`, import.meta.url), loaded = { exports: {} };
  const source = existsSync(url) ? readFileSync(url, "utf8") : "";
  new Function("require", "exports", "window", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)((name) => dependencies[name] ?? require(name), loaded.exports, browser);
  return loaded.exports;
}
const prefs = load("lib/commerce/product-preferences.ts");

test("product preference schema retains canonical EU size and bounded review notes, not manufacturing options", () => {
  assert.equal(typeof prefs.parseProductPreferences, "function");
  assert.deepEqual(prefs.parseProductPreferences({ version: 1, ring_size_eu: 54, stone_note: "  سنگ آبی  ", dimensions_note: "اندازه بعداً" }, true), { success: true, value: { version: 1, ring_size_eu: 54, stone_note: "سنگ آبی", dimensions_note: "اندازه بعداً" } });
  assert.deepEqual(prefs.parseProductPreferences(undefined, false), { success: true, value: undefined });
  assert.deepEqual(prefs.parseProductPreferences({ version: 1, stone_note: "   " }, false), { success: true, value: undefined });
});

test("invalid types, unknown keys, non-ring sizes and oversized notes fail instead of losing choices silently", () => {
  assert.equal(typeof prefs.parseProductPreferences, "function");
  for (const input of [null, [], { version: 2 }, { version: 1, ring_size_uk: "M" }, { version: 1, ring_size_eu: "54" }, { version: 1, ring_size_eu: Infinity }, { version: 1, ring_size_eu: -1 }, { version: 1, stone_note: "ا".repeat(121) }, { version: 1, finish_note: 12 }]) assert.equal(prefs.parseProductPreferences(input, true).success, false, JSON.stringify(input));
  assert.equal(prefs.parseProductPreferences({ version: 1, ring_size_eu: 54 }, false).success, false);
});

test("size input accepts Persian and Arabic numerals without relabeling another sizing system", () => {
  assert.equal(typeof prefs.parseEuSizeInput, "function");
  assert.equal(prefs.parseEuSizeInput("۵۴"), 54);
  assert.equal(prefs.parseEuSizeInput("٥٤٫٥"), 54.5);
  assert.equal(prefs.parseEuSizeInput(""), undefined);
  for (const input of ["M", "1e2", "-54", "54abc", "99999"]) assert.equal(prefs.parseEuSizeInput(input), null);
});

test("basket parsing, inquiry selection and display retain preferences on the same product", () => {
  const basket = load("lib/commerce/request-basket.ts", { "./product-preferences": prefs });
  const selection = load("lib/commerce/request-selection.ts");
  const input = { slug: "lajvard-shab-ring", name: "انگشتر", category: "انگشتر", quantity: 2, preferences: { version: 1, ring_size_eu: 54, stone_note: "آبی" } };
  assert.deepEqual(basket.parseRequestItems([input]), [input]);
  assert.deepEqual(selection.getInquiryItems([input], { slug: input.slug, name: input.name, category: input.category }), [input]);
  assert.equal(typeof prefs.productPreferenceRows, "function");
  assert.deepEqual(prefs.productPreferenceRows(input.preferences), [{ label: "سایز اروپایی انگشتر", value: "۵۴" }, { label: "سنگ و رنگ دلخواه", value: "آبی" }]);
});

function routeFixture({ user = { id: "customer-a" }, rpcError = null, catalogError = null, catalogRows = [
  { slug: "lajvard-shab-ring", category_id: "rings" },
  { slug: "sepid-brooch", category_id: "brooches-pins" },
] } = {}) {
  const calls = [];
  const { POST } = load("app/api/inquiries/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: catalogError ? null : catalogRows, error: catalogError }) }) }) }), rpc: async (...args) => { calls.push(args); return { data: rpcError ? null : "inquiry-id", error: rpcError }; } }) },
    "@/lib/constants/products": load("lib/constants/products.ts"),
    "@/lib/constants/gallery-renders": load("lib/constants/gallery-renders.ts"),
    "@/lib/commerce/product-preferences": prefs,
    "@/lib/auth/authorization": load("lib/auth/authorization.ts"),
  });
  const send = (items, overrides = {}) => POST(new Request("http://localhost:3058/api/inquiries", { method: "POST", headers: { origin: "http://localhost:3058", "content-type": "application/json" }, body: JSON.stringify({ customer_name: "آزمایش", message: "بررسی قطعه", contact: "synthetic@example.invalid", items, ...overrides }) }));
  return { calls, send };
}

test("archive requests persist the title for a visible photo without inventing a catalog item", async () => {
  const ready = routeFixture();
  assert.equal((await ready.send([], { archive_photo: "07", message: "" })).status, 201);
  assert.match(ready.calls[0][1].p_message, /سنجاق‌سینهٔ نواری مشبک/);
  assert.deepEqual(ready.calls[0][1].p_items, []);
  const invalid = routeFixture();
  for (const photo of ["06", "99", "07/"]) {
    assert.equal((await invalid.send([], { archive_photo: photo })).status, 400);
  }
  assert.equal((await invalid.send([{ product_slug: "sepid-brooch", quantity: 1 }], { archive_photo: "07" })).status, 400);
  assert.equal(invalid.calls.length, 0);
});

test("configured inquiry uses atomic preference-aware RPC; missing schema never falls back and loses preferences", async () => {
  const item = { product_slug: "lajvard-shab-ring", quantity: 2, preferences: { version: 1, ring_size_eu: 54, stone_note: " آبی " } };
  const ready = routeFixture();
  assert.equal((await ready.send([item])).status, 201);
  assert.equal(ready.calls[0][0], "create_inquiry_with_preferences");
  assert.deepEqual(ready.calls[0][1].p_items[0], { ...item, preferences: { ...item.preferences, stone_note: "آبی" } });
  const unavailable = routeFixture({ rpcError: { message: "missing RPC" } });
  assert.equal((await unavailable.send([item])).status, 503);
  assert.equal(unavailable.calls.length, 1);
  assert.equal(unavailable.calls[0][0], "create_inquiry_with_preferences");
});

test("server refuses forged size for non-ring, unknown preference fields and duplicate products before writing", async () => {
  for (const items of [
    [{ product_slug: "sepid-brooch", quantity: 1, preferences: { version: 1, ring_size_eu: 54 } }],
    [{ product_slug: "lajvard-shab-ring", quantity: 1, preferences: { version: 1, guaranteed: true } }],
    [{ product_slug: "lajvard-shab-ring", quantity: 1 }, { product_slug: "lajvard-shab-ring", quantity: 1 }],
  ]) {
    const fixture = routeFixture();
    assert.equal((await fixture.send(items)).status, 400);
    assert.equal(fixture.calls.length, 0);
  }
});

test("unconfigured inquiries keep existing RPC compatibility and anonymous submissions never write", async () => {
  const item = { product_slug: "sepid-brooch", quantity: 1 };
  const ready = routeFixture();
  assert.equal((await ready.send([item])).status, 201);
  assert.equal(ready.calls[0][0], "create_inquiry_with_items");
  const guest = routeFixture({ user: null });
  assert.equal((await guest.send([item])).status, 401);
  assert.equal(guest.calls.length, 0);
});

test("distinct configurations of one product use their atomic RPC; equivalent duplicates and an unavailable migration fail closed", async () => {
  const rows=[{product_slug:"lajvard-shab-ring",quantity:2,preferences:{version:1,ring_size_eu:54}},{product_slug:"lajvard-shab-ring",quantity:1,preferences:{version:1,ring_size_eu:56}}];
  const ready=routeFixture();
  assert.equal((await ready.send(rows)).status,201);
  assert.equal(ready.calls[0][0],"create_inquiry_with_configurations");
  assert.deepEqual(ready.calls[0][1].p_items,rows);
  const duplicate=routeFixture();
  assert.equal((await duplicate.send([{...rows[0],preferences:{version:1,stone_note:" آبی "}},{...rows[1],preferences:{stone_note:"آبی",version:1}}])).status,400);
  assert.equal(duplicate.calls.length,0);
  const unavailable=routeFixture({rpcError:{code:"PGRST202",message:"missing configuration RPC"}});
  assert.equal((await unavailable.send(rows)).status,503);
  assert.equal(unavailable.calls.length,1);
  assert.equal(unavailable.calls[0][0],"create_inquiry_with_configurations");
});

test("published new catalog products can be ordered, archived products cannot, and catalog errors fail closed", async () => {
  const newProduct = { product_slug: "new-starlight-pendant", quantity: 1 };
  const published = routeFixture({ catalogRows: [{ slug: newProduct.product_slug, category_id: "pendants-charms" }] });
  assert.equal((await published.send([newProduct])).status, 201);
  assert.equal(published.calls[0][1].p_items[0].product_slug, newProduct.product_slug);
  const archived = routeFixture({ catalogRows: [] });
  assert.equal((await archived.send([newProduct])).status, 400);
  assert.equal(archived.calls.length, 0);
  const broken = routeFixture({ catalogError: { code: "42501", message: "private" } });
  assert.equal((await broken.send([newProduct])).status, 503);
  assert.equal(broken.calls.length, 0);
});

test("submission cleanup preserves a newer configuration or note saved while an older request was in flight", () => {
  const { removeSubmittedRequestItems } = load("lib/commerce/request-selection.ts");
  const submitted = { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, preferences: { version: 1, ring_size_eu: 54 } };
  const changed = { ...submitted, preferences: { version: 1, ring_size_eu: 56 } };
  assert.deepEqual(removeSubmittedRequestItems([changed], [submitted]), [changed]);
  const noted = { ...submitted, note: "نکتهٔ تازه" };
  assert.deepEqual(removeSubmittedRequestItems([noted], [submitted]), [noted]);
  assert.deepEqual(removeSubmittedRequestItems([{ ...submitted, quantity: 2 }], [submitted]), [{ ...submitted, quantity: 1 }]);
});

test("receipt freezes the submitted preferences rather than referencing the mutable basket", () => {
  const { createInquiryReceipt } = load("lib/commerce/inquiry-receipt.ts");
  const item = { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, preferences: { version: 1, ring_size_eu: 54 } };
  const receipt = createInquiryReceipt({ id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7" }, [item]);
  item.preferences.ring_size_eu = 56;
  assert.deepEqual(receipt.items[0].preferences, { version: 1, ring_size_eu: 54 });
});

test("account item reads retry only the known missing-preferences column and never hide permission failures", async () => {
  const { readInquiryItems } = load("lib/account/inquiry-items.ts");
  assert.equal(typeof readInquiryItems, "function");
  const calls = [];
  const client = { from: (table) => ({ select: (fields) => ({ in: async (key, ids) => {
    calls.push({ table, fields, key, ids });
    return fields.includes("preferences") ? { data: null, error: { code: "42703", message: "column inquiry_items.preferences does not exist" } } : { data: [{ inquiry_id: "id", product_name: "قطعه", quantity: 1 }], error: null };
  } }) }) };
  const result = await readInquiryItems(client, ["id"]);
  assert.equal(result.error, null);
  assert.equal(result.data.length, 1);
  assert.equal(calls.length, 2);
  const deniedCalls = [];
  const denied = { from: () => ({ select: () => ({ in: async () => { deniedCalls.push(1); return { data: null, error: { code: "42501", message: "permission denied preferences" } }; } }) }) };
  assert.equal((await readInquiryItems(denied, ["id"])).error.code, "42501");
  assert.equal(deniedCalls.length, 1);
});

test("explicit configuration saves preserve quantity/note and refuse a full basket instead of losing the last item", () => {
  const basket = load("lib/commerce/request-basket.ts", { "./product-preferences": prefs });
  let serialized = JSON.stringify([{ slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 2, note: "یادداشت جدا", preferences: { version: 1, ring_size_eu: 54 } }]);
  const browser = { localStorage: { getItem: () => serialized, setItem: (_key, value) => { serialized = value; } }, dispatchEvent: () => {} };
  const configs=load("lib/commerce/request-configurations.ts",{"./request-basket":basket,"./product-preferences":prefs});
  const { saveConfiguredRequestItem } = load("components/commerce/RequestBasketButton.tsx", { "@/lib/commerce/request-basket": basket,"@/lib/commerce/product-preferences":prefs,"@/lib/commerce/request-configurations":configs }, browser);
  assert.equal(saveConfiguredRequestItem({ slug: "ring", name: "انگشتر", category: "انگشتر" }, { version: 1, ring_size_eu: 56 }, "ring").success, true);
  assert.deepEqual(JSON.parse(serialized)[0], { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 2, note: "یادداشت جدا", preferences: { version: 1, ring_size_eu: 56 } });
  serialized = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ slug: `piece-${i}`, name: "قطعهٔ آزمایشی", category: "بروچ", quantity: 1 })));
  const before = serialized;
  assert.equal(saveConfiguredRequestItem({ slug: "new", name: "جدید", category: "بروچ" }, { version: 1, stone_note: "آبی" }).success, false);
  assert.equal(serialized, before);
});

test("explicit login handoff round-trips product preferences without dropping canonical size", () => {
  const { shareSessionDraftWithNextTab, consumeCrossTabDraft } = load("lib/commerce/session-draft.ts");
  const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };
  const session = storage(), persistent = storage(), target = storage();
  const draft = { items: [{ slug: "ring", preferences: { version: 1, ring_size_eu: 54, finish_note: "مات، برای بررسی" } }] };
  session.setItem("source", JSON.stringify(draft));
  assert.equal(shareSessionDraftWithNextTab(session, persistent, "source", "handoff", 200), true);
  assert.deepEqual(JSON.parse(consumeCrossTabDraft(target, persistent, "handoff", "target", 100)), draft);
});
