import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = resolve(projectRoot, "lib/account/inquiry-contact.ts");
const helpers = { exports: {} };

if (existsSync(helperPath)) {
  const source = readFileSync(helperPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function("exports", compiled.outputText)(helpers.exports);
}

const { getInquiryContactDefaults } = helpers.exports;

test("inquiry defaults prefer the customer's profile name and verified auth contact", () => {
  assert.equal(typeof getInquiryContactDefaults, "function", "inquiry contact defaults must be implemented");
  assert.deepEqual(getInquiryContactDefaults(
    { display_name: "  یاس  ", phone: "09120000000" },
    { phone: "+989121234567", email: "yas@example.com", user_metadata: { full_name: "Other Name" } },
  ), { name: "یاس", contact: "+989121234567" });
});

test("inquiry defaults fall back to provider metadata, profile phone, and email safely", () => {
  assert.equal(typeof getInquiryContactDefaults, "function", "inquiry contact defaults must be implemented");
  assert.deepEqual(getInquiryContactDefaults(
    { display_name: null, phone: "  09120000000 " },
    { phone: null, email: " yas@example.com ", user_metadata: { full_name: "  Yas  " } },
  ), { name: "Yas", contact: "09120000000" });
  assert.deepEqual(getInquiryContactDefaults(null, { email: "yas@example.com", user_metadata: { name: "Yas" } }), {
    name: "Yas",
    contact: "yas@example.com",
  });
});

test("empty or malformed account values never become prefilled personal data", () => {
  assert.equal(typeof getInquiryContactDefaults, "function", "inquiry contact defaults must be implemented");
  assert.deepEqual(getInquiryContactDefaults(
    { display_name: "   ", phone: 123 },
    { phone: " ", email: null, user_metadata: { full_name: 123, name: " " } },
  ), { name: "", contact: "" });
});
