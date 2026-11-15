import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const api = loadTs("lib/pricing/records.ts");
const inquiry = "a1111111-abcd-4111-8111-a11111111111";
const request = { schema_version: 1, request_id: "48a422dd-a532-4a8d-bb65-49b1a97550ee", method: "cost-plus", policy_version: "synthetic-v1", input: { true_cost_rial: "9007199254740993", mandatory_buffer_rial: "0", profit_method: "markup", profit_bp: 0, rounding: "none", rounding_step_rial: "0", tax_bp: 0, override_pre_tax_rial: null, override_reason: null } };
function record() { return { id: "22222222-2222-4222-8222-222222222222", inquiry_id: inquiry, revision: 1, source_key: "fixture", created_at: "2026-10-23T10:00:00.123456+00:00", created_by: "33333333-3333-4333-8333-333333333333", snapshot: { ...structuredClone(request), algorithm_version: "pcs-standard-48c17189-v1", result: { cost_floor_rial: "9007199254740993", target_rial: "9007199254740993", pre_tax_rial: "9007199254740993", tax_rial: "0", total_rial: "9007199254740993", effective_margin_bp: 0, warnings: ["MANDATORY_BUFFER_ZERO"] } } }; }
test("stored record preserves exact frozen result and accepts native PostgreSQL timestamps", () => {
  const parsed = api.parseCalculationRecord(record(), inquiry);
  assert.equal(parsed.success, true); assert.equal(parsed.data.snapshot.result.total_rial, "9007199254740993");
  assert.equal(api.calculationMatches(parsed.data, request, "fixture"), true);
});
test("inquiry identity accepts uppercase UUID spelling returned lowercase by PostgreSQL", () => {
  assert.equal(api.parseCalculationRecord(record(), inquiry.toUpperCase()).success, true);
});
test("record reader rejects swapped inquiry, unknown metadata, malformed methods and totals", () => {
  for (const change of [r => r.inquiry_id = r.id, r => r.owner_id = inquiry, r => r.revision = 0, r => r.created_at = "yesterday", r => r.snapshot.input.hidden = "private", r => r.snapshot.result.total_rial = "1", r => r.snapshot.algorithm_version = "unknown", r => r.snapshot.result.total_rial = 9007199254740993]) {
    const value = record(); change(value); assert.equal(api.parseCalculationRecord(value, inquiry).success, false);
  }
});
test("idempotent match includes method, policy, input and configured source identity", () => {
  const value = record();
  assert.equal(api.calculationMatches(value, { ...request, policy_version: "other" }, "fixture"), false);
  assert.equal(api.calculationMatches(value, request, "other-source"), false);
  const changed = structuredClone(request); changed.input.tax_bp = 1;
  assert.equal(api.calculationMatches(value, changed, "fixture"), false);
});
test("record errors map safely without exposing DB diagnostics", () => {
  for (const [message, status] of [["CALC_CONFLICT",409],["CALC_CLOSED",409],["CALC_NOT_FOUND",404],["CALC_FORBIDDEN",403],["CALC_INVALID",400],["private password and table path",503]]) assert.equal(api.pricingRecordStatus({ message }), status);
});
