import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "lib/auth/inputs.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const authInputs = { exports: {} };
new Function("exports", compiled.outputText)(authInputs.exports);
const { safeInternalPath, buildAuthErrorRedirectPath, getAuthCallbackErrorMessage } = authInputs.exports;

test("encoded dot segments cannot turn a safe internal redirect into an external host", () => {
  const nextPath = safeInternalPath("/%2e%2e//evil.example");
  assert.equal(nextPath, "/account");
  assert.equal(new URL(nextPath, "https://ornova.ir").origin, "https://ornova.ir");
});

test("protocol-relative and absolute external redirects use the fallback", () => {
  assert.equal(safeInternalPath("//evil.example/path"), "/account");
  assert.equal(safeInternalPath("https://evil.example/path"), "/account");
});

test("valid internal paths retain their query and fragment", () => {
  assert.equal(safeInternalPath("/account/orders?tab=open#latest"), "/account/orders?tab=open#latest");
});

test("auth callback errors preserve the safe inquiry destination and its query", () => {
  const errorPath = buildAuthErrorRedirectPath(
    "auth_callback",
    "/contact?product=lajvard-shab-ring&intent=price",
  );
  const parsed = new URL(errorPath, "https://ornova.ir");

  assert.equal(parsed.pathname, "/login");
  assert.equal(parsed.searchParams.get("error"), "auth_callback");
  assert.equal(parsed.searchParams.get("next"), "/contact?product=lajvard-shab-ring&intent=price");
});

test("auth callback errors never preserve an external redirect", () => {
  const errorPath = buildAuthErrorRedirectPath("missing_code", "https://evil.example/");
  const parsed = new URL(errorPath, "https://ornova.ir");

  assert.equal(parsed.searchParams.get("next"), "/account");
  assert.equal(new URL(parsed.searchParams.get("next"), "https://ornova.ir").origin, "https://ornova.ir");
});

test("known auth callback errors map to clear Persian messages and unknown codes stay hidden", () => {
  for (const code of ["missing_code", "auth_callback", "auth_unavailable"]) {
    assert.equal(typeof getAuthCallbackErrorMessage(code), "string");
  }
  assert.equal(getAuthCallbackErrorMessage("unexpected"), null);
  assert.equal(getAuthCallbackErrorMessage(null), null);
});
