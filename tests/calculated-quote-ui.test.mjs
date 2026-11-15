import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const quote=loadTs("lib/pricing/calculated-quote.ts"),ui=loadTs("lib/pricing/calculated-quote-ui.ts");
const id="a1111111-abcd-4111-8111-a11111111111",inquiry="b2222222-abcd-4222-8222-b22222222222";
const basis={id,revision:2,method:"cost-plus",pre_tax_rial:"9007199254740993",tax_rial:"1",total_rial:"9007199254740994"};
const fields={source_quote_no:" Q-test ",source_order_no:"O-test",source_revision:"۱",issued_at:"2026-10-25T10:00",valid_until:"2026-10-26T10:00",description:"شرح مشتری",quantity:"۲",tax_rial:""};
// Device local time by design, not a fixed assumption about the machine timezone.
const now=new Date(2026,9,25,11,0).toISOString();
test("strict quote basis rejects hidden input and preserves exact projection without quantity multiplication",()=>{
  assert.equal(typeof quote.parseCalculationQuoteBasis,"function");assert.equal(quote.parseCalculationQuoteBasis(basis).success,true);assert.equal(quote.parseCalculationQuoteBasis({...basis,input:{profit_bp:20}}).success,false);
  assert.equal(quote.parseCalculationQuoteBasis({...basis,total_rial:"1"}).success,false);
  for(const value of ["x","","01","-1","9223372036854775808"])assert.equal(quote.parseCalculationQuoteBasis({...basis,pre_tax_rial:value}).success,false);
  assert.equal(typeof ui.buildCalculatedQuoteDraft,"function");const built=ui.buildCalculatedQuoteDraft(basis,fields,now);assert.equal(built.success,true);assert.equal(built.quote.total_rial,basis.total_rial);assert.equal(built.quote.lines[0].amount_rial,basis.pre_tax_rial);assert.equal(built.quote.lines[0].quantity,2);assert.equal(built.request.tax_rial,null);assert.equal(built.request.source_quote_no,"Q-test");
});
test("draft refuses coerced calendar dates, missing selections, future/expired issue and implicit gram zero",()=>{
  for(const patch of [{quantity:""},{source_revision:""},{issued_at:"2026-02-31T10:00"},{issued_at:"2026-10-25T29:00"},{issued_at:"2026-10-26T10:00",valid_until:"2026-10-27T10:00"},{valid_until:"2026-10-25T10:30"}])assert.equal(ui.buildCalculatedQuoteDraft(basis,{...fields,...patch},now).success,false,JSON.stringify(patch));
  const gram={...basis,method:"gram-sale",tax_rial:"0",total_rial:basis.pre_tax_rial};assert.equal(ui.buildCalculatedQuoteDraft(gram,fields,now).success,false);const zero=ui.buildCalculatedQuoteDraft(gram,{...fields,tax_rial:"۰"},now);assert.equal(zero.success,true);assert.equal(zero.request.tax_rial,"0");
});
test("review edit invalidates preview; uncertain target freezes metadata and ignores stale completion",()=>{
  assert.equal(typeof ui.createCalculatedQuoteEditor,"function");let state=ui.createCalculatedQuoteEditor(inquiry,basis);const action=(type,more={})=>({type,...more});
  for(const [field,value]of Object.entries(fields))state=ui.calculatedQuoteEditorReducer(state,action("edit",{field,value}));
  state=ui.calculatedQuoteEditorReducer(state,action("review",{now}));assert.equal(state.phase,"reviewing");const target=state.reviewed;
  state=ui.calculatedQuoteEditorReducer(state,action("start",{operation:1}));assert.equal(state.phase,"pending");
  assert.deepEqual(ui.calculatedQuoteEditorReducer(state,action("abandon")),state);
  state=ui.calculatedQuoteEditorReducer(state,action("failed",{operation:1,status:503}));assert.equal(state.phase,"uncertain");assert.deepEqual(state.target,target);
  const blocked=ui.calculatedQuoteEditorReducer(state,action("edit",{field:"quantity",value:"3"}));assert.deepEqual(blocked,state);
  state=ui.calculatedQuoteEditorReducer(state,action("start",{operation:2}));assert.deepEqual(state.target,target);
  assert.deepEqual(ui.calculatedQuoteEditorReducer(state,action("resolved",{operation:1,value:{id,created:true}})),state);
  state=ui.calculatedQuoteEditorReducer(state,action("resolved",{operation:2,value:{id,created:false}}));assert.equal(state.phase,"saved");assert.equal(state.receipt.id,id);
});
test("malformed success stays uncertain and explicit abandonment keeps form but requires new review",()=>{
  let state=ui.createCalculatedQuoteEditor(inquiry,basis);for(const [field,value]of Object.entries(fields))state=ui.calculatedQuoteEditorReducer(state,{type:"edit",field,value});state=ui.calculatedQuoteEditorReducer(state,{type:"review",now});
  const edited=ui.calculatedQuoteEditorReducer(state,{type:"edit",field:"quantity",value:"3"});assert.equal(edited.reviewed,null);assert.equal(edited.phase,"editing");
  state=ui.calculatedQuoteEditorReducer(state,{type:"start",operation:1});state=ui.calculatedQuoteEditorReducer(state,{type:"resolved",operation:1,value:{id:"invalid",created:true}});assert.equal(state.phase,"uncertain");
  state=ui.calculatedQuoteEditorReducer(state,{type:"abandon"});assert.equal(state.phase,"editing");assert.equal(state.target,null);assert.equal(state.reviewed,null);assert.equal(state.fields.quantity,"۲");
});
