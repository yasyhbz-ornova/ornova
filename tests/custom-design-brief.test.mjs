import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/commerce/custom-design-brief.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const customDesignBrief = { exports: {} };
new Function("exports", compiled.outputText)(customDesignBrief.exports);
const buildCustomDesignBrief = customDesignBrief.exports.buildCustomDesignBrief ?? (() => undefined);

test("empty design preferences stay optional", () => {
  assert.deepEqual(buildCustomDesignBrief("  ", "\n"), { success: true, value: "" });
});

test("design preferences are normalized and labeled without asking for a personal story", () => {
  assert.deepEqual(buildCustomDesignBrief("  فرم نرم\r\nبا لبه‌ی باز  ", "  زنجیر  "), {
    success: true,
    value: "راهنمای طراحی اختصاصی:\n- در طرح حفظ شود: فرم نرم\nبا لبه‌ی باز\n- از این موارد پرهیز شود: زنجیر",
  });
});

test("each design preference is limited to 500 characters", () => {
  assert.deepEqual(buildCustomDesignBrief("الف".repeat(501), ""), {
    success: false,
    message: "هر بخش از راهنمای طراحی نباید بیشتر از ۵۰۰ نویسه باشد.",
  });
});

test("non-text values are rejected", () => {
  assert.deepEqual(buildCustomDesignBrief(new File(["text"], "note.txt"), ""), {
    success: false,
    message: "راهنمای طراحی را به‌صورت متن وارد کنید.",
  });
});
