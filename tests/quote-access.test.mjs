import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { readInquiryQuotes }=loadTs("lib/account/inquiry-quotes.ts");
const payload={version:1,source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,issued_at:"2026-10-22T00:00:00Z",valid_until:"2026-10-23T00:00:00Z",lines:[{description:"آزمایش",quantity:1,amount_rial:"15"}],discount_rial:"0",tax_rial:"0",total_rial:"15"};
function client(data,error=null) {return{from:(name)=>{assert.equal(name,"customer_inquiry_quotes");return{select:()=>({in:(_,ids)=>{assert.deepEqual(ids,["inquiry-a"]);return{order:async()=>({data,error})};}})};}};}
test("quote read emits an allowlisted DTO even if DB adapter returns additional internal fields",async()=>{
  assert.equal(typeof readInquiryQuotes,"function");
  const r=await readInquiryQuotes(client([{id:"quote-a",inquiry_id:"inquiry-a",payload,published_at:"2026-10-22T01:00:00Z",withdrawn_at:null,reason:"private",source_key:"private",created_by:"private"}]),["inquiry-a"]);
  assert.equal(r.error,false);assert.equal(r.data[0].payload.total_rial,"15");
  for(const key of ["reason","source_key","created_by"]) assert.equal(Object.hasOwn(r.data[0],key),false);
});
test("missing schema and corrupt quote payload are errors, not an empty successful archive",async()=>{
  assert.equal(typeof readInquiryQuotes,"function");
  assert.equal((await readInquiryQuotes(client(null,{message:"schema missing"}),["inquiry-a"])).error,true);
  assert.equal((await readInquiryQuotes(client([{id:"q",inquiry_id:"inquiry-a",payload:{...payload,profit:10}}]),["inquiry-a"])).error,true);
  assert.deepEqual(await readInquiryQuotes(client([]),["inquiry-a"]),{data:[],error:false});
});
