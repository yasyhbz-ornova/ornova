import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
const loaded = { exports: {} };
new Function("exports", ts.transpileModule(readFileSync(new URL("../lib/auth/inputs.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded.exports);

test("local sign-in callback preserves the active draft origin instead of a stale configured development port", () => {
  assert.equal(typeof loaded.exports.buildAuthCallbackUrl, "function", "callback origin behavior is missing");
  const result = loaded.exports.buildAuthCallbackUrl("http://localhost:3058", "http://localhost:3000", "/custom-design?draft=f228f201-fcec-40f0-b00a-02cfdb442381");
  assert.equal(result, "http://localhost:3058/auth/callback?next=%2Fcustom-design%3Fdraft%3Df228f201-fcec-40f0-b00a-02cfdb442381");
  assert.equal(loaded.exports.buildAuthCallbackUrl("https://www.ornova.ir", "https://ornova.ir", "//evil.example"), "https://ornova.ir/auth/callback?next=%2Faccount");
});
