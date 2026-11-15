import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const inquiry="a1111111-abcd-4111-8111-a11111111111", owner="b2222222-abcd-4222-8222-b22222222222", staff="c3333333-abcd-4333-8333-c33333333333";
const request={schema_version:1,request_id:"48a422dd-a532-4a8d-bb65-49b1a97550ee",method:"cost-plus",policy_version:"synthetic-v1",input:{true_cost_rial:"1000000",mandatory_buffer_rial:"100000",profit_method:"markup",profit_bp:2500,rounding:"none",rounding_step_rial:"0",tax_bp:900,override_pre_tax_rial:null,override_reason:null}};
const snapshot={...request,algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"1100000",target_rial:"1250000",pre_tax_rial:"1250000",tax_rial:"112500",total_rial:"1362500",effective_margin_bp:2000,warnings:[]}};
const record={id:"44444444-4444-4444-8444-444444444444",inquiry_id:inquiry,revision:1,source_key:"fixture",created_at:"2026-10-23T10:00:00Z",created_by:staff,snapshot};
function fixture({user={id:staff,app_metadata:{ornova_role:"staff"}},existing=null,status="reviewing",nativeFailure=false,badNative=false,writeFailure=false,history=[record]}={}) {
  const calls=[];
  const client={auth:{getUser:async()=>({data:{user},error:null})},from(name){calls.push(`read:${name}`);let filters={};const query={select(){return query;},eq(key,value){filters[key]=value;return query;},lt(key,value){filters[key]=value;return query;},order(){return query;},async limit(n){assert.equal(n,21);return {data:history,error:null};},async maybeSingle(){return {data:name==="inquiries"?{id:inquiry,user_id:owner,status}:existing,error:null};}};return query;}};
  const loaded=loadTs("app/api/inquiries/[id]/calculations/route.ts",{
    "@/lib/supabase/server":{createSupabaseServerClient:async()=>client},
    "@/lib/pricing/client":{PricingRejected:class extends Error{},requestPricingPreview:async input=>{calls.push("native");assert.deepEqual(input,request);if(nativeFailure)throw Error("private-upstream-secret");return badNative?{...snapshot,request_id:record.id}:snapshot;}},
    "@/lib/pricing/records-store":{PricingRecordWriteError:class extends Error{},pricingRecordsSource:()=>"fixture",createPricingRecordWriter:()=>({async save(id,expectedOwner,actor,result){calls.push("write");assert.equal(id,inquiry);assert.equal(expectedOwner,owner);assert.equal(actor,staff);assert.deepEqual(result,snapshot);if(writeFailure)throw Error("private-db-key");return {created:true,record};}})},
  });
  const req=(body=request,origin="http://localhost:3000",query="")=>new Request(`http://localhost:3000/api/inquiries/${inquiry}/calculations${query}`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:typeof body==="string"?body:JSON.stringify(body)});
  return {calls,post(body,origin,id=inquiry){assert.equal(typeof loaded.POST,"function");return loaded.POST(req(body,origin),{params:Promise.resolve({id})});},get(query="",id=inquiry){assert.equal(typeof loaded.GET,"function");return loaded.GET(new Request(`http://localhost:3000/api/inquiries/${id}/calculations${query}`),{params:Promise.resolve({id})});}};
}
test("calculation routes authorize staff before record reads, engine or privileged writer",async()=>{
  for(const [user,code] of [[null,401],[{id:owner,user_metadata:{ornova_role:"staff"}},403]]){const f=fixture({user});assert.equal((await f.post()).status,code);assert.equal((await f.get()).status,code);assert.deepEqual(f.calls,[]);}
  const foreign=fixture();assert.equal((await foreign.post(request,"https://evil.invalid")).status,403);assert.deepEqual(foreign.calls,[]);
});
test("saving refuses browser results/actor and persists only validated fresh native output",async()=>{
  const f=fixture();for(const body of [snapshot,{...request,owner_id:owner},{...request,revision:1},"{"," ".repeat(65537)])assert.ok([400,413].includes((await f.post(body)).status));
  assert.ok(!f.calls.includes("native"));
  const response=await f.post();assert.equal(response.status,201);assert.equal(response.headers.get("cache-control"),"no-store");assert.deepEqual(await response.json(),{created:true,record});
  assert.equal(f.calls.filter(v=>v==="native").length,1);assert.equal(f.calls.filter(v=>v==="write").length,1);
});
test("matching replay after closure returns original record without engine; altered or cross-inquiry conflicts",async()=>{
  const replay=fixture({existing:record,status:"closed"});assert.equal((await replay.post()).status,200);assert.ok(!replay.calls.includes("native"));
  for(const existing of [{...record,source_key:"other"},{...record,inquiry_id:owner},{...record,snapshot:{...snapshot,policy_version:"other"}}])assert.equal((await fixture({existing}).post()).status,409);
  assert.equal((await fixture({status:"closed"}).post()).status,409);
});
test("native/DB failure or malformed correlation never claims persistence or leaks details",async()=>{
  for(const options of [{nativeFailure:true},{badNative:true},{writeFailure:true}]){const f=fixture(options),r=await f.post();assert.equal(r.status,503);assert.ok(!(await r.text()).includes("private"));if(!options.writeFailure)assert.ok(!f.calls.includes("write"));}
});
test("private history validates records and bounded pagination rather than silently skipping bad rows",async()=>{
  const valid=await fixture().get();assert.equal(valid.status,200);assert.deepEqual(await valid.json(),{records:[record],next_before:null});
  assert.equal((await fixture().get("?before=0")).status,400);assert.equal((await fixture().get("?owner=x")).status,400);
  assert.equal((await fixture({history:[{...record,revision:0}]}).get()).status,503);
});
test("uppercase inquiry URLs preserve GET, successful insertion and identical replay",async()=>{
  const id=inquiry.toUpperCase();
  assert.equal((await fixture().get("",id)).status,200);
  assert.equal((await fixture().post(request,undefined,id)).status,201);
  assert.equal((await fixture({existing:record}).post(request,undefined,id)).status,200);
});

