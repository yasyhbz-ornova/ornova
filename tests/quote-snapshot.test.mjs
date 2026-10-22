import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
function load(path) {
  const file = new URL(`../${path}`, import.meta.url), loaded = { exports: {} };
  if (existsSync(file)) new Function("require", "exports", ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)((name) => name.startsWith("./") ? load(`lib/commerce/${name.slice(2)}.ts`) : require(name), loaded.exports);
  return loaded.exports;
}
const snapshot = load("lib/commerce/quote-snapshot.ts"), money = load("lib/commerce/quote-money.ts");
const input = (patch = {}) => ({ version: 1, source_quote_no: " Q-TEST ", source_order_no: "ORD-TEST", source_revision: 1, issued_at: "2026-10-22T10:30:00+03:30", valid_until: "2026-10-23T10:30:00+03:30", lines: [{ description: " نمونهٔ آزمایشی ", quantity: 2, amount_rial: "10000000" }], discount_rial: "1000000", tax_rial: "900000", total_rial: "9900000", ...patch });

test("quote contract preserves source line total without multiplying quantity again", () => {
  assert.equal(typeof snapshot.parseQuoteSnapshot, "function");
  const parsed = snapshot.parseQuoteSnapshot(input());
  assert.equal(parsed.success, true);
  assert.equal(parsed.value.total_rial, "9900000");
  assert.equal(parsed.value.lines[0].amount_rial, "10000000");
  assert.equal(parsed.value.source_quote_no, "Q-TEST");
  assert.equal(parsed.value.lines[0].description, "نمونهٔ آزمایشی");
  assert.equal(parsed.value.issued_at, "2026-10-22T07:00:00.000Z");
  assert.equal(Object.hasOwn(parsed.value, "owner_id"), false);
});

test("unknown private fields, version changes and malformed nested objects fail closed", () => {
  assert.equal(typeof snapshot.parseQuoteSnapshot, "function");
  for (const bad of [null, [], {}, input({ version: 2 }), input({ owner_id: "forged" }), input({ true_cost_rial: "100" }), input({ source_key: "forged" }), input({ lines: [{ ...input().lines[0], profit: 9 }] }), input({ lines: [null] }), input({ source_quote_no: "<b>TEST</b>" }), input({ source_order_no: "javascript:alert(1)" })]) assert.equal(snapshot.parseQuoteSnapshot(bad).success, false, JSON.stringify(bad));
});

test("quote enforces row, quantity, revision and bounded text contracts", () => {
  assert.equal(typeof snapshot.parseQuoteSnapshot, "function");
  const row = input().lines[0];
  for (const bad of [input({ source_revision: 0 }), input({ source_revision: 10001 }), input({ source_revision: 1.5 }), input({ source_revision: "1" }), input({ source_quote_no: " " }), input({ source_order_no: "ا".repeat(81) }), input({ lines: [] }), input({ lines: Array(51).fill(row) }), ...[0, 1001, 1.2, "2", null].map(quantity => input({ lines: [{ ...row, quantity }] })), input({ lines: [{ ...row, description: "ا".repeat(241) }] })]) assert.equal(snapshot.parseQuoteSnapshot(bad).success, false);
  assert.equal(snapshot.parseQuoteSnapshot(input({ source_revision: 10000, source_order_no: "ا".repeat(80), lines: [{ ...row, description: "ا".repeat(240), quantity: 1000 }] })).success, true);
});

test("integer rial bounds, exact totals, discounts and sum overflow cannot silently change amounts", () => {
  assert.equal(typeof snapshot.parseQuoteSnapshot, "function");
  const row = input().lines[0];
  for (const amount of [-1, 10000000, "-1", "1.5", "1e7", "", "01", "۱۰۰", "9223372036854775808"]) assert.equal(snapshot.parseQuoteSnapshot(input({ lines: [{ ...row, amount_rial: amount }] })).success, false);
  for (const patch of [{ total_rial: "9900001" }, { discount_rial: "10000001" }, { tax_rial: "-1" }, { discount_rial: "10000000", tax_rial: "0", total_rial: "0" }, { lines: [{ ...row, amount_rial: "9223372036854775807" }, { ...row, amount_rial: "1" }], discount_rial: "1", tax_rial: "0", total_rial: "9223372036854775807" }]) assert.equal(snapshot.parseQuoteSnapshot(input(patch)).success, false);
  assert.equal(snapshot.parseQuoteSnapshot(input({ lines: [{ ...row, amount_rial: "9223372036854775807" }], discount_rial: "0", tax_rial: "0", total_rial: "9223372036854775807" })).success, true);
});

test("dates require valid calendar/timezone and increasing validity, freshness remains separate", () => {
  assert.equal(typeof snapshot.parseQuoteSnapshot, "function");
  for (const date of ["2026-02-30T00:00:00Z", "2026-10-22T10:30:00", "2026-13-01T00:00:00Z", "2026-10-22T24:01:00Z", "2026-10-22T10:30:00+25:00", "not-a-date"]) assert.equal(snapshot.parseQuoteSnapshot(input({ issued_at: date })).success, false, date);
  assert.equal(snapshot.parseQuoteSnapshot(input({ valid_until: input().issued_at })).success, false);
  const parsed = snapshot.parseQuoteSnapshot(input());
  assert.equal(typeof snapshot.validateQuoteDates, "function");
  assert.equal(snapshot.validateQuoteDates(parsed.value, new Date("2026-10-22T08:00:00Z")), true);
  assert.equal(snapshot.validateQuoteDates(parsed.value, new Date("2026-10-22T06:59:59Z")), false);
  assert.equal(snapshot.validateQuoteDates(parsed.value, new Date("2026-10-23T07:00:00Z")), false);
  assert.equal(snapshot.validateQuoteDates(parsed.value, new Date("invalid")), false);
});

test("localized amount input accepts only unambiguous grouping and integer digits", () => {
  assert.equal(typeof money.parseRialInput, "function");
  for (const [value, want] of [["۱٬۲۳۴٬۵۶۷", "1234567"], ["١٢٣٤", "1234"], [" 1,234 ", "1234"], ["۰۰۰", "0"], ["9223372036854775807", "9223372036854775807"]]) assert.equal(money.parseRialInput(value), want);
  for (const bad of ["", "1,2", "12,34,567", "1 234", "1e3", "1.0", "۱٫۵", "-1", "100 تومان", "9223372036854775808"]) assert.equal(money.parseRialInput(bad), null, bad);
});

test("toman display preserves fractional rial and large integers exactly", () => {
  assert.equal(typeof money.formatRialAsToman, "function");
  for (const [value, want] of [["0", "۰ تومان"], ["15", "۱٫۵ تومان"], ["9900000", "۹۹۰٬۰۰۰ تومان"], ["9007199254740993", "۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۳ تومان"], ["9223372036854775807", "۹۲۲٬۳۳۷٬۲۰۳٬۶۸۵٬۴۷۷٬۵۸۰٫۷ تومان"]]) assert.equal(money.formatRialAsToman(value), want);
  assert.throws(() => money.formatRialAsToman("not-money"));
});
