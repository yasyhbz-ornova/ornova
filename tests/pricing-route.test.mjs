import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const value = { schema_version: 1, request_id: "48a422dd-a532-4a8d-bb65-49b1a97550ee", method: "cost-plus", policy_version: "synthetic-v1", input: { true_cost_rial: "1000000", mandatory_buffer_rial: "100000", profit_method: "markup", profit_bp: 2500, rounding: "none", rounding_step_rial: "0", tax_bp: 900, override_pre_tax_rial: null, override_reason: null } };
class PricingRejected extends Error {}
function fixture(user = { app_metadata: { ornova_role: "staff" } }, failure = false) {
  let calls = 0;
  const { POST } = loadTs("app/api/admin/pricing/preview/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    "@/lib/pricing/client": { PricingRejected, requestPricingPreview: async input => { calls++; if (failure) throw Error("private token and source paths"); return { request_id: input.request_id }; } },
  });
  return { POST, calls: () => calls };
}
function request(body = value, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/admin/pricing/preview", { method: "POST", headers: { ...(origin ? { Origin: origin } : {}), "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
test("pricing route denies foreign/missing origin, anonymous and forged customer role", async () => {
  for (const origin of ["https://evil.example", ""]) { const f = fixture(); assert.equal((await f.POST(request(value, origin))).status, 403); assert.equal(f.calls(), 0); }
  for (const [user, status] of [[null, 401], [{ app_metadata: {} }, 403], [{ user_metadata: { ornova_role: "staff" } }, 403]]) {
    const f = fixture(user); assert.equal((await f.POST(request())).status, status); assert.equal(f.calls(), 0);
  }
});
test("staff preview bounded input, strict contract and safe unavailable output", async () => {
  const f = fixture();
  for (const [body, status] of [["{" ,400], [" ".repeat(65537),413], [{ ...value, account_id: "other" },400]]) {
    assert.equal((await f.POST(request(body))).status, status);
  }
  assert.equal(f.calls(), 0);
  const ok = await f.POST(request()); assert.equal(ok.status, 200); assert.equal(ok.headers.get("cache-control"), "no-store"); assert.equal(f.calls(), 1);
  const unavailable = await fixture(undefined, true).POST(request()); assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes("private token"));
});
