import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const projection=loadTs("lib/pricing/calculated-quote.ts");
const id="a1111111-abcd-4111-8111-a11111111111",calc="c3333333-abcd-4333-8333-c33333333333",quote="d4444444-abcd-4444-8444-d44444444444";
const issuedAt=new Date(Date.now()-60000).toISOString(),validUntil=new Date(Date.now()+3600000).toISOString();
const metadata=()=>({calculation_id:calc,source_quote_no:"Q-test",source_order_no:"O-test",source_revision:1,issued_at:issuedAt,valid_until:validUntil,description:"شرح مشتری",quantity:2,tax_rial:null});
const row=()=>({id:calc,inquiry_id:id,revision:2,source_key:"fixture",created_at:"2026-10-23T10:00:00Z",created_by:null,snapshot:{schema_version:1,request_id:calc,method:"cost-plus",policy_version:"fixture",input:{true_cost_rial:"1000",mandatory_buffer_rial:"0",profit_method:"markup",profit_bp:0,rounding:"none",rounding_step_rial:"0",tax_bp:0,override_pre_tax_rial:null,override_reason:"SECRET-NOTE"},algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"1000",target_rial:"1000",pre_tax_rial:"1000",tax_rial:"0",total_rial:"1000",effective_margin_bp:0,warnings:["MANDATORY_BUFFER_ZERO"]}}});
function fixture({user={id:calc,app_metadata:{ornova_role:"staff"}},authError=null,record=row(),readError=null,rpcError=null,reply,source="fixture"}={}){
  const reads=[],calls=[],filters=[];
  const api=loadTs("app/api/inquiries/[id]/quotes/from-calculation/route.ts",{
    "@/lib/pricing/calculated-quote-config":{calculatedQuotesSource:()=>source},
    "@/lib/supabase/server":{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user},error:authError})},from(name){assert.equal(name,"inquiry_pricing_calculations");return{select(columns){reads.push(columns);const query={eq:(key,value)=>{filters.push([key,value]);return query;},maybeSingle:async()=>({data:record,error:readError})};return query;}};},rpc:async(name,args)=>{calls.push({name,args});return{data:reply===undefined?{id:quote,created:true,calculation_id:calc,calculation_revision:2,payload:projection.projectCalculationQuote(record,args.p_request).value}:reply,error:rpcError};}})},
  });
  const post=(value=metadata(),origin="http://localhost:3058",target=id)=>api.POST(new Request(`http://localhost:3058/api/inquiries/${target}/quotes/from-calculation`,{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(value)}),{params:Promise.resolve({id:target})});
  return{post,reads,calls,filters};
}
test("calculated quote config is independently off/scoped and no privileged key is needed",()=>{
  const api=loadTs("lib/pricing/calculated-quote-config.ts",{"server-only":{}});assert.equal(typeof api.calculatedQuotesSource,"function");
  const env={ORNOVA_CALCULATED_QUOTES_ENABLED:"true",ORNOVA_PCS_SOURCE_KEY:"fixture",NEXT_PUBLIC_SUPABASE_URL:"https://urtufzyhqgwszmufhkyt.supabase.co"};assert.equal(api.calculatedQuotesSource(env),"fixture");
  for(const patch of [{ORNOVA_CALCULATED_QUOTES_ENABLED:"false"},{ORNOVA_PCS_SOURCE_KEY:""},{NEXT_PUBLIC_SUPABASE_URL:"https://other.supabase.co"}])assert.equal(api.calculatedQuotesSource({...env,...patch}),null);
});
test("origin, session and trusted staff authorization precede private reads and RPC",async()=>{
  for(const options of [{user:null},{user:{user_metadata:{ornova_role:"staff"}}},{authError:{message:"secret"}}]){const f=fixture(options);const r=await f.post();assert.ok([401,403].includes(r.status));assert.equal(f.reads.length,0);assert.equal(f.calls.length,0);}
  const f=fixture();assert.equal((await f.post(metadata(),"https://foreign.example")).status,403);assert.equal(f.reads.length,0);
  const off=fixture({source:null});assert.equal((await off.post()).status,503);assert.equal(off.reads.length,0);assert.equal(off.calls.length,0);
});
test("publish rereads exact saved record and sends only canonical metadata to transactional RPC",async()=>{
  const f=fixture(),r=await f.post({...metadata(),calculation_id:calc.toUpperCase()},undefined,id.toUpperCase());assert.equal(r.status,201);assert.deepEqual(await r.json(),{id:quote,created:true});assert.equal(r.headers.get("cache-control"),"no-store");
  assert.equal(f.calls[0].name,"publish_calculated_inquiry_quote");assert.equal(f.calls[0].args.p_inquiry_id,id);assert.equal(f.calls[0].args.p_request.calculation_id,calc);assert.ok(!JSON.stringify(f.calls).includes("SECRET"));assert.ok(!("p_snapshot"in f.calls[0].args));
  assert.deepEqual(f.filters,[["inquiry_id",id],["id",calc]]);
  const bad=fixture();assert.equal((await bad.post({...metadata(),total_rial:"1"})).status,400);assert.equal(bad.calls.length,0);
});
test("missing/foreign/malformed/source-mismatched record cannot create a quote",async()=>{
  for(const [record,readError,status]of [[null,null,404],[{...row(),inquiry_id:calc},null,503],[{...row(),source_key:"other"},null,409],[row(),{message:"secret"},503]]){const f=fixture({record,readError});assert.equal((await f.post()).status,status);assert.equal(f.calls.length,0);}
});
test("unconfirmed gram tax and altered RPC receipts never claim publication or leak private errors",async()=>{
  for(const reply of [null,{id:quote,created:true,calculation_id:id,calculation_revision:2,payload:{}},{id:quote,created:true,calculation_id:calc,calculation_revision:2,payload:{...projection.projectCalculationQuote(row(),metadata()).value,total_rial:"1"}}]){const f=fixture({reply});const r=await f.post();assert.equal(r.status,503);assert.ok(!(await r.text()).includes("SECRET"));}
  const f=fixture({rpcError:{message:"QUOTE_CLOSED SECRET"}});assert.equal((await f.post()).status,409);
  const gram={...row(),snapshot:{...row().snapshot,method:"gram-sale",algorithm_version:"pcs-gram-explicit-fees-v1",input:{weight_mg:"1000",rate_per_gram_rial:"1000",under_2g_fee_rial:"0",under_4g_fee_rial:"0",stone_total_rial:"0",stone_count:0,setting_per_stone_rial:"0",packaging_rial:"0",logistics_rial:"0",design_rial:"0"},result:{base_rial:"1000",light_piece_rial:"0",setting_rial:"0",pre_tax_rial:"1000",tax_rial:"0",total_rial:"1000",warnings:["GRAM_SALE_HAS_NO_TAX_POLICY"]}}};
  const missing=fixture({record:gram});assert.equal((await missing.post()).status,400);assert.equal(missing.calls.length,0);
  const zero=fixture({record:gram});assert.equal((await zero.post({...metadata(),tax_rial:"0"})).status,201);
  const captured=metadata(),replay={id:quote,created:false,calculation_id:calc,calculation_revision:2,payload:projection.projectCalculationQuote(row(),captured).value};
  assert.equal((await fixture({reply:replay}).post(captured)).status,200);
});
