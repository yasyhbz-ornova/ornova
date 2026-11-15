import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "lib/auth/authorization.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const authorization = { exports: {} };
new Function("exports", compiled.outputText)(authorization.exports);

test("staff access requires the trusted app_metadata claim", () => {
  assert.equal(authorization.exports.isOrnovaStaff({ app_metadata: { ornova_role: "staff" } }), true);
  assert.equal(authorization.exports.isOrnovaStaff({ user_metadata: { ornova_role: "staff" } }), false);
  assert.equal(authorization.exports.isOrnovaStaff(null), false);
});

test("same-origin state-changing requests are accepted", () => {
  const request = new Request("https://ornova.ir/api/inquiries", {
    method: "POST",
    headers: { origin: "https://ornova.ir" },
  });
  assert.equal(authorization.exports.isSameOriginRequest(request), true);
});

test("cross-origin state-changing requests are rejected", () => {
  const request = new Request("https://ornova.ir/api/inquiries", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(authorization.exports.isSameOriginRequest(request), false);
});

test("state-changing requests without an Origin header are rejected", () => {
  const request = new Request("https://ornova.ir/api/inquiries", { method: "POST" });
  assert.equal(authorization.exports.isSameOriginRequest(request), false);
});
