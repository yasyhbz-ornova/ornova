import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const id="a1111111-abcd-4111-8111-a11111111111",calc="c3333333-abcd-4333-8333-c33333333333",staff="d4444444-abcd-4444-8444-d44444444444",marker=()=>null;
const row={id:calc,inquiry_id:id,revision:2,source_key:"fixture",created_at:"2026-10-23T10:00:00Z",created_by:null,snapshot:{schema_version:1,request_id:calc,method:"cost-plus",policy_version:"fixture",input:{true_cost_rial:"1000",mandatory_buffer_rial:"0",profit_method:"markup",profit_bp:0,rounding:"none",rounding_step_rial:"0",tax_bp:0,override_pre_tax_rial:null,override_reason:"PRIVATE-NOTE"},algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"1000",target_rial:"1000",pre_tax_rial:"1000",tax_rial:"0",total_rial:"1000",effective_margin_bp:0,warnings:["MANDATORY_BUFFER_ZERO"]}}};
function page({user={id:staff,app_metadata:{ornova_role:"staff"}},record=row,inquiry={id,customer_name:"مشتری",status:"reviewing"},source="fixture"}={}){
  const reads=[];const loaded=loadTs("app/admin/pricing/quote/page.tsx",{
    "next/navigation":{notFound(){throw Error("not-found");},redirect(url){throw Error(`redirect:${url}`);}},"next/link":{default:"a"},
    "@/components/admin/AdminAccessDenied":{AdminAccessDenied:"denied"},
    "@/components/admin/CalculatedQuoteEditor":{CalculatedQuoteEditor:marker},
    "@/lib/pricing/calculated-quote-config":{calculatedQuotesSource:()=>source},
    "@/lib/supabase/server":{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})},from(name){const filters=[];reads.push({name,filters});const q={select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},maybeSingle:async()=>({data:name==="inquiries"?inquiry:record,error:null})};return q;}})},
  });return{loaded,reads,open:(query={inquiry:id,calculation:calc})=>loaded.default({searchParams:Promise.resolve(query)})};
}
const nodes=node=>!node||typeof node!=="object"?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];
test("calculated quote page authenticates staff before any private read and rejects invalid context",async()=>{
  const guest=page({user:null});await assert.rejects(()=>guest.open(),/redirect:\/\?galleryPanel=account&next=%2Fadmin%2Fpricing/);assert.equal(guest.reads.length,0);
  const customer=page({user:{id:staff,user_metadata:{ornova_role:"staff"}}});assert.equal((await customer.open()).type,"denied");assert.equal(customer.reads.length,0);
  for(const query of [{},{inquiry:id,calculation:"bad"},{inquiry:[id],calculation:calc}])await assert.rejects(()=>page().open(query),/not-found/);
});
test("page supplies only safe immutable basis and explicit inquiry, keyed by verified staff and both identities",async()=>{
  const p=page(),tree=await p.open({inquiry:id.toUpperCase(),calculation:calc.toUpperCase()}),editor=nodes(tree).find(n=>n.type===marker);
  assert.deepEqual(editor.props.basis,{id:calc,revision:2,method:"cost-plus",pre_tax_rial:"1000",tax_rial:"0",total_rial:"1000"});assert.deepEqual(editor.props.inquiry,{id,label:"مشتری",closed:false});assert.equal(editor.props.enabled,true);assert.ok(!JSON.stringify(editor.props).includes("PRIVATE"));assert.ok(!JSON.stringify(editor.props).includes("source_key"));
  for(const key of [staff,id,calc])assert.ok(editor.key.includes(key));assert.equal(p.loaded.metadata.robots.index,false);
  assert.deepEqual(p.reads.find(v=>v.name==="inquiry_pricing_calculations").filters,[["inquiry_id",id],["id",calc]]);
});
test("closed/off/source mismatch are review-only; absent/foreign/malformed records never open",async()=>{
  for(const options of [{source:null},{source:"other"}]){const tree=await page(options).open();assert.equal(nodes(tree).find(n=>n.type===marker).props.enabled,false);}
  const closed=nodes(await page({inquiry:{id,customer_name:null,status:"closed"}}).open()).find(n=>n.type===marker);assert.equal(closed.props.inquiry.closed,true);
  for(const record of [null,{...row,inquiry_id:calc},{...row,id:staff},{...row,snapshot:{...row.snapshot,result:{}}}])await assert.rejects(()=>page({record}).open(),/not-found/);
});
