import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const api=loadTs("lib/commerce/inquiry-submission.ts"),id="a1111111-abcd-4111-8111-a11111111111",other="b2222222-abcd-4222-8222-b22222222222";
test("only a valid successful receipt confirms inquiry registration",()=>{
  assert.equal(typeof api.classifyInquirySubmission,"function");assert.equal(api.classifyInquirySubmission(201,{id},[]).kind,"confirmed");assert.equal(api.classifyInquirySubmission(200,{id},[]).receipt.id,id);
  for(const [status,body]of [[null,null],[503,{error:"PRIVATE"}],[201,{}],[200,{id:"invalid"}],[202,{id}],[429,{}]])assert.equal(api.classifyInquirySubmission(status,body,[]).kind,"uncertain");
  for(const status of [400,401,403]){const result=api.classifyInquirySubmission(status,{error:"PRIVATE"},[]);assert.equal(result.kind,"rejected");assert.ok(!result.message.includes("PRIVATE"));}
});
test("uncertainty survives only an explicit marker, and ring cleanup cannot erase newer/unsubmitted design",()=>{
  assert.equal(typeof api.hasUncertainInquiryDraft,"function");for(const value of [null,[],{}, {submissionUncertain:"true"}])assert.equal(api.hasUncertainInquiryDraft(value),false);assert.equal(api.hasUncertainInquiryDraft({submissionUncertain:true}),true);
  assert.equal(api.canClearSubmittedRing("old","old",true),true);assert.equal(api.canClearSubmittedRing("old","new",true),false);assert.equal(api.canClearSubmittedRing("old","old",false),false);assert.equal(api.canClearSubmittedRing(null,null,true),false);
});
test("pending-file storage preserves an unrelated target rather than overwriting it",()=>{
  assert.equal(api.canReplacePendingUpload(null,id),true);assert.equal(api.canReplacePendingUpload(id,id),true);assert.equal(api.canReplacePendingUpload(other,id),false);
});
