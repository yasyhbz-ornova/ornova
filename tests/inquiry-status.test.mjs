import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = resolve(projectRoot, "lib/commerce/inquiry-status.ts");
const helpers = { exports: {} };

if (existsSync(helperPath)) {
  const source = readFileSync(helperPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function("exports", compiled.outputText)(helpers.exports);
}

const { getInquiryStatusLabel, getInquiryStatusGuidance } = helpers.exports;

test("the proposed status is named consistently without implying that terms are visible", () => {
  assert.equal(typeof getInquiryStatusLabel, "function", "inquiry status labels must be implemented");
  assert.equal(typeof getInquiryStatusGuidance, "function", "inquiry status guidance must be implemented");
  assert.equal(getInquiryStatusLabel("quoted"), "پیشنهاد قیمت");
  const guidance = getInquiryStatusGuidance("quoted");
  assert.match(guidance, /مبلغ و شرایط/);
  assert.match(guidance, /در این صفحه نمایش داده نمی‌شود/);
  assert.match(guidance, /در پیام‌های پرونده/);
});

test("customer guidance stays actionable and does not invent quote or service terms", () => {
  assert.equal(typeof getInquiryStatusGuidance, "function", "inquiry status guidance must be implemented");
  assert.match(getInquiryStatusGuidance("needs_info"), /پاسخ را همان‌جا بفرستید/);
  const approved = getInquiryStatusGuidance("approved");
  assert.match(approved, /پیش از ادامه/);
  assert.doesNotMatch(approved, /تومان|روز کاری|ارسال رایگان/);
  assert.equal(getInquiryStatusGuidance("unknown"), null);
});

test("every persisted inquiry status has a customer-facing Persian label", () => {
  assert.equal(typeof getInquiryStatusLabel, "function", "inquiry status labels must be implemented");
  for (const status of ["received", "reviewing", "needs_info", "quoted", "approved", "closed"]) {
    assert.notEqual(getInquiryStatusLabel(status), "وضعیت ثبت‌شده");
  }
  assert.equal(getInquiryStatusLabel("unknown"), "وضعیت ثبت‌شده");
});
