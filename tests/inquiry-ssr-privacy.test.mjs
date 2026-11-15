import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const require = createRequire(import.meta.url);
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const { InquiryForm } = loadTs("components/commerce/InquiryForm.tsx", { "./ProductPreferencesSummary": { ProductPreferencesSummary: () => null } });
test("server-rendered inquiry cannot submit customer fields as a native GET before hydration", () => {
  const html = renderToStaticMarkup(React.createElement(InquiryForm, { requestBasketContext: true }));
  assert.match(html, /<form\b[^>]*method="post"/);
  const fields = html.match(/<(?:input|textarea)\b[^>]*>/g);
  assert.ok(fields?.length);
  for (const field of fields) assert.match(field, /\bdisabled(?:=""|\s|>)/, field);
  const submit = html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0];
  assert.ok(submit); assert.match(submit, /\bdisabled(?:=""|\s|>)/);
});
