import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const inquiry = "44444444-4444-4444-8444-444444444444";
const id = "55555555-5555-4555-8555-555555555555";
const payload = { action: "record", id, inquiry_id: inquiry, amount_rial: "9007199254740993", reference: "BANK-1", paid_at: "2026-11-15T10:00:00.000Z", note: null };
function setup({ user = { app_metadata: { ornova_role: "staff" } }, rpcError = null } = {}) {
  const calls = [];
  const route = loadTs("app/api/admin/finance/payments/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: async (...args) => { calls.push(args); return { data: { id }, error: rpcError }; } }) },
    "@/lib/auth/authorization": loadTs("lib/auth/authorization.ts"),
    "@/lib/commerce/quote-request": loadTs("lib/commerce/quote-request.ts"),
    "@/lib/commerce/quote-money": loadTs("lib/commerce/quote-money.ts"),
  });
  const post = (body = payload, origin = "http://localhost:3058") => route.POST(new Request("http://localhost:3058/api/admin/finance/payments", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { calls, post };
}

test("manual financial writes require same origin and trusted staff", async () => {
  for (const user of [null, { user_metadata: { ornova_role: "staff" } }]) { const subject = setup({ user }); assert.notEqual((await subject.post()).status, 200); assert.equal(subject.calls.length, 0); }
  const subject = setup();
  assert.equal((await subject.post(payload, "http://outside.invalid")).status, 403);
  assert.equal(subject.calls.length, 0);
});

test("record preserves exact rial string, validates input and maps conflicts", async () => {
  const subject = setup();
  assert.equal((await subject.post()).status, 200);
  assert.equal(subject.calls[0][0], "record_inquiry_payment");
  assert.equal(subject.calls[0][1].p_amount_rial, payload.amount_rial);
  assert.equal((await subject.post({ ...payload, amount_rial: 9007199254740993 })).status, 400);
  assert.equal((await subject.post({ ...payload, amount_rial: "0" })).status, 400);
  assert.equal(subject.calls.length, 1);
  assert.equal((await setup({ rpcError: { message: "PAYMENT_OVERPAY" } }).post()).status, 409);
});

test("reversal requires reason and uses immutable record id", async () => {
  const subject = setup();
  assert.equal((await subject.post({ action: "reverse", record_id: id, reason: "" })).status, 400);
  assert.equal((await subject.post({ action: "reverse", record_id: id, reason: "ثبت تکراری" })).status, 200);
  assert.deepEqual(subject.calls[0], ["reverse_inquiry_payment", { p_record_id: id, p_reason: "ثبت تکراری" }]);
});
