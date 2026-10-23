import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";
const model=loadTs("lib/commerce/quote-editor-state.ts");
const payload={version:1,source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,issued_at:"2026-10-22T00:00:00Z",valid_until:"2026-10-23T00:00:00Z",lines:[{description:"آزمایش",quantity:2,amount_rial:"15"}],discount_rial:"0",tax_rial:"0",total_rial:"15"};
test("editing invalidates preview and publication cannot start before valid review",()=>{
  assert.equal(typeof model.createQuoteEditorState,"function");
  let state=model.createQuoteEditorState("a"); assert.equal(model.quoteEditorReducer(state,{type:"publish"}).phase,"editing");
  state=model.quoteEditorReducer(state,{type:"review",payload,now:"2026-10-22T01:00:00Z"});assert.equal(state.phase,"reviewing");
  state=model.quoteEditorReducer(state,{type:"edit"});assert.equal(state.reviewed,null);assert.equal(state.phase,"editing");
});
test("pending review is frozen, late responses cannot affect another inquiry and failures preserve review",()=>{
  assert.equal(typeof model.createQuoteEditorState,"function");
  let state=model.quoteEditorReducer(model.createQuoteEditorState("a"),{type:"review",payload,now:"2026-10-22T01:00:00Z"});
  state=model.quoteEditorReducer(state,{type:"publish"});assert.equal(state.phase,"pending");
  assert.equal(model.quoteEditorReducer(state,{type:"edit"}),state);
  assert.equal(model.quoteEditorReducer(state,{type:"success",inquiryId:"b",id:"wrong"}),state);
  const other=model.createQuoteEditorState("b");assert.equal(model.quoteEditorReducer(other,{type:"success",inquiryId:"a",id:"wrong"}),other);
  state=model.quoteEditorReducer(state,{type:"failure",inquiryId:"a",error:"network"});assert.equal(state.phase,"reviewing");assert.equal(state.reviewed.total_rial,"15");
  state=model.quoteEditorReducer(state,{type:"publish"});state=model.quoteEditorReducer(state,{type:"success",inquiryId:"a",id:"stored-id"});assert.equal(state.phase,"saved");assert.equal(state.reviewed,null);assert.equal(state.receiptId,"stored-id");
});
test("customer card renders exact amounts and source revision without internal details or payment claims",()=>{
  const {InquiryQuoteCard}=loadTs("components/commerce/InquiryQuoteCard.tsx");assert.equal(typeof InquiryQuoteCard,"function");
  const quote={id:"q",inquiry_id:"a",source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,payload,published_at:"2026-10-22T00:00:00Z",withdrawn_at:null};
  const html=renderToStaticMarkup(React.createElement(InquiryQuoteCard,{quote,isPreviousVersion:false,now:"2026-10-22T01:00:00Z"}));
  assert.match(html,/۱٫۵ تومان/);assert.match(html,/Q-TEST/);assert.doesNotMatch(html,/پرداخت‌شده|true_cost|profit|<button/);
  const withdrawn=renderToStaticMarkup(React.createElement(InquiryQuoteCard,{quote:{...quote,withdrawn_at:"2026-10-22T01:00:00Z"},isPreviousVersion:true,now:"2026-10-24T00:00:00Z"}));
  assert.match(withdrawn,/پس گرفته شده/);assert.match(withdrawn,/نسخهٔ پیشین/);
});
