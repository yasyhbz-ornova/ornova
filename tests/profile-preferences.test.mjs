import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "lib/account/profile-preferences.ts");
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const profilePreferences = { exports: {} };
new Function("exports", compiled.outputText)(profilePreferences.exports);
const parseDesignNote = profilePreferences.exports.parseDesignNote ?? (() => undefined);

test("design notes are trimmed and line endings are normalized", () => {
  assert.deepEqual(parseDesignNote("  فرم‌های ساده\r\nو سنگ آبی  "), {
    success: true,
    value: "فرم‌های ساده\nو سنگ آبی",
  });
});

test("an empty design note clears the saved preference", () => {
  assert.deepEqual(parseDesignNote(" \n "), { success: true, value: null });
});

test("design notes longer than 500 characters are rejected", () => {
  assert.deepEqual(parseDesignNote("الف".repeat(501)), {
    success: false,
    message: "یادداشت سلیقه نباید بیشتر از ۵۰۰ نویسه باشد.",
  });
});

test("non-text form values are rejected", () => {
  assert.deepEqual(parseDesignNote(new File(["text"], "note.txt")), {
    success: false,
    message: "یادداشت سلیقه را به‌صورت متن وارد کنید.",
  });
});
