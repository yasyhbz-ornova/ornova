import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const inquiry = "11111111-1111-4111-8111-111111111111", quote = "22222222-2222-4222-8222-222222222222";
const valid = () => ({ version: 1, source_quote_no: "Q-TEST", source_order_no: "O-TEST", source_revision: 1, issued_at: new Date(Date.now()-60000).toISOString(), valid_until: new Date(Date.now()+3600000).toISOString(), lines: [{ description: "آزمایش", quantity: 1, amount_rial: "1000" }], discount_rial: "0", tax_rial: "0", total_rial: "1000" });
function fixture({ user = { id: "staff", app_metadata: { ornova_role: "staff" } }, error = null, created = true, source = "synthetic-fixture" } = {}) {
  const calls = [];
  process.env.ORNOVA_PCS_SOURCE_KEY = source;
  const deps = { "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, rpc: async (name,args) => { calls.push({name,args}); return { data: { id: quote, created }, error }; } }) } };
  const publish = loadTs("app/api/inquiries/[id]/quotes/route.ts", deps).POST;
  const withdraw = loadTs("app/api/inquiries/[id]/quotes/[quoteId]/withdraw/route.ts", deps).POST;
  const request = (body, origin = "http://localhost:3058") => new Request(`http://localhost:3058/api/inquiries/${inquiry}/quotes`, { method:"POST", headers:{origin, "content-type":"application/json"}, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { calls, send: (body=valid(), origin, id=inquiry) => { assert.equal(typeof publish,"function"); return publish(request(body,origin),{params:Promise.resolve({id})}); }, withdraw: (body={reason:"خطای آزمایشی"}) => { assert.equal(typeof withdraw,"function"); return withdraw(request(body),{params:Promise.resolve({id:inquiry,quoteId:quote})}); } };
}
test("quote publication authenticates trusted staff and same-origin before writes", async () => {
  assert.equal((await fixture({user:null}).send()).status,401);
  for (const user of [{id:"customer"},{id:"fake",user_metadata:{ornova_role:"staff"}}]) { const f=fixture({user}); assert.equal((await f.send()).status,403); assert.equal(f.calls.length,0); }
  assert.equal((await fixture().send(valid(),"https://different.invalid")).status,403);
});
test("quote publication validates bounded payload and uses only server namespace", async () => {
  const f=fixture();
  for (const input of ["{", {...valid(),owner_id:"forged"}, {...valid(),total_rial:"1"}]) assert.equal((await f.send(input)).status,400);
  assert.equal((await f.send(" ".repeat(65537))).status,413);
  assert.equal((await f.send(valid(),undefined,"bad-id")).status,404);
  assert.equal(f.calls.length,0);
  assert.equal((await f.send()).status,201);
  assert.equal(f.calls[0].args.p_source_key,"synthetic-fixture");
  assert.equal(f.calls[0].args.p_inquiry_id,inquiry);
  assert.equal(f.calls[0].name,"publish_inquiry_quote");
});
test("idempotency, conflict and unavailable configuration never fall back to message pricing", async () => {
  assert.equal((await fixture({created:false}).send()).status,200);
  assert.equal((await fixture({source:""}).send()).status,503);
  for (const [message,status] of [["QUOTE_CONFLICT",409],["QUOTE_CLOSED",409],["QUOTE_NOT_FOUND",404],["QUOTE_INVALID",400],["missing RPC",503]]) assert.equal((await fixture({error:{message}}).send()).status,status);
});
test("withdrawal is bound to the route inquiry and returns no internal reason", async () => {
  const f=fixture(); const response=await f.withdraw(); assert.equal(response.status,200);
  assert.equal(f.calls[0].args.p_inquiry_id,inquiry); assert.equal(f.calls[0].args.p_snapshot_id,quote);
  assert.equal(Object.hasOwn(await response.json(),"reason"),false);
  assert.equal((await fixture().withdraw({reason:"",owner_id:"forged"})).status,400);
});
