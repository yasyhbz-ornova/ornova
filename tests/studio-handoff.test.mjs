import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
function load(path, deps = {}) {
  const file = new URL(`../${path}`, import.meta.url), loaded = { exports: {} };
  const source = existsSync(file) ? readFileSync(file, "utf8") : "";
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)((name) => deps[name] ?? require(name), loaded.exports);
  return loaded.exports;
}
const conversation = load("lib/studio/conversation.ts");
const handoff = load("lib/studio/inquiry-handoff.ts", { "./conversation": conversation });
const answers = ["گوشواره", "فرم یک برگ باریک", "نقره، بدون سنگ", "اندازه بعداً"];
const noLegacy = { getItem: () => null };
test("explicit studio handoff carries only the reviewed brief in this tab's inquiry draft", () => {
  assert.equal(typeof handoff.transferStudioInquiry, "function");
  const writes = [];
  const result = handoff.transferStudioInquiry(answers, { getItem: () => null, setItem: (...args) => writes.push(args) }, noLegacy);
  assert.equal(result.success, true); assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "ornova-inquiry-draft");
  const draft = JSON.parse(writes[0][1]);
  assert.equal(draft.message, conversation.buildStudioBrief(answers)); assert.equal(draft.sourceContext, "custom-design");
  assert.deepEqual(Object.keys(draft).sort(), ["message", "sourceContext"]);
});
test("existing, uncertain or unreadable drafts are never overwritten by a new idea", () => {
  assert.equal(typeof handoff.transferStudioInquiry, "function");
  for (const value of ["", "{}", '{"message":"متن قبلی"}', '{"submissionUncertain":true}', "corrupt"] ) {
    const writes = [];
    assert.equal(handoff.transferStudioInquiry(answers, { getItem: () => value, setItem: (v) => writes.push(v) }, noLegacy).success, false);
    assert.equal(handoff.transferStudioInquiry(answers, { getItem: () => null, setItem: (v) => writes.push(v) }, { getItem: () => value }).success, false);
    assert.deepEqual(writes, []);
  }
  assert.equal(handoff.transferStudioInquiry(answers, { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("must not write"); } }, noLegacy).success, false);
});
test("incomplete idea and failed storage never report a successful transfer", () => {
  assert.equal(typeof handoff.transferStudioInquiry, "function");
  let writes = 0;
  assert.equal(handoff.transferStudioInquiry(answers.slice(0, 3), { getItem: () => null, setItem: () => writes++ }, noLegacy).success, false);
  assert.equal(writes, 0);
  assert.equal(handoff.transferStudioInquiry(answers, { getItem: () => null, setItem: () => { throw Error("quota"); } }, noLegacy).success, false);
});
const gateway = load("lib/ai/gateway.ts", { "server-only": {} });
const availability = load("lib/studio/availability.ts", { "server-only": {}, "@/lib/ai/gateway": gateway });
test("studio never advertises an image preview when operator configuration is incomplete", () => {
  assert.equal(typeof availability.getStudioImageMode, "function");
  const configured = { ORNOVA_AI_ENABLED: "true", ORNOVA_AI_BASE_URL: "https://synthetic.example.invalid/v1", ORNOVA_AI_API_KEY: "test-secret", ORNOVA_AI_IMAGE_MODEL: "image-model", SUPABASE_SERVICE_ROLE_KEY: "test-service" };
  assert.equal(availability.getStudioImageMode(configured), "preview");
  for (const key of Object.keys(configured)) assert.equal(availability.getStudioImageMode({ ...configured, [key]: "" }), "offline", key);
  assert.equal(availability.getStudioImageMode({ ...configured, ORNOVA_AI_BASE_URL: "http://untrusted.example.invalid" }), "offline");
  assert.equal(availability.getStudioImageMode({ ...configured, ORNOVA_AI_BASE_URL: "http://127.0.0.1:9000/v1", VERCEL: "1" }), "offline");
});