test("privileged writer is scoped/off by default and validates returned immutable record",async()=>{
  const saved={};
  const api=loadTs("lib/pricing/records-store.ts",{"server-only":{},"@supabase/supabase-js":{createClient(url,key,options){saved.url=url;saved.key=key;assert.equal(options.auth.persistSession,false);return {rpc:async(name,args)=>{saved.name=name;saved.args=args;return {data:{created:true,record},error:null};}};}}});
  assert.equal(typeof api.createPricingRecordWriter,"function");assert.equal(api.createPricingRecordWriter({}),null);
  const env={ORNOVA_PRICING_RECORDS_ENABLED:"true",ORNOVA_PCS_SOURCE_KEY:"fixture",NEXT_PUBLIC_SUPABASE_URL:"https://urtufzyhqgwszmufhkyt.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"synthetic-server-secret"};
  assert.equal(api.pricingRecordsConfigured(env),true);assert.equal(api.pricingRecordsConfigured({...env,SUPABASE_SERVICE_ROLE_KEY:""}),false);
  assert.equal(api.createPricingRecordWriter({...env,NEXT_PUBLIC_SUPABASE_URL:"https://other.supabase.co"}),null);
  const writer=api.createPricingRecordWriter(env);assert.deepEqual(await writer.save(inquiry,owner,staff,snapshot),{created:true,record});
  assert.equal(saved.name,"save_inquiry_pricing_calculation");assert.equal(saved.args.p_expected_owner_id,owner);assert.equal(saved.args.p_actor_id,staff);
  assert.deepEqual(await writer.save(inquiry.toUpperCase(),owner.toUpperCase(),staff.toUpperCase(),snapshot),{created:true,record});
});
