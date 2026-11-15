import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
import * as native from "../scripts/pricing-native-verification.mjs";

const options = { dotnet: process.env.ORNOVA_TEST_DOTNET, source: process.env.ORNOVA_TEST_PCS_SOURCE, packages: process.env.ORNOVA_TEST_PACKAGES };
const configured = Object.values(options).every(Boolean);
const base = { schema_version: 1, request_id: "48a422dd-a532-4a8d-bb65-49b1a97550ee", policy_version: "synthetic-v1" };
const cost = { ...base, method: "cost-plus", input: { true_cost_rial: "1000000", mandatory_buffer_rial: "100000", profit_method: "markup", profit_bp: 2500, rounding: "none", rounding_step_rial: "0", tax_bp: 900, override_pre_tax_rial: null, override_reason: null } };
const gram = { ...base, method: "gram-sale", input: { weight_mg: "1500", rate_per_gram_rial: "1000000", under_2g_fee_rial: "4000000", under_4g_fee_rial: "2500000", stone_total_rial: "200000", stone_count: 2, setting_per_stone_rial: "100000", packaging_rial: "1500000", logistics_rial: "0", design_rial: "500000" } };

test("native local verification requires explicit paths", () => {
  assert.equal(typeof native.withNativePricing, "function");
});
test("real native C# HTTP: both methods, precision, boundaries and connector", { skip: !configured, timeout: 120000 }, async t => {
  await native.withNativePricing(options, async ({ url, token, evidenceDirectory }) => {
    let failures = 0;
    const check = (name, operation) => t.test(name, async () => { try { await operation(); } catch (error) { failures++; throw error; } });
    const post = async (body, auth = token) => fetch(url, { method: "POST", headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
    const calculate = async value => { const response = await post(value); assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.input.true_cost_rial ?? data.input.weight_mg, value.input.true_cost_rial ?? value.input.weight_mg); return data.result; };
    await check("bearer guard, strict payload, duplicate keys and body cap", async () => {
      assert.equal((await post(cost, "wrong")).status, 401);
      assert.equal((await post({ ...cost, customer_id: "other" })).status, 400);
      assert.equal((await post(JSON.stringify(cost).replace('"tax_bp":900', '"tax_bp":900,"tax_bp":0'))).status, 400);
      assert.equal((await post(" ".repeat(65537))).status, 413);
      const invalid = structuredClone(cost); invalid.input.profit_bp = 2147483647;
      assert.equal((await post(invalid)).status, 400);
      invalid.input.profit_bp = 1; invalid.input.rounding = "mystery";
      assert.equal((await post(invalid)).status, 400);
    });
    await check("unchanged standard engine, exact int64 and tax", async () => {
      assert.equal((await calculate(cost)).total_rial, "1362500");
      const large = structuredClone(cost); Object.assign(large.input, { true_cost_rial: "9007199254740993", mandatory_buffer_rial: "0", profit_bp: 0, tax_bp: 0 });
      assert.equal((await calculate(large)).total_rial, "9007199254740993");
      large.input.true_cost_rial = "9223372036854775807"; large.input.mandatory_buffer_rial = "1";
      assert.equal((await post(large)).status, 422);
    });
    await check("core margin, rounding modes, override guard", async () => {
      const value = structuredClone(cost); Object.assign(value.input, { profit_method: "margin", profit_bp: 2000, tax_bp: 0, true_cost_rial: "1000001", rounding_step_rial: "100", rounding: "nearest" });
      assert.equal((await calculate(value)).total_rial, "1250000");
      value.input.rounding = "up"; assert.equal((await calculate(value)).total_rial, "1250100");
      value.input.rounding = "down"; assert.equal((await calculate(value)).total_rial, "1250000");
      value.input.override_pre_tax_rial = "1200000";
      assert.equal((await post(value)).status, 422);
      value.input.override_reason = "آزمایش"; assert.deepEqual((await calculate(value)).warnings, ["FINAL_BELOW_TARGET"]);
      value.input.override_pre_tax_rial = "1"; assert.equal((await post(value)).status, 422);
    });
    await check("gram fees explicit, 2g/4g tiers and whole-toman ToEven", async () => {
      assert.equal((await calculate(gram)).total_rial, "7900000");
      for (const [weight, fee] of [["1999", "4000000"], ["2000", "2500000"], ["3999", "2500000"], ["4000", "0"]]) {
        const value = structuredClone(gram); value.input.weight_mg = weight;
        assert.equal((await calculate(value)).light_piece_rial, fee);
      }
      const value = structuredClone(gram); Object.assign(value.input, { weight_mg: "1000", rate_per_gram_rial: "25" });
      assert.equal((await calculate(value)).base_rial, "20");
      value.input.rate_per_gram_rial = "35"; assert.equal((await calculate(value)).base_rial, "40");
      value.input.weight_mg = "9223372036854775807"; value.input.rate_per_gram_rial = "9223372036854775807";
      assert.equal((await post(value)).status, 422);
    });
    await check("actual TS connector validates native result", async () => {
      const { requestPricingPreview } = loadTs("lib/pricing/client.ts", { "server-only": {} });
      const result = await requestPricingPreview(cost, { url, token });
      assert.equal(result.result.total_rial, "1362500");
      const second = await requestPricingPreview(gram, { url, token });
      assert.equal(second.algorithm_version, "pcs-gram-explicit-fees-v1");
    });
    t.diagnostic(`Retained synthetic build evidence: ${evidenceDirectory}`);
    assert.equal(failures, 0, "Native assertion groups must all pass before recording success");
  });
});
