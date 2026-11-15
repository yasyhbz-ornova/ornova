import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const require=createRequire(import.meta.url),ts=require("typescript");
const id="a1111111-abcd-4111-8111-a11111111111";
const request={schema_version:1,request_id:"48a422dd-a532-4a8d-bb65-49b1a97550ee",method:"cost-plus",policy_version:"synthetic-v1",input:{true_cost_rial:"1000000",mandatory_buffer_rial:"100000",profit_method:"markup",profit_bp:2500,rounding:"none",rounding_step_rial:"0",tax_bp:900,override_pre_tax_rial:null,override_reason:null}};
const preview={...request,algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"1100000",target_rial:"1250000",pre_tax_rial:"1250000",tax_rial:"112500",total_rial:"1362500",effective_margin_bp:2000,warnings:[]}};
const row={id:"44444444-4444-4444-8444-444444444444",inquiry_id:id,revision:1,source_key:"fixture",created_at:"2026-10-23T10:00:00Z",created_by:"33333333-3333-4333-8333-333333333333",snapshot:preview};
function controls({storageEnabled=true,closed=false,handler}={}) {
  let props={inquiry:{id,label:"پروندهٔ آزمایشی",closed},storageEnabled,request,preview},cursor=0,tree;
  const hooks=[],effects=[],cleanups=[],calls=[];
  const react={
    useReducer(reducer,arg,init){const i=cursor++;hooks[i]??={value:init?init(arg):arg};return[hooks[i].value,action=>{hooks[i].value=reducer(hooks[i].value,action);}];},
    useRef(value){const i=cursor++;hooks[i]??={current:value};return hooks[i];},
    useCallback(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n]))hooks[i]={fn,deps};return hooks[i].fn;},
    useEffect(effect,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n])){hooks[i]={deps};effects.push(effect);}},
  };
  const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},loaded={exports:{}};
  const file=new URL("../components/admin/PricingCalculationRecords.tsx",import.meta.url);
  if(existsSync(file))new Function("require","exports","fetch",ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==="react"?react:name==="react/jsx-runtime"?jsx:name==="next/link"?{default:"a"}:name.endsWith(".module.css")?{default:new Proxy({},{get:(_o,k)=>String(k)})}:name.startsWith("@/")?loadTs(name.slice(2)+".ts"):require(name),loaded.exports,async(url,init={})=>{const call={url,init,body:init.body?JSON.parse(init.body):null};calls.push(call);if(handler)return handler(call);return Response.json(init.method==="POST"?{created:true,record:row}:{records:[],next_before:null});});
  function expand(node){if(!node||typeof node!=="object")return node;if(Array.isArray(node))return node.map(expand);if(typeof node.type==="function")return expand(node.type(node.props));return{...node,props:{...node.props,children:[node.props?.children].flat(Infinity).map(expand)}};}
  function render(){cursor=0;assert.equal(typeof loaded.exports.PricingCalculationRecords,"function");tree=expand(loaded.exports.PricingCalculationRecords(props));for(const effect of effects.splice(0))cleanups.push(effect());return tree;}
  function nodes(node=tree){return !node||typeof node!=="object"?[]:[node,...[node.props?.children].flat(Infinity).filter(n=>n!=null).flatMap(nodes)];}
  function text(node=tree){return typeof node==="string"||typeof node==="number"?String(node):!node||typeof node!=="object"?" ":[node.props?.children].flat(Infinity).filter(n=>n!=null).map(text).join(" ");}
  const button=label=>{const n=nodes().find(n=>n.type==="button"&&text(n).trim()===label);assert.ok(n,label);return n;};
  render();return{render,text,nodes,button,calls,set(value){props={...props,...value};render();},async flush(){await new Promise(setImmediate);render();},unmount(){cleanups.forEach(fn=>fn?.());}};
}
test("private save controls are disabled without capability, closed inquiry or current preview",async()=>{
  for(const options of [{storageEnabled:false},{closed:true}]){const c=controls(options);await c.flush();assert.equal(c.button("ثبت خصوصی در پرونده").props.disabled,true);await c.button("ثبت خصوصی در پرونده").props.onClick();assert.equal(c.calls.filter(v=>v.init.method==="POST").length,0);}
  const c=controls();c.set({request:null,preview:null});assert.equal(c.button("ثبت خصوصی در پرونده").props.disabled,true);
});
test("real handler sends only captured PricingRequest and confirms actual stored revision",async()=>{
  const c=controls();await c.flush();await c.button("ثبت خصوصی در پرونده").props.onClick();await c.flush();
  const posted=c.calls.find(v=>v.init.method==="POST");assert.equal(posted.url,`/api/inquiries/${id}/calculations`);assert.deepEqual(posted.body,request);assert.ok(!("result"in posted.body));assert.equal(posted.init.cache,"no-store");assert.match(c.text(),/نسخهٔ\s+۱/);assert.match(c.text(),/۱٬۳۶۲٬۵۰۰ ریال/);
});
test("lost reply then edited/new preview retries the old ID and explicitly displays changed saved amount",async()=>{
  let attempt=0;const saved={...row,snapshot:{...preview,result:{...preview.result,pre_tax_rial:"1250001",total_rial:"1362501"}}};
  const c=controls({handler:async call=>call.init.method!=="POST"?Response.json({records:[],next_before:null}):++attempt===1?Promise.reject(Error("private-secret")):Response.json({created:false,record:saved})});
  await c.flush();await c.button("ثبت خصوصی در پرونده").props.onClick();c.render();
  c.set({request:{...request,request_id:row.id},preview:{...preview,request_id:row.id}});
  await c.button("بررسی یا تلاش دوبارهٔ همان ثبت").props.onClick();await c.flush();
  assert.equal(c.calls.filter(v=>v.init.method==="POST")[1].body.request_id,request.request_id);assert.ok(!c.text().includes("private-secret"));assert.match(c.text(),/۱٬۳۶۲٬۵۰۱ ریال/);assert.match(c.text(),/با پیش‌نمایش قبلی تفاوت دارد/);
});
test("pending save is single flight, survives form edits as a separate receipt, and unmount aborts own fetch",async()=>{
  let resolve;const c=controls({handler:call=>call.init.method==="POST"?new Promise(done=>{resolve=done;}):Response.json({records:[],next_before:null})});await c.flush();
  const pending=c.button("ثبت خصوصی در پرونده").props.onClick();c.render();await c.button("در حال ثبت…").props.onClick();assert.equal(c.calls.filter(v=>v.init.method==="POST").length,1);
  c.set({request:null,preview:null});resolve(Response.json({created:true,record:row}));await pending;await c.flush();assert.match(c.text(),/نسخهٔ\s+۱/);
  const d=controls({handler:()=>new Promise(()=>{})});d.unmount();assert.equal(d.calls[0].init.signal.aborted,true);
});
test("malformed history shows failure rather than empty success and unknown replies never become saved",async()=>{
  const c=controls({handler:async()=>Response.json({records:[{...row,inquiry_id:row.id}],next_before:null})});await c.flush();assert.match(c.text(),/تاریخچه دریافت نشد/);await c.button("ثبت خصوصی در پرونده").props.onClick();c.render();assert.match(c.text(),/ثبت تأیید نشد/);
});

