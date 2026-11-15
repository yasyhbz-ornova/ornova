import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const api = loadTs("lib/pricing/form.ts");
const id = "48a422dd-a532-4a8d-bb65-49b1a97550ee";
const otherId = "58a422dd-a532-4a8d-bb65-49b1a97550ee";
function cost() {
  return { ...api.createPricingDraft(), method: "cost-plus", policy_version: "synthetic-v1", fields: {
    true_cost_rial: "۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳", mandatory_buffer_rial: "0", profit_method: "markup", profit_percent: "۱۲٫۳۴",
    rounding: "none", rounding_step_rial: "", tax_percent: "۰", override_pre_tax_rial: "", override_reason: "",
  } };
}
function gram() {
  return { ...api.createPricingDraft(), method: "gram-sale", policy_version: "synthetic-v1", fields: {
    weight_g: "۱٫۹۹۹", rate_per_gram_rial: "1000000", under_2g_fee_rial: "0", under_4g_fee_rial: "0", stone_total_rial: "0",
    stone_count: "۰", setting_per_stone_rial: "0", packaging_rial: "0", logistics_rial: "0", design_rial: "0",
  } };
}
function response(request) {
  return { ...request, algorithm_version: "pcs-standard-48c17189-v1", result: {
    cost_floor_rial: "9007199254740993", target_rial: "10118687642776032", pre_tax_rial: "10118687642776032", tax_rial: "0", total_rial: "10118687642776032", effective_margin_bp: 1098, warnings: ["MANDATORY_BUFFER_ZERO"],
  } };
}
test("empty calculator requires deliberate method and never seeds prices or fees", () => {
  const draft = api.createPricingDraft();
  assert.equal(draft.method, ""); assert.ok(Object.values(draft.fields).every(value => value === ""));
  assert.equal(api.buildPricingRequest(draft, id).success, false);
  const value = gram(); value.fields.packaging_rial = "";
  assert.equal(api.buildPricingRequest(value, id).success, false);
  value.fields.packaging_rial = "0";
  assert.equal(api.buildPricingRequest(value, id).success, true);
});
test("Persian money stays exact above JS-safe integers and percentages use basis points", () => {
  const result = api.buildPricingRequest(cost(), id);
  assert.equal(result.success, true);
  assert.deepEqual(result.request.input, { true_cost_rial: "9007199254740993", mandatory_buffer_rial: "0", profit_method: "markup", profit_bp: 1234, rounding: "none", rounding_step_rial: "0", tax_bp: 0, override_pre_tax_rial: null, override_reason: null });
});
test("gram normalization is exact, explicit zero fees remain and inactive costing never travels", () => {
  const value = gram(); value.fields.true_cost_rial = "private stale value";
  const result = api.buildPricingRequest(value, id);
  assert.equal(result.success, true); assert.equal(result.request.input.weight_mg, "1999");
  assert.equal(result.request.input.stone_count, 0); assert.equal(result.request.input.packaging_rial, "0");
  assert.ok(!("true_cost_rial" in result.request.input));
});
test("decimal precision, exponent, signed/overflow money, invalid count and fiscal choices fail closed", () => {
  for (const [key, bad] of [["weight_g", "0"], ["weight_g", "1.9999"], ["weight_g", "1e3"], ["weight_g", "9223372036854775.808"], ["stone_count", "2.1"], ["stone_count", "2147483648"], ["packaging_rial", "-1"], ["packaging_rial", "9223372036854775808"]]) {
    const value = gram(); value.fields[key] = bad; assert.equal(api.buildPricingRequest(value, id).success, false, `${key}=${bad}`);
  }
  for (const [key, bad] of [["profit_percent", "12.345"], ["profit_percent", ""], ["profit_method", "fixed"], ["rounding", ""], ["tax_percent", "100.01"], ["tax_percent", ""], ["true_cost_rial", "1.5"]]) {
    const value = cost(); value.fields[key] = bad; assert.equal(api.buildPricingRequest(value, id).success, false, `${key}=${bad}`);
  }
  const margin = cost(); Object.assign(margin.fields, { profit_method: "margin", profit_percent: "100" });
  assert.equal(api.buildPricingRequest(margin, id).success, false);
  const rounding = cost(); rounding.fields.rounding = "up";
  assert.equal(api.buildPricingRequest(rounding, id).success, false);
});
test("any edit invalidates pending/ready calculation and late replies cannot restore it", () => {
  const request = api.buildPricingRequest(cost(), id).request;
  let state = { ...api.initialPricingForm(), draft: cost() };
  state = api.pricingFormReducer(state, { type: "start", request });
  state = api.pricingFormReducer(state, { type: "edit", field: "true_cost_rial", value: "2000" });
  state = api.pricingFormReducer(state, { type: "resolve", requestId: id, value: response(request) });
  assert.equal(state.result, null); assert.equal(state.phase, "idle");
  state = api.pricingFormReducer({ ...api.initialPricingForm(), draft: cost() }, { type: "start", request });
  state = api.pricingFormReducer(state, { type: "resolve", requestId: id, value: response(request) });
  assert.equal(state.phase, "ready");
  state = api.pricingFormReducer(state, { type: "edit", field: "policy_version", value: "v2" });
  assert.equal(state.result, null);
});
test("method switch/reset invalidate result; newer pending request ignores previous failure or response", () => {
  const request = api.buildPricingRequest(cost(), id).request;
  let state = api.pricingFormReducer(api.initialPricingForm(), { type: "start", request });
  state = api.pricingFormReducer(state, { type: "edit", field: "method", value: "gram-sale" });
  assert.equal(state.request, null); assert.equal(state.draft.method, "gram-sale");
  state = api.pricingFormReducer(state, { type: "start", request: { ...request, request_id: otherId } });
  state = api.pricingFormReducer(state, { type: "failure", requestId: id, status: 503 });
  state = api.pricingFormReducer(state, { type: "resolve", requestId: id, value: response(request) });
  assert.equal(state.phase, "pending"); assert.equal(state.request.request_id, otherId);
  assert.deepEqual(api.pricingFormReducer(state, { type: "reset" }), api.initialPricingForm());
});
test("mismatched response cannot become a result and known errors have safe recovery", () => {
  const request = api.buildPricingRequest(cost(), id).request;
  const pending = api.pricingFormReducer(api.initialPricingForm(), { type: "start", request });
  const malformed = api.pricingFormReducer(pending, { type: "resolve", requestId: id, value: { ...response(request), policy_version: "other" } });
  assert.equal(malformed.phase, "error"); assert.equal(malformed.result, null);
  for (const status of [401, 403, 422, 503]) {
    const state = api.pricingFormReducer(pending, { type: "failure", requestId: id, status });
    assert.equal(state.phase, "error"); assert.ok(state.error.length > 15); assert.equal(state.result, null);
  }
});
