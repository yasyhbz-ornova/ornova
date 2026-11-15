import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const path = new URL("../lib/studio/conversation.ts", import.meta.url);
const compiled = ts.transpileModule(existsSync(path) ? readFileSync(path, "utf8") : "", { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function("exports", compiled.outputText)(loaded.exports);
const c = loaded.exports;
const id = "f228f201-fcec-40f0-b00a-02cfdb442381";

test("studio collects bounded answers and builds only the customer's selected brief", () => {
  assert.equal(typeof c.buildStudioBrief, "function", "studio brief behavior is missing");
  assert.equal(c.buildStudioBrief(["انگشتر", "فرم برگ", "نقره با سنگ آبی", "سایز ۵۴"]), "نوع قطعه: انگشتر\nایده و فرم: فرم برگ\nجنس و سنگ دلخواه: نقره با سنگ آبی\nاندازه و جزئیات: سایز ۵۴");
  assert.equal(c.buildStudioBrief(["انگشتر"]), null);
  assert.equal(c.buildStudioBrief(["انگشتر", "x".repeat(451)]), null);
  assert.equal(c.buildStudioBrief(["انگشتر", "برگ", "نقره", "۵۴", "اضافی"]), null);
});

test("studio draft round-trip is explicit, expires and never restores another account's idea", () => {
  assert.equal(typeof c.parseStudioDraft, "function", "studio draft protection is missing");
  const draft = { version: 1, id, ownerId: null, expiresAt: 10000, answers: ["انگشتر", "برگ"], input: "آبی" };
  assert.deepEqual(c.parseStudioDraft(JSON.stringify(draft), id, null, 500), draft);
  assert.equal(c.parseStudioDraft(JSON.stringify(draft), id, null, 10001), null);
  assert.equal(c.parseStudioDraft(JSON.stringify({ ...draft, ownerId: "user-a" }), id, "user-b", 500), null);
  assert.equal(c.parseStudioDraft(JSON.stringify({ ...draft, ownerId: "user-a" }), id, null, 500), null);
  assert.equal(c.parseStudioDraft(JSON.stringify({ ...draft, ownerId: "user-a" }), id, "user-a", 500)?.input, "آبی");
  for (const raw of ["{", JSON.stringify({ ...draft, id: "../bad" }), JSON.stringify({ ...draft, answers: [42] }), JSON.stringify({ ...draft, input: "x".repeat(451) }), JSON.stringify({ ...draft, version: 9 })]) {
    assert.equal(c.parseStudioDraft(raw, id, null, 500), null);
  }
});

test("login continuation has only a validated draft ID, never customer text or an external return URL", () => {
  assert.equal(typeof c.studioLoginPath, "function", "studio login continuation is missing");
  assert.equal(c.studioLoginPath(id), "/login?next=%2Fcustom-design%3Fdraft%3Df228f201-fcec-40f0-b00a-02cfdb442381");
  assert.throws(() => c.studioLoginPath("//evil.example"));
});
