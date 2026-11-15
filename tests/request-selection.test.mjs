import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/request-selection.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const requestSelection = { exports: {} };
new Function("exports", compiled.outputText)(requestSelection.exports);
const getInquiryItems = requestSelection.exports.getInquiryItems ?? (() => undefined);
const removeSubmittedRequestItems = requestSelection.exports.removeSubmittedRequestItems ?? (() => undefined);

const ring = { slug: "ring", name: "انگشتر نقره «لاجورد شب»", category: "انگشتر", quantity: 2, note: "سایز ۵۴" };
const pin = { slug: "pin", name: "سنجاق سینه نقره «گلدان خاموش»", category: "سنجاق سینه", quantity: 1 };

test("a product-price request contains only its product and preserves its saved quantity and note", () => {
  assert.deepEqual(getInquiryItems([ring, pin], { slug: "ring", name: ring.name, category: ring.category }), [ring]);
});

test("a direct product request adds one product when it is not already in the basket", () => {
  assert.deepEqual(getInquiryItems([pin], { slug: "ring", name: ring.name, category: ring.category }), [
    { slug: "ring", name: ring.name, category: ring.category, quantity: 1 },
  ]);
});

test("only the explicit request-basket route includes all basket selections", () => {
  assert.deepEqual(getInquiryItems([ring, pin], undefined, true), [ring, pin]);
});

test("a custom-design or ring-builder brief does not inherit unrelated basket selections", () => {
  assert.deepEqual(getInquiryItems([ring, pin]), []);
});

test("after submission, only submitted quantities are removed and unrelated selections remain", () => {
  assert.deepEqual(removeSubmittedRequestItems([ring, pin], [{ ...ring, quantity: 1 }]), [
    { ...ring, quantity: 1 },
    pin,
  ]);
});

test("submitting the whole basket removes those selections without touching later unrelated additions", () => {
  const latestBasket = [ring, { ...pin, quantity: 2 }];
  assert.deepEqual(removeSubmittedRequestItems(latestBasket, [ring, pin]), [
    { ...pin, quantity: 1 },
  ]);
});
