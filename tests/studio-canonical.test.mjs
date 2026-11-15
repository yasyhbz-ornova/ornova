import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
const file = new URL("../lib/studio/origin.ts", import.meta.url), loaded = { exports: {} };
new Function("exports", ts.transpileModule(existsSync(file) ? readFileSync(file, "utf8") : "", { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded.exports);

test("studio starts on the canonical auth origin before a device draft is created, without redirecting local or preview hosts", () => {
  const target = loaded.exports.studioCanonicalDestination;
  assert.equal(typeof target, "function", "canonical studio handoff is missing");
  assert.equal(target("www.ornova.ir", "https://ornova.ir"), "https://ornova.ir/custom-design");
  assert.equal(target("ornova.ir", "https://www.ornova.ir"), "https://www.ornova.ir/custom-design");
  assert.equal(target("ornova.ir", "https://ornova.ir"), null);
  assert.equal(target("localhost:3058", "http://localhost:3000"), null);
  assert.equal(target("preview.vercel.app", "https://ornova.ir"), null);
  assert.equal(target("www.ornova.ir.evil.invalid", "https://ornova.ir"), null);
  assert.equal(target("www.ornova.ir", "https://user:secret@ornova.ir"), null);
});
