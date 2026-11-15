import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";
const Link=props=>{const attributes={...props};delete attributes.prefetch;return React.createElement("a",attributes);};
const inquiry="a1111111-abcd-4111-8111-a11111111111",quoteId="b2222222-abcd-4222-8222-b22222222222",owner="c3333333-abcd-4333-8333-c33333333333";
const payload={version:1,source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,issued_at:"2026-10-22T00:00:00Z",valid_until:"2026-10-23T00:00:00Z",lines:[{description:"قطعهٔ آزمایشی",quantity:2,amount_rial:"9007199254740993"}],discount_rial:"0",tax_rial:"0",total_rial:"9007199254740993"};
const quote={id:quoteId,document_id:"d4444444-abcd-4444-8444-d44444444444",inquiry_id:inquiry,source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,payload,published_at:payload.issued_at,withdrawn_at:null};
function reader({row={id:inquiry,user_id:owner},error=null,quotes=[quote],quoteError=false}={}){
 const reads=[],viewCalls=[];const api=loadTs("lib/account/quote-document.ts",{"@/lib/account/inquiry-quotes":{readInquiryQuotes:async(_c,ids)=>{viewCalls.push(ids);return{data:quotes,error:quoteError};}}});
 const client={from(table){const filters=[];reads.push({table,filters});const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},maybeSingle:async()=>({data:row,error})};return q;}};
 return{api,reads,viewCalls,load:()=>api.readCustomerQuoteDocument(client,{ownerId:owner,inquiryId:inquiry,quoteId})};
}
test("private document verifies exact inquiry owner before any quote view read",async()=>{
 const r=reader();assert.equal(typeof r.api.readCustomerQuoteDocument,"function");const result=await r.load();assert.equal(result.kind,"ready");assert.deepEqual(r.reads,[{table:"inquiries",filters:[["id",inquiry],["user_id",owner]]}]);assert.deepEqual(r.viewCalls,[[inquiry]]);assert.equal(result.quote.id,quoteId);
 for(const row of [null,{id:inquiry,user_id:quoteId},{id:quoteId,user_id:owner}]){const blocked=reader({row});assert.equal((await blocked.load()).kind,"not-found");assert.equal(blocked.viewCalls.length,0);}
});
test("document source errors/missing identity never manufacture a quote or a latest version",async()=>{
 for(const opts of [{error:{message:"PRIVATE"}},{quoteError:true}])assert.equal((await reader(opts).load()).kind,"unavailable");
 assert.equal((await reader({quotes:[]}).load()).kind,"not-found");
 const next={...quote,id:owner,source_revision:2,payload:{...payload,source_revision:2}};
 assert.equal((await reader({quotes:[quote,next]}).load()).isPreviousVersion,true);
 assert.equal((await reader({quotes:[quote,{...next,document_id:"another"}]}).load()).isPreviousVersion,false);
});
function page({user={id:owner},authError=null,authThrows=false,result={kind:"ready",quote,isPreviousVersion:false,checkedAt:"2026-10-24T00:00:00Z"}}={}){
 const calls=[];const loaded=loadTs("app/account/inquiries/[inquiryId]/quotes/[quoteId]/page.tsx",{
  "next/navigation":{notFound(){throw Error("not-found");},redirect(url){throw Error("redirect:"+url);}},"next/link":{default:Link},
  "@/components/account/CustomerQuoteDocument":{CustomerQuoteDocument:"document"},
  "@/lib/account/quote-document":{isQuoteDocumentId:loadTs("lib/account/quote-document.ts").isQuoteDocumentId,readCustomerQuoteDocument:async(_client,args)=>{calls.push(args);return result;}},
  "@/lib/supabase/server":{createSupabaseServerClient:async()=>({auth:{getUser:async()=>{if(authThrows)throw Error("PRIVATE");return{data:{user},error:authError};}}})},
 });return{loaded,calls,open:(params={inquiryId:inquiry,quoteId})=>loaded.default({params:Promise.resolve(params)})};
}
test("document page validates path and authenticates before reads; guest retains only validated destination",async()=>{
 const guest=page({user:null});assert.equal(typeof guest.loaded.default,"function");await assert.rejects(()=>guest.open(),/redirect:\/login\?next=/);assert.equal(guest.calls.length,0);
 const missing=page({user:null,authError:{name:"AuthSessionMissingError"}});await assert.rejects(()=>missing.open(),/redirect:\/login\?next=/);assert.equal(missing.calls.length,0);
 const bad=page();await assert.rejects(()=>bad.open({inquiryId:"bad",quoteId}),/not-found/);assert.equal(bad.calls.length,0);
 for(const options of [{authError:{message:"PRIVATE"}},{authThrows:true}]){const p=page(options),html=renderToStaticMarkup(await p.open());assert.equal(p.calls.length,0);assert.ok(!html.includes("PRIVATE"));assert.ok(!html.includes("Q-TEST"));}
 const p=page();await p.open();assert.deepEqual(p.calls,[{ownerId:owner,inquiryId:inquiry,quoteId}]);assert.equal(p.loaded.dynamic,"force-dynamic");assert.equal(p.loaded.metadata.robots.index,false);
});
test("foreign/missing document is404 and unavailable reads omit document/print content",async()=>{
 await assert.rejects(()=>page({result:{kind:"not-found"}}).open(),/not-found/);
 const html=renderToStaticMarkup(await page({result:{kind:"unavailable"}}).open());assert.ok(!html.includes("Q-TEST"));assert.ok(!html.includes("<document"));assert.ok(html.includes("دریافت"));
});
test("printable document keeps exact whole-row amounts, source revision and negative status, never private costing",()=>{
 const loaded=loadTs("components/account/CustomerQuoteDocument.tsx",{"next/link":{default:Link},"@/components/commerce/InquiryQuoteCard":loadTs("components/commerce/InquiryQuoteCard.tsx"),"./CustomerQuoteDocument.module.css":{default:new Proxy({},{get:(_o,k)=>String(k)})},"./PrintDocumentButton":{PrintDocumentButton:()=>React.createElement("button",null,"چاپ")},"./AcceptQuoteButton":{AcceptQuoteButton:()=>React.createElement("button",null,"پذیرش")}});
 assert.equal(typeof loaded.CustomerQuoteDocument,"function");const render=changes=>renderToStaticMarkup(React.createElement(loaded.CustomerQuoteDocument,{quote,isPreviousVersion:false,checkedAt:"2026-10-24T00:00:00Z",...changes}));
 const html=render();assert.ok(html.includes("۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۳ تومان"));assert.ok(html.includes("۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳"));assert.ok(html.includes("Q-TEST"));assert.ok(html.includes("به وقت تهران"));assert.ok(html.includes("فاکتور یا رسید پرداخت نیست"));assert.ok(html.includes("مهلت پیشنهاد گذشته"));assert.ok(!/true_cost|profit|source_key|پرداخت‌شده/.test(html));
 const old=render({isPreviousVersion:true,quote:{...quote,withdrawn_at:"2026-10-23T01:00:00Z"}});assert.ok(old.includes("نسخهٔ پیشین"));assert.ok(old.includes("پس گرفته شده"));assert.ok(old.includes("زمان دریافت"));
});

