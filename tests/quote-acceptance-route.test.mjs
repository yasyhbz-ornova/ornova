import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const inquiry = "11111111-1111-4111-8111-111111111111";
const quote = "22222222-2222-4222-8222-222222222222";
const acceptedAt = "2026-11-15T07:30:00.000Z";

function fixture({ user = { id: "customer" }, authError = null, rpcError = null, rpcData = { id: quote, accepted_at: acceptedAt, created: true } } = {}) {
  const calls = [];
  const client = { auth: { getUser: async () => ({ data: { user }, error: authError }) }, rpc: async (name, args) => { calls.push({ name, args }); return { data: rpcData, error: rpcError }; } };
  const { POST } = loadTs("app/api/account/inquiries/[id]/quotes/[quoteId]/accept/route.ts", { "@/lib/supabase/server": { createSupabaseServerClient: async () => client } });
  const send = (body = { confirmed: true }, origin = "http://localhost:3058", id = inquiry, quoteId = quote) => POST(
    new Request(`http://localhost:3058/api/account/inquiries/${inquiry}/quotes/${quote}/accept`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }),
    { params: Promise.resolve({ id, quoteId }) },
  );
  return { calls, send };
}

test("customer must explicitly confirm an exact quote on the same origin", async () => {
  assert.equal((await fixture({ user: null }).send()).status, 401);
  assert.equal((await fixture({ authError: { message: "auth unavailable" } }).send()).status, 503);
  assert.equal((await fixture().send({ confirmed: true }, "https://foreign.invalid")).status, 403);
  assert.equal((await fixture().send({ confirmed: false })).status, 400);
  assert.equal((await fixture().send({ confirmed: true, total_rial: "1" })).status, 400);
  assert.equal((await fixture().send(" ".repeat(65537))).status, 413);
  assert.equal((await fixture().send({ confirmed: true }, undefined, "bad-id")).status, 404);
  const f = fixture();
  const response = await f.send();
  assert.equal(response.status, 200);
  assert.deepEqual(f.calls, [{ name: "accept_inquiry_quote", args: { p_inquiry_id: inquiry, p_snapshot_id: quote } }]);
  assert.deepEqual(await response.json(), { id: quote, accepted_at: acceptedAt, created: true });
});

test("acceptance maps closed, expired, changed, foreign and unavailable records without leaking details", async () => {
  for (const [message, status] of [["QUOTE_CLOSED", 409], ["QUOTE_EXPIRED", 409], ["QUOTE_ACCEPTED", 409], ["QUOTE_CONFLICT", 409], ["QUOTE_FORBIDDEN", 403], ["QUOTE_NOT_FOUND", 404], ["database offline", 503]]) {
    const response = await fixture({ rpcError: { message } }).send();
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes(message));
  }
  assert.equal((await fixture({ rpcData: { id: quote, accepted_at: "bad", created: true } }).send()).status, 503);
});
