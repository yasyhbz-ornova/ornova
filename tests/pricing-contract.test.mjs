import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const api = loadTs("lib/pricing/contract.ts");
export const cost = {
  schema_version: 1, request_id: "48a422dd-a532-4a8d-bb65-49b1a97550ee", method: "cost-plus", policy_version: "synthetic-v1",
  input: { true_cost_rial: "1000000", mandatory_buffer_rial: "100000", profit_method: "markup", profit_bp: 2500, rounding: "none", rounding_step_rial: "0", tax_bp: 900, override_pre_tax_rial: null, override_reason: null },
};
export const gram = {
  ...cost, method: "gram-sale",
  input: { weight_mg: "1500", rate_per_gram_rial: "1000000", under_2g_fee_rial: "4000000", under_4g_fee_rial: "2500000", stone_total_rial: "200000", stone_count: 2, setting_per_stone_rial: "100000", packaging_rial: "1500000", logistics_rial: "0", design_rial: "500000" },
};

test("pricing accepts explicit discriminated inputs without converting int64 money", () => {
  assert.equal(api.parsePricingRequest(cost).success, true);
  assert.equal(api.parsePricingRequest(gram).success, true);
  const large = structuredClone(cost); large.input.true_cost_rial = "9007199254740993";
  assert.equal(api.parsePricingRequest(large).data.input.true_cost_rial, "9007199254740993");
});
test("pricing rejects unknown fields, invalid enums, missing fees and loose/numeric money", () => {
  for (const mutation of [
    x => x.customer_id = "other", x => x.input.internal = 1, x => x.method = "live-rate",
    x => x.input.rounding = "mystery", x => x.input.true_cost_rial = 1000,
    x => x.input.true_cost_rial = "01", x => x.input.true_cost_rial = "۹۰۰",
    x => x.input.true_cost_rial = "9223372036854775808", x => x.input.true_cost_rial = "0",
    x => x.input.profit_bp = 2147483647, x => x.input.tax_bp = -1,
    x => { x.input.profit_method = "margin"; x.input.profit_bp = 10000; },
    x => { x.input.rounding = "up"; x.input.rounding_step_rial = "0"; },
    x => x.request_id = "not-uuid", x => x.policy_version = "",
  ]) {
    const value = structuredClone(cost); mutation(value);
    assert.equal(api.parsePricingRequest(value).success, false, JSON.stringify(value));
  }
  const missing = structuredClone(gram); delete missing.input.packaging_rial;
  assert.equal(api.parsePricingRequest(missing).success, false);
});
test("response requires method-specific fields, fixed algorithm and full request correlation", () => {
  const response = { ...cost, algorithm_version: "pcs-standard-48c17189-v1", result: { cost_floor_rial: "1100000", target_rial: "1250000", pre_tax_rial: "1250000", tax_rial: "112500", total_rial: "1362500", effective_margin_bp: 2000, warnings: [] } };
  assert.equal(api.parsePricingResponse(response, cost).success, true);
  for (const mutation of [x => x.algorithm_version = "other", x => x.request_id = gram.request_id.replace("48a4", "58a4"), x => x.input.tax_bp = 0, x => x.result.total_rial = 1362500, x => x.result.trace = "private", x => x.result.warnings = ["unexpected"]]) {
    const value = structuredClone(response); mutation(value);
    assert.equal(api.parsePricingResponse(value, cost).success, false);
  }
});
