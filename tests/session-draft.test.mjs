import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/session-draft.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const sessionDraftModule = { exports: {} };
new Function("exports", compiled.outputText)(sessionDraftModule.exports);
const { readSessionDraft, saveSessionDraft, removeSessionDraft, shareSessionDraftWithNextTab, consumeCrossTabDraft } = sessionDraftModule.exports;

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("legacy personal draft migrates into this tab and is removed from persistent storage", () => {
  const session = memoryStorage();
  const persistent = memoryStorage({ draft: "نام و راه تماس" });

  assert.equal(readSessionDraft(session, persistent, "draft"), "نام و راه تماس");
  assert.equal(session.getItem("draft"), "نام و راه تماس");
  assert.equal(persistent.getItem("draft"), null);
});

test("a tab draft takes precedence and clears any older persistent copy", () => {
  const session = memoryStorage({ draft: "پیش‌نویس همین زبانه" });
  const persistent = memoryStorage({ draft: "پیش‌نویس قدیمی" });

  assert.equal(readSessionDraft(session, persistent, "draft"), "پیش‌نویس همین زبانه");
  assert.equal(persistent.getItem("draft"), null);
});

test("saving and removing a draft only affects the active tab and clears a legacy copy", () => {
  const session = memoryStorage();
  const persistent = memoryStorage({ draft: "نسخهٔ قدیمی" });

  assert.equal(saveSessionDraft(session, "draft", "پیش‌نویس تازه"), true);
  assert.equal(session.getItem("draft"), "پیش‌نویس تازه");
  removeSessionDraft(session, persistent, "draft");
  assert.equal(session.getItem("draft"), null);
  assert.equal(persistent.getItem("draft"), null);
});

test("an explicit sign-in handoff makes only its own draft available to the callback tab", () => {
  const session = memoryStorage({ draft: JSON.stringify({ name: "یاس", message: "طرح" }) });
  const persistent = memoryStorage();

  assert.equal(shareSessionDraftWithNextTab(session, persistent, "draft", "handoff:tab-a", 1_800_000), true);
  assert.equal(persistent.getItem("handoff:tab-a"), JSON.stringify({ name: "یاس", message: "طرح", crossTabExpiresAt: 1_800_000 }));
  assert.equal(persistent.getItem("handoff:tab-b"), null);

  const callbackTab = memoryStorage();
  assert.equal(consumeCrossTabDraft(callbackTab, persistent, "handoff:tab-a", "draft", 1_000), JSON.stringify({ name: "یاس", message: "طرح" }));
  assert.equal(callbackTab.getItem("draft"), JSON.stringify({ name: "یاس", message: "طرح" }));
  assert.equal(persistent.getItem("handoff:tab-a"), null);
});

test("sign-in handoff preserves the complete inquiry context without copying the file itself", () => {
  const draft = {
    name: "یاس",
    contact: "yas@example.test",
    items: [
      { slug: "lajvard-shab-ring", name: "انگشتر نقره «لاجورد شب»", category: "انگشتر", quantity: 2, note: "قاب ظریف‌تر بررسی شود" },
      { slug: "silent-vase-pin", name: "سنجاق سینه نقره «گلدان خاموش»", category: "سنجاق سینه", quantity: 1 },
    ],
    ringDesign: { base: "پایه", shape: "بیضی", color: "لاجوردی", ornament: "خط پیوسته" },
    fileNeedsReselection: true,
  };
  const session = memoryStorage({ draft: JSON.stringify(draft) });
  const persistent = memoryStorage();

  assert.equal(shareSessionDraftWithNextTab(session, persistent, "draft", "handoff:tab-a", 1_800_000), true);
  const callbackTab = memoryStorage();
  const restored = consumeCrossTabDraft(callbackTab, persistent, "handoff:tab-a", "draft", 1_000);

  assert.deepEqual(JSON.parse(restored), draft);
  assert.equal(persistent.getItem("handoff:tab-a"), null);
});

test("an expired cross-tab handoff is discarded instead of restoring personal draft data", () => {
  const session = memoryStorage();
  const persistent = memoryStorage({ "handoff:tab-a": JSON.stringify({ contact: "yas@example.test", crossTabExpiresAt: 1_000 }) });

  assert.equal(consumeCrossTabDraft(session, persistent, "handoff:tab-a", "draft", 1_001), null);
  assert.equal(session.getItem("draft"), null);
  assert.equal(persistent.getItem("handoff:tab-a"), null);
});