test("print links are customer opt-in and point to the exact quote rather than a latest-version alias",()=>{
 const {InquiryQuoteList}=loadTs("components/commerce/InquiryQuoteCard.tsx",{"next/link":{default:Link}});
 const render=customerDocuments=>renderToStaticMarkup(React.createElement(InquiryQuoteList,{quotes:[quote],now:"2026-10-24T00:00:00Z",customerDocuments}));
 assert.ok(!render(false).includes("دیدن و چاپ"));assert.ok(render(true).includes(`/account/inquiries/${inquiry}/quotes/${quoteId}`));
});

test("print margin references cannot inject CSS through a source document number",()=>{
 const loaded=loadTs("components/account/CustomerQuoteDocument.tsx",{"next/link":{default:Link},"@/components/commerce/InquiryQuoteCard":loadTs("components/commerce/InquiryQuoteCard.tsx"),"./CustomerQuoteDocument.module.css":{default:{}},"./PrintDocumentButton":{PrintDocumentButton:()=>null},"./AcceptQuoteButton":{AcceptQuoteButton:()=>null}});
 const html=renderToStaticMarkup(React.createElement(loaded.CustomerQuoteDocument,{quote:{...quote,source_quote_no:'Q-"; color:red; /*'},isPreviousVersion:false,checkedAt:"2026-10-24T00:00:00Z"}));
 const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert.ok(!style.includes("color:red"));assert.ok(style.includes("counter(page, persian)"));assert.ok(style.includes("\\22 "));
});
