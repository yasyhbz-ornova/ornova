import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const api=loadTs("lib/pricing/records-ui.ts");
const inquiry="a1111111-abcd-4111-8111-a11111111111", other="b2222222-abcd-4222-8222-b22222222222";
const request={schema_version:1,request_id:"48a422dd-a532-4a8d-bb65-49b1a97550ee",method:"cost-plus",policy_version:"synthetic-v1",input:{true_cost_rial:"1000000",mandatory_buffer_rial:"100000",profit_method:"markup",profit_bp:2500,rounding:"none",rounding_step_rial:"0",tax_bp:900,override_pre_tax_rial:null,override_reason:null}};
const preview={...request,algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"1100000",target_rial:"1250000",pre_tax_rial:"1250000",tax_rial:"112500",total_rial:"1362500",effective_margin_bp:2000,warnings:[]}};
const row={id:"44444444-4444-4444-8444-444444444444",inquiry_id:inquiry,revision:1,source_key:"fixture",created_at:"2026-10-23T10:00:00Z",created_by:other,snapshot:preview};
const target={request,preview};
const action=(type,more={})=>({type,inquiryId:inquiry,...more});
test("save reply must correlate to captured inquiry/request; mismatched result never confirms",()=>{
  assert.equal(api.parseSavedCalculation({created:true,record:row},inquiry,request).success,true);
  for(const value of [{created:1,record:row},{created:true,record:{...row,inquiry_id:other}},{created:true,record:{...row,snapshot:{...preview,request_id:other}}},{created:true,record:row,secret:1}])assert.equal(api.parseSavedCalculation(value,inquiry,request).success,false);
});
test("saved recomputation may differ but is flagged separately, independent of JSON key order",()=>{
  assert.equal(api.savedPreviewChanged(preview,{...preview,result:{...preview.result}}),false);
  assert.equal(api.savedPreviewChanged(preview,{...preview,result:{...preview.result,pre_tax_rial:"1250001",tax_rial:"112500",total_rial:"1362501"}}),true);
});
test("ambiguous save preserves original target and cannot silently switch to a new preview",()=>{
  let state=api.createRecordDesk(inquiry);
  state=api.recordDeskReducer(state,action("save-start",{target}));
  state=api.recordDeskReducer(state,action("save-failure",{requestId:request.request_id,status:503}));
  assert.equal(state.save.phase,"error");assert.deepEqual(state.save.target,target);
  const changed={request:{...request,request_id:other},preview:{...preview,request_id:other}};
  state=api.recordDeskReducer(state,action("save-start",{target:changed}));
  assert.equal(state.save.phase,"error");assert.equal(state.save.target.request.request_id,request.request_id);
  state=api.recordDeskReducer(state,action("save-start",{target:state.save.target}));
  state=api.recordDeskReducer(state,action("save-success",{requestId:request.request_id,value:{created:false,record:row}}));
  assert.equal(state.save.phase,"saved");assert.equal(state.save.record.id,row.id);
});
test("late save/history and foreign inquiry actions cannot contaminate current state",()=>{
  let state=api.recordDeskReducer(api.createRecordDesk(inquiry),action("save-start",{target}));
  const unchanged=api.recordDeskReducer(state,{type:"save-success",inquiryId:other,requestId:request.request_id,value:{created:true,record:row}});
  assert.deepEqual(unchanged,state);
  state=api.recordDeskReducer(state,action("save-success",{requestId:other,value:{created:true,record:row}}));assert.equal(state.save.phase,"pending");
  state=api.recordDeskReducer(state,action("history-start",{operation:1,before:null}));
  state=api.recordDeskReducer(state,action("history-start",{operation:2,before:null}));
  state=api.recordDeskReducer(state,action("history-success",{operation:1,value:{records:[row],next_before:null}}));assert.equal(state.history.phase,"loading");
});
test("forget is deliberate and cannot dismiss an in-flight write",()=>{
  const pending=api.recordDeskReducer(api.createRecordDesk(inquiry),action("save-start",{target}));
  assert.deepEqual(api.recordDeskReducer(pending,action("save-forget")),pending);
  const failed=api.recordDeskReducer(pending,action("save-failure",{requestId:request.request_id,status:401}));
  const forgotten=api.recordDeskReducer(failed,action("save-forget"));assert.equal(forgotten.save.target,null);
});
test("history reader bounds pages, cursor and ordering and rejects hidden mismatches",()=>{
  assert.equal(api.parseCalculationPage({records:[row],next_before:null},inquiry,null).success,true);
  for(const value of [{records:[row,row],next_before:null},{records:[row],next_before:1},{records:[{...row,inquiry_id:other}],next_before:null},{records:[row],next_before:null,extra:1}])assert.equal(api.parseCalculationPage(value,inquiry,null).success,false);
  assert.equal(api.parseCalculationPage({records:[row],next_before:null},inquiry,1).success,false);
  const rows=Array.from({length:20},(_,i)=>({...row,id:`${String(i+10).padStart(8,"0")}-4444-4444-8444-444444444444`,revision:21-i,snapshot:{...preview,request_id:`${String(i+10).padStart(8,"0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`}}));
  assert.equal(api.parseCalculationPage({records:rows,next_before:2},inquiry,null).success,true);
  assert.equal(api.parseCalculationPage({records:rows,next_before:3},inquiry,null).success,false);
});
test("client response decoding is bounded and never renders a malformed body",async()=>{
  assert.deepEqual(await api.readRecordResponse(Response.json({created:false})),{created:false});
  await assert.rejects(()=>api.readRecordResponse(new Response(" ".repeat(2*1024*1024+1))));
  await assert.rejects(()=>api.readRecordResponse(new Response("private upstream diagnostic")));
});
