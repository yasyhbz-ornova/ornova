import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/request-basket.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const requestBasket = { exports: {} };
const preferenceModule = { exports: {} };
new Function("exports", ts.transpileModule(readFileSync(resolve(projectRoot, "lib/commerce/product-preferences.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(preferenceModule.exports);
new Function("require", "exports", compiled.outputText)((name) => name === "./product-preferences" ? preferenceModule.exports : require(name), requestBasket.exports);

const normalizeBasketNote = requestBasket.exports.normalizeBasketNote ?? (() => undefined);
const getRequestItemReviewNote = requestBasket.exports.getRequestItemReviewNote ?? (() => undefined);
const parseRequestItems = requestBasket.exports.parseRequestItems ?? (() => undefined);
const updateRequestItemNote = requestBasket.exports.updateRequestItemNote ?? (() => undefined);
const buildInquiryMessage = requestBasket.exports.buildInquiryMessage ?? (() => undefined);

test("basket notes normalize line endings and trim only at submission time", () => {
  assert.equal(normalizeBasketNote("  درباره‌ی قاب\r\nسنگ آبی  "), "درباره‌ی قاب\nسنگ آبی");
});

test("the request review shows the same normalized note that will be submitted", () => {
  assert.equal(getRequestItemReviewNote("  درباره‌ی قاب\r\nسنگ آبی  "), "درباره‌ی قاب\nسنگ آبی");
  assert.equal(getRequestItemReviewNote("  \r\n  "), null);
});

test("basket parser preserves valid item notes and rejects malformed entries", () => {
  assert.deepEqual(parseRequestItems([
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, note: "یادداشت" },
    { slug: "bad", name: "قطعه", category: "قطعه", quantity: 21, note: "نادیده" },
    null,
  ]), [
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, note: "یادداشت" },
  ]);
});

test("editing one note leaves other items and quantities unchanged", () => {
  const items = [
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 2 },
    { slug: "pin", name: "سنجاق", category: "سنجاق", quantity: 1, note: "قبلی" },
  ];
  assert.deepEqual(updateRequestItemNote(items, "ring", "برای بررسی فرم رکاب"), [
    { ...items[0], note: "برای بررسی فرم رکاب" },
    items[1],
  ]);
});

test("clearing a note removes only that item's optional note", () => {
  const items = [
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, note: "نکته" },
    { slug: "pin", name: "سنجاق", category: "سنجاق", quantity: 1 },
  ];
  assert.deepEqual(updateRequestItemNote(items, "ring", ""), [
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1 },
    items[1],
  ]);
});

test("inquiry message keeps each note attached to its product", () => {
  assert.deepEqual(buildInquiryMessage("لطفاً قیمت را بررسی کنید", [
    { slug: "ring", name: "انگشتر لاجورد شب", category: "انگشتر", quantity: 1, note: "رنگ سنگ برایم مهم است" },
    { slug: "pin", name: "سنجاق سپید", category: "سنجاق", quantity: 1, note: "  " },
  ]), {
    success: true,
    value: "لطفاً قیمت را بررسی کنید\n\nیادداشت برای بررسی هر قطعه:\n- انگشتر لاجورد شب: رنگ سنگ برایم مهم است",
  });
});

test("inquiry notes cannot exceed the existing API message limit", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    slug: `piece-${index}`,
    name: `قطعه ${index}`,
    category: "قطعه",
    quantity: 1,
    note: "ا".repeat(320),
  }));
  const result = buildInquiryMessage("درخواست بررسی", items);
  assert.deepEqual(result, {
    success: false,
    error: "متن درخواست و یادداشت‌ها بیش از اندازه طولانی است؛ یادداشت‌ها را کوتاه‌تر کنید.",
  });
});

test("a single note over the field limit is rejected", () => {
  const result = buildInquiryMessage("درخواست بررسی", [
    { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, note: "ا".repeat(321) },
  ]);
  assert.deepEqual(result, {
    success: false,
    error: "یادداشت هر قطعه نباید بیشتر از ۳۲۰ نویسه باشد.",
  });
});
