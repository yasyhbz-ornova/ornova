import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const require=createRequire(import.meta.url),ts=require("typescript"),id="a1111111-abcd-4111-8111-a11111111111",calc="c3333333-abcd-4333-8333-c33333333333";
const basis={id:calc,revision:2,method:"cost-plus",pre_tax_rial:"1000",tax_rial:"1",total_rial:"1001"};
const mounted=new Set();afterEach(()=>{for(const unmount of mounted)unmount();mounted.clear();});
const local=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}T${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
function editor({enabled=true,closed=false,fetcher=async()=>Response.json({id:calc,created:true}),source=basis}={}){
  let props={enabled,inquiry:{id,label:"مشتری",closed},basis:source},cursor=0,tree;const hooks=[],effects=[],cleanups=[],calls=[];
  const react={useReducer(reducer,arg,init){const i=cursor++;hooks[i]??={value:init?init(arg):arg};return[hooks[i].value,a=>{hooks[i].value=reducer(hooks[i].value,a);}];},useState(value){const i=cursor++;hooks[i]??={value:typeof value==="function"?value():value};return[hooks[i].value,next=>{hooks[i].value=typeof next==="function"?next(hooks[i].value):next;}];},useRef(value){const i=cursor++;hooks[i]??={current:value};return hooks[i];},useEffect(effect,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n])){hooks[i]={deps};effects.push(effect);}}};
  const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},loaded={exports:{}},path=new URL("../components/admin/CalculatedQuoteEditor.tsx",import.meta.url);
  if(existsSync(path))new Function("require","exports","fetch","requestAnimationFrame",ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==="react"?react:name==="react/jsx-runtime"?jsx:name==="next/link"?{default:"a"}:name==="@/components/commerce/InquiryQuoteCard"?{InquiryQuoteCard:"customer-preview"}:name.endsWith(".module.css")?{default:new Proxy({},{get:(_o,k)=>String(k)})}:name.startsWith("@/")?loadTs(name.slice(2)+".ts"):require(name),loaded.exports,async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return fetcher(url,init);},fn=>fn());
  function expand(n){if(!n||typeof n!=="object")return n;if(Array.isArray(n))return n.map(expand);if(typeof n.type==="function")return expand(n.type(n.props));return{...n,props:{...n.props,children:[n.props?.children].flat(Infinity).map(expand)}};}
  function render(){cursor=0;assert.equal(typeof loaded.exports.CalculatedQuoteEditor,"function");tree=expand(loaded.exports.CalculatedQuoteEditor(props));for(const e of effects.splice(0))cleanups.push(e());return tree;}
  const nodes=(n=tree)=>!n||typeof n!=="object"?[]:[n,...[n.props?.children].flat(Infinity).filter(child=>child!=null).flatMap(child=>nodes(child))];
  const text=(n=tree)=>typeof n==="string"||typeof n==="number"?String(n):!n||typeof n!=="object"?" ":[n.props?.children].flat(Infinity).filter(child=>child!=null).map(child=>text(child)).join(" ");
  function edit(key,value){const n=nodes().find(n=>n.props?.id===`calculated-${key}`);assert.ok(n,key);n.props.onChange({target:{value}});render();}
  function fill(){for(const[k,v]of Object.entries({source_quote_no:"Q-test",source_order_no:"O-test",source_revision:"۱",quantity:"۲",description:"شرح مشتری",issued_at:local(new Date(Date.now()-60000)),valid_until:local(new Date(Date.now()+3600000))}))edit(k,v);}
  const button=label=>{const n=nodes().find(n=>n.type==="button"&&text(n).trim()===label);assert.ok(n,label);return n;};
  const review=()=>{nodes().find(n=>n.type==="form").props.onSubmit({preventDefault(){}});render();};
  const unmount=()=>cleanups.forEach(fn=>fn?.());mounted.add(unmount);render();return{render,nodes,text,edit,fill,button,review,calls,set(v){props={...props,...v};render();},unmount};
}
test("invalid draft sends nothing; off/closed valid review cannot publish",async()=>{
  const c=editor();c.review();assert.equal(c.calls.length,0);assert.ok(c.nodes().some(n=>n.props?.role==="alert"));
  for(const options of [{enabled:false},{closed:true}]){const d=editor(options);d.fill();d.review();assert.equal(d.button("ثبت و نمایش به مشتری").props.disabled,true);await d.button("ثبت و نمایش به مشتری").props.onClick();assert.equal(d.calls.length,0);}
});
test("real publish handler sends only reviewed metadata and strict success prevents another submit",async()=>{
  const c=editor();c.fill();c.review();await c.button("ثبت و نمایش به مشتری").props.onClick();c.render();assert.equal(c.calls[0].url,`/api/inquiries/${id}/quotes/from-calculation`);assert.equal(c.calls[0].body.quantity,2);assert.equal(c.calls[0].body.calculation_id,calc);assert.ok(!("total_rial"in c.calls[0].body));assert.equal(c.calls[0].init.cache,"no-store");assert.match(c.text(),/پیشنهاد ثبت شد/);assert.equal(c.nodes().filter(n=>n.type==="button"&&c.text(n).trim()==="ثبت و نمایش به مشتری").length,0);
});
test("lost reply keeps exact captured timestamps and tax for retry even after closure; edits cannot replace it",async()=>{
  let attempt=0;const c=editor({fetcher:async()=>++attempt===1?Promise.reject(Error("PRIVATE")):Response.json({id:calc,created:false})});c.fill();c.review();await c.button("ثبت و نمایش به مشتری").props.onClick();c.render();c.set({inquiry:{id,label:"مشتری",closed:true}});c.edit("quantity","5");await c.button("بررسی یا تلاش دوبارهٔ همان پیشنهاد").props.onClick();c.render();assert.deepEqual(c.calls[1].body,c.calls[0].body);assert.ok(!c.text().includes("PRIVATE"));assert.match(c.text(),/نسخهٔ ثبت‌شده یافت شد/);
});
test("pending publish is single flight and unmount aborts its own request without claiming rollback",async()=>{
  let done;const c=editor({fetcher:()=>new Promise(resolve=>{done=resolve;})});c.fill();c.review();const pending=c.button("ثبت و نمایش به مشتری").props.onClick();c.render();await c.button("در حال ثبت…").props.onClick();assert.equal(c.calls.length,1);c.unmount();assert.equal(c.calls[0].init.signal.aborted,true);done(Response.json({id:calc,created:true}));await pending;
});
