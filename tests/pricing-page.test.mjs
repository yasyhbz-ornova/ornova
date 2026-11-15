import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const marker = () => null;
function page(user, error = null, inquiryResult = { data: null, error: null }) {
  return loadTs("app/admin/pricing/page.tsx", {
    "next/navigation": { notFound() { throw Error("not-found"); } },
    "next/link": { default: "a" },
    "@/components/admin/PricingCalculator": { PricingCalculator: marker },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error }) },from(name){assert.equal(name,"inquiries");return{select:()=>({eq:()=>({maybeSingle:async()=>inquiryResult})})};} }) },
    "@/lib/pricing/client": { pricingConfig: () => null },
    "@/lib/pricing/records-store": { pricingRecordsConfigured: () => false },
  });
}
test("staff calculator page denies anonymous, forged claims and failed session", async () => {
  for (const user of [null, { app_metadata: {} }, { user_metadata: { ornova_role: "staff" } }]) {
    const loaded = page(user); assert.equal(typeof loaded.default, "function"); await assert.rejects(() => loaded.default({}), /not-found/);
  }
  await assert.rejects(() => page({ app_metadata: { ornova_role: "staff" } }, { message: "invalid token" }).default({}), /not-found/);
});
test("staff calculator page sends only disabled availability and is not indexable", async () => {
  const loaded = page({ app_metadata: { ornova_role: "staff" } });
  assert.equal(typeof loaded.default, "function");
  const tree = await loaded.default({});
  function nodes(node) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; }
  const props=nodes(tree).find(n => n.type === marker).props;
  assert.equal(props.enabled,false);assert.ok(!Object.keys(props).some(key=>/token|secret|key/i.test(key)));
  assert.equal(loaded.metadata.robots.index, false);
});
test("staff pricing page binds an explicit inquiry, canonicalizes identity and rejects missing/invalid context",async()=>{
  const id="a1111111-abcd-4111-8111-a11111111111",user={id:"33333333-3333-4333-8333-333333333333",app_metadata:{ornova_role:"staff"}};
  const loaded=page(user,null,{data:{id,customer_name:"پروندهٔ آزمایشی",status:"closed"},error:null});
  const tree=await loaded.default({searchParams:Promise.resolve({inquiry:id.toUpperCase()})});
  function nodes(node){return !node||typeof node!=="object"?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
  const calc=nodes(tree).find(n=>n.type===marker);
  assert.deepEqual(calc.props.inquiry,{id,label:"پروندهٔ آزمایشی",closed:true});assert.equal(calc.props.storageEnabled,false);assert.match(calc.key,new RegExp(id));
  for(const inquiry of ["invalid",[id,id]])await assert.rejects(()=>loaded.default({searchParams:Promise.resolve({inquiry})}),/not-found/);
  await assert.rejects(()=>page(user).default({searchParams:Promise.resolve({inquiry:id})}),/not-found/);
});

test("empty admin desk still exposes the independent calculator without needing a customer record", async () => {
  const loaded = loadTs("app/admin/page.tsx", {
    "next/navigation": { notFound() { throw Error("not-found"); } }, "next/link": { default: "a" },
    "@/components/admin/InquiryDesk": { InquiryDesk: marker },
    "@/lib/account/inquiry-quotes": { readInquiryQuotes: () => assert.fail("no quote read for empty desk") },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { app_metadata: { ornova_role: "staff" } } } }) }, from(name) { assert.equal(name, "inquiries"); return { select: () => ({ order: async () => ({ data: [], error: null }) }) }; } }) },
  });
  const tree = await loaded.default({});
  function nodes(node) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; }
  assert.ok(nodes(tree).some(n => n.props?.href === "/admin/pricing"));
});
