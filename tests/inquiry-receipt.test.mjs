import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/inquiry-receipt.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const receiptModule = { exports: {} };
new Function("exports", compiled.outputText)(receiptModule.exports);
const createInquiryReceipt = receiptModule.exports.createInquiryReceipt ?? (() => null);

test("a successful response returns the exact submitted product summary", () => {
  assert.deepEqual(createInquiryReceipt(
    { id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7" },
    [
      { slug: "lajvard-shab-ring", name: "انگشتر نقره «لاجورد شب»", category: "انگشتر", quantity: 2, note: "اندازه مهم است" },
    ],
  ), {
    id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7",
    items: [{ slug: "lajvard-shab-ring", name: "انگشتر نقره «لاجورد شب»", quantity: 2, note: "اندازه مهم است" }],
  });
});

test("receipt preserves the normalized note for each item and omits blank notes", () => {
  assert.deepEqual(createInquiryReceipt(
    { id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7" },
    [
      { slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1, note: "  نکته‌ی اول\r\nنکته‌ی دوم  " },
      { slug: "pin", name: "سنجاق", category: "سنجاق", quantity: 1, note: "  " },
    ],
  ), {
    id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7",
    items: [
      { slug: "ring", name: "انگشتر", quantity: 1, note: "نکته‌ی اول\nنکته‌ی دوم" },
      { slug: "pin", name: "سنجاق", quantity: 1 },
    ],
  });
});

test("invalid or missing inquiry IDs do not produce a false receipt", () => {
  const items = [{ slug: "ring", name: "انگشتر", category: "انگشتر", quantity: 1 }];
  assert.equal(createInquiryReceipt({}, items), null);
  assert.equal(createInquiryReceipt({ id: "not-an-id" }, items), null);
});

test("a valid custom-design request can produce a receipt without catalog items", () => {
  assert.deepEqual(createInquiryReceipt(
    { id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7" },
    [],
  ), {
    id: "d79e8b3d-8e14-4f3a-9ad4-32bdbf8c64f7",
    items: [],
  });
});
