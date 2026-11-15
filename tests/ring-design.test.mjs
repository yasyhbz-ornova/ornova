import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/ring-design.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const ringDesignModule = { exports: {} };
new Function("exports", compiled.outputText)(ringDesignModule.exports);
const { parseRingDesignDraft } = ringDesignModule.exports;
const draftOptions = {
  shapes: ["گرد", "بیضی", "اشکی"],
  colors: [["لاجوردی", "bg-stone-lapis"], ["سفید شفاف", "bg-stone-clear"]],
  details: ["بدون جزئیات افزوده", "خط پیوسته"],
};

test("ring draft restores only current builder choices and derives color data from the catalog", () => {
  assert.deepEqual(parseRingDesignDraft(JSON.stringify({ base: "پهن", shape: "اشکی", color: "لاجوردی", colorClass: "bg-red-500", ornament: "خط پیوسته", ringSizeEu: "۵۴" }), draftOptions), {
    base: "پهن", shape: "اشکی", color: "لاجوردی", colorClass: "bg-stone-lapis", ornament: "خط پیوسته", ringSizeEu: "۵۴",
  });
});

test("malformed or out-of-catalog ring drafts are rejected", () => {
  for (const draft of ["{", null, {}, { base: "پهن", shape: "اشکی", color: "لاجوردی", ornament: "نامعتبر" }, { base: "پهن", shape: "اشکی", color: "لاجوردی", ornament: "خط پیوسته", ringSizeEu: "۵4<script>" }]) {
    assert.equal(parseRingDesignDraft(draft, draftOptions), null);
  }
});
