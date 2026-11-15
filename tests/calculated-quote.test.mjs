import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const api=loadTs("lib/pricing/calculated-quote.ts");
const id="a1111111-abcd-4111-8111-a11111111111";
const metadata=()=>({calculation_id:id,source_quote_no:" Q-fixture ",source_order_no:"O-fixture",source_revision:1,issued_at:"2026-10-25T10:00:00Z",valid_until:"2026-10-26T10:00:00Z",description:"شرح آزمایشی مشتری",quantity:2,tax_rial:null});
const record=()=>({id,inquiry_id:"b2222222-abcd-4222-8222-b22222222222",revision:3,source_key:"fixture",created_at:"2026-10-24T10:00:00Z",created_by:null,snapshot:{schema_version:1,request_id:id,method:"cost-plus",policy_version:"synthetic",input:{true_cost_rial:"9007199254740993",mandatory_buffer_rial:"0",profit_method:"markup",profit_bp:0,rounding:"none",rounding_step_rial:"0",tax_bp:0,override_pre_tax_rial:null,override_reason:"PRIVATE-REASON"},algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"9007199254740993",target_rial:"9007199254740993",pre_tax_rial:"9007199254740993",tax_rial:"1",total_rial:"9007199254740994",effective_margin_bp:0,warnings:["MANDATORY_BUFFER_ZERO"]}}});
test("calculated quote request has exact metadata only and canonicalizes identities and dates",()=>{
  assert.equal(typeof api.parseCalculatedQuoteRequest,"function");
  const parsed=api.parseCalculatedQuoteRequest({...metadata(),calculation_id:id.toUpperCase()});assert.equal(parsed.success,true);assert.equal(parsed.data.calculation_id,id);assert.equal(parsed.data.source_quote_no,"Q-fixture");assert.equal(parsed.data.issued_at,"2026-10-25T10:00:00.000Z");
  for(const patch of [{total_rial:"1"},{result:{}},{owner_id:id},{description:"<img>"},{quantity:0},{quantity:1001},{quantity:1.2},{source_revision:null},{issued_at:null},{tax_rial:0},{tax_rial:"01"},{valid_until:"2026-10-24T10:00:00Z"},{calculation_id:"bad"}])assert.equal(api.parseCalculatedQuoteRequest({...metadata(),...patch}).success,false,JSON.stringify(patch));
});
test("cost projection selects only customer fields from the exact saved amount without multiplying quantity",()=>{
  assert.equal(typeof api.projectCalculationQuote,"function");const result=api.projectCalculationQuote(record(),api.parseCalculatedQuoteRequest(metadata()).data);assert.equal(result.success,true);assert.equal(result.value.total_rial,"9007199254740994");assert.equal(result.value.lines[0].amount_rial,"9007199254740993");assert.equal(result.value.lines[0].quantity,2);assert.equal(result.value.tax_rial,"1");assert.equal(result.value.discount_rial,"0");
  assert.deepEqual(Object.keys(result.value).sort(),["version","source_quote_no","source_order_no","source_revision","issued_at","valid_until","lines","discount_rial","tax_rial","total_rial"].sort());assert.ok(!JSON.stringify(result.value).includes("PRIVATE"));assert.ok(!JSON.stringify(result.value).includes("profit"));
  assert.equal(api.projectCalculationQuote(record(),{...metadata(),tax_rial:"0"}).success,false);assert.equal(api.projectCalculationQuote(record(),{...metadata(),calculation_id:record().inquiry_id}).success,false);
});
test("gram projection requires explicit tax including zero and refuses overflowing whole-rial totals",()=>{
  const gram={...record(),snapshot:{...record().snapshot,method:"gram-sale",result:{pre_tax_rial:"9007199254740993",tax_rial:"0",total_rial:"9007199254740993"}}};
  assert.equal(api.projectCalculationQuote(gram,metadata()).success,false);
  for(const tax of ["0","1"]){const out=api.projectCalculationQuote(gram,{...metadata(),tax_rial:tax});assert.equal(out.success,true);assert.equal(out.value.total_rial,String(BigInt("9007199254740993")+BigInt(tax)));}
  assert.equal(api.projectCalculationQuote(gram,{...metadata(),tax_rial:"9223372036854775807"}).success,false);
});