test("private history displays exact large rial and milligram units, gram policy and escaped internal notes",async()=>{
  const max="9223372036854775807";
  const gram={...row,snapshot:{schema_version:1,request_id:request.request_id,method:"gram-sale",policy_version:"synthetic-v1",input:{weight_mg:"1234",rate_per_gram_rial:max,under_2g_fee_rial:"0",under_4g_fee_rial:"0",stone_total_rial:"0",stone_count:0,setting_per_stone_rial:"0",packaging_rial:"0",logistics_rial:"0",design_rial:"0"},algorithm_version:"pcs-gram-explicit-fees-v1",result:{base_rial:max,light_piece_rial:"0",setting_rial:"0",pre_tax_rial:max,tax_rial:"0",total_rial:max,warnings:["GRAM_SALE_HAS_NO_TAX_POLICY"]}}};
  const c=controls({handler:async()=>Response.json({records:[gram],next_before:null})});await c.flush();
  assert.match(c.text(),/۹٬۲۲۳٬۳۷۲٬۰۳۶٬۸۵۴٬۷۷۵٬۸۰۷ ریال/);assert.match(c.text(),/۱٫۲۳۴ گرم/);assert.match(c.text(),/معافیت مالیاتی نیست/);
  const note="<img src=x onerror=alert(1)>";
  const d=controls({handler:async()=>Response.json({records:[{...row,snapshot:{...preview,input:{...preview.input,override_reason:note}}}],next_before:null})});await d.flush();
  assert.ok(d.text().includes(note));assert.ok(!d.nodes().some(n=>n.type==="img"||n.props?.dangerouslySetInnerHTML));
});
