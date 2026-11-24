import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "components/commerce/InquiryForm.tsx"), "utf8");
const requiredExpression = source.match(/<textarea required=\{([^}]+)\}[^>]*name="message"/);

test("message is optional for price and custom-design requests but required for questions and general inquiries", () => {
  assert.ok(requiredExpression, "the inquiry message field must declare its validation rule");
  const isRequired = new Function("intent", "effectiveSourceContext", "archiveOrder", `return (${requiredExpression[1]});`);

  assert.equal(isRequired("price", undefined), false);
  assert.equal(isRequired(undefined, "custom-design"), false);
  assert.equal(isRequired(undefined, "ring-builder"), false);
  assert.equal(isRequired("question", undefined), true);
  assert.equal(isRequired(undefined, undefined), true);
  assert.equal(isRequired(undefined, undefined, { number: "08" }), false);
});
