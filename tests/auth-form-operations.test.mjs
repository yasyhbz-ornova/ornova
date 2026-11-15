import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const require=createRequire(import.meta.url),ts=require("typescript"),mounted=new Set();
afterEach(()=>{for(const cleanup of mounted)cleanup();mounted.clear();});
function form({run=async()=>({error:null}),phone=true,google=true}={}){
  const hooks=[],effects=[],cleanups=[],calls=[],routes=[];let cursor=0,tree;
  const browser={location:{origin:"http://localhost:3058",search:"?next=%2Fcontact%3Fintent%3Dprice",assign:path=>routes.push("oauth:"+path)}};
  const react={useState(value){const i=cursor++;hooks[i]??={value};return[hooks[i].value,next=>{hooks[i].value=typeof next==="function"?next(hooks[i].value):next;}];},useRef(value){const i=cursor++;hooks[i]??={current:value};return hooks[i];},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n])){hooks[i]={deps};effects.push(fn);}}};
  const call=(kind,args)=>{calls.push({kind,args});return run(kind,args);};
  const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},loaded={exports:{}};
  new Function("require","exports","window","process",ts.transpileModule(readFileSync(new URL("../components/auth/MagicLinkForm.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==="react"?react:name==="react/jsx-runtime"?jsx:name==="next/navigation"?{useRouter:()=>({replace:path=>routes.push(path),refresh:()=>routes.push("refresh")})}:name==="@/lib/supabase/client"?{createSupabaseBrowserClient:()=>({auth:{signInWithOtp:args=>call(args.email!==undefined?"email":"phone",args),verifyOtp:args=>call("verify",args),signInWithOAuth:async args=>{const result=await call("google",args);if(result.data?.url&&!args.options?.skipBrowserRedirect)browser.location.assign(result.data.url);return result;}}})}:name.startsWith("@/")?loadTs(name.slice(2)+".ts"):require(name),loaded.exports,browser,{env:{NEXT_PUBLIC_SUPABASE_URL:"http://localhost:3058"}});
  const nodes=(node=tree)=>!node||typeof node!=="object"?[]:[node,...[node.props?.children].flat(Infinity).filter(v=>v!=null).flatMap(v=>nodes(v))];
  const text=(node=tree)=>typeof node==="string"?node:!node||typeof node!=="object"?" ":[node.props?.children].flat(Infinity).filter(v=>v!=null).map(v=>text(v)).join(" ");
  function render(){cursor=0;tree=loaded.exports.MagicLinkForm({phoneAuthEnabled:phone,googleAuthEnabled:google});for(const effect of effects.splice(0))cleanups.push(effect());return tree;}
  function edit(type,value){const input=nodes().find(n=>n.type==="input"&&(type==="otp"?n.props.autoComplete==="one-time-code":n.props.type===type));assert.ok(input,type);input.props.onChange({target:{value}});render();}
  function button(label){const b=nodes().find(n=>n.type==="button"&&text(n).trim()===label);assert.ok(b,label);return b;}
  function submit(kind){const autocomplete=kind==="email"?"email":kind==="phone"?"tel":"one-time-code";const f=nodes().find(n=>n.type==="form"&&nodes(n).some(c=>c.type==="input"&&c.props.autoComplete===autocomplete));assert.ok(f,kind);return f.props.onSubmit({preventDefault(){}});}
  const unmount=()=>cleanups.forEach(fn=>fn?.());mounted.add(unmount);render();return{render,nodes,text,edit,button,submit,calls,routes,browser,unmount};
}
test("same-tick repeated email sends are single flight and pending inputs are locked",async()=>{
  let done;const response=new Promise(resolve=>{done=resolve;});const c=form({run:()=>response});c.edit("email","yas@example.com");const first=c.submit("email"),again=c.submit("email");c.render();
  try{assert.equal(c.calls.length,1);assert.ok(c.nodes().filter(n=>n.type==="input").every(n=>n.props.disabled===true));}finally{done({error:null});await Promise.all([first,again]);}
});
test("phone verification locks change-number and empty code never reaches SDK",async()=>{
  let done;const c=form({run:(kind,args)=>kind==="verify"&&args.token?new Promise(resolve=>{done=resolve;}):Promise.resolve({error:null})});c.edit("tel","۰۹۱۲۱۲۳۴۵۶۷");await c.submit("phone");c.render();await c.submit("otp");c.render();assert.equal(c.calls.filter(v=>v.kind==="verify").length,0);
  c.edit("otp","۱۲۳۴۵۶");const first=c.submit("otp");c.render();try{assert.equal(c.button("تغییر شماره موبایل").props.disabled,true);}finally{done({error:null});await first;}
});
test("late verification after unmount cannot navigate; valid completion uses captured destination",async()=>{
  for(const leave of [true,false]){let done;const c=form({run:kind=>kind==="verify"?new Promise(resolve=>{done=resolve;}):Promise.resolve({error:null})});c.edit("tel","09121234567");await c.submit("phone");c.render();c.edit("otp","123456");const pending=c.submit("otp");if(leave)c.unmount();else c.browser.location.search="?next=%2Faccount";done({error:null});await pending;assert.deepEqual(c.routes,leave?[]:["/contact?intent=price","refresh"]);}
});
test("Google errors release busy state and never expose provider details",async()=>{
  const c=form({run:async()=>({error:{message:"PRIVATE-KEY"}})});await c.button("ادامه با حساب گوگل").props.onClick();c.render();assert.equal(c.button("ادامه با حساب گوگل").props.disabled,false);assert.ok(!c.text().includes("PRIVATE-KEY"));
});

test("phone, verify and Google also reject duplicate and cross-method starts",async()=>{
  for(const kind of ["phone","verify","google"]){let done;const response=new Promise(resolve=>{done=resolve;});const c=form({run:current=>current===kind?response:Promise.resolve({error:null})});
    if(kind==="phone")c.edit("tel","09121234567");
    if(kind==="verify"){c.edit("tel","09121234567");await c.submit("phone");c.render();c.edit("otp","۱۲۳۴۵۶");}
    const start=kind==="google"?c.button("ادامه با حساب گوگل").props.onClick:()=>c.submit(kind==="verify"?"otp":"phone");const first=start(),second=start();
    c.render();try{assert.equal(c.calls.filter(v=>v.kind===kind).length,1);const before=c.calls.length;await c.submit("email");assert.equal(c.calls.length,before);}finally{done({error:null,data:{url:"http://localhost:3058/auth/v1/authorize"}});await Promise.all([first,second]);}
  }
});
test("disabled methods are not offered and malformed phone does not contact SDK",async()=>{
  const off=form({phone:false,google:false});assert.ok(!off.nodes().some(n=>n.type==="input"&&n.props.type==="tel"));assert.ok(!off.nodes().some(n=>n.type==="button"&&off.text(n).includes("ادامه با حساب گوگل")));
  const c=form();c.edit("tel","not-a-phone");await c.submit("phone");c.render();assert.equal(c.calls.length,0);assert.ok(c.nodes().some(n=>n.props?.role==="alert"));
});

test("Google URL preparation cannot redirect after unmount, and active redirects stay on configured auth origin",async()=>{
  for(const leave of [true,false]){let done;const c=form({run:()=>new Promise(resolve=>{done=resolve;})});const pending=c.button("ادامه با حساب گوگل").props.onClick();if(leave)c.unmount();done({error:null,data:{url:"http://localhost:3058/auth/v1/authorize?provider=google"}});await pending;assert.deepEqual(c.routes,leave?[]:["oauth:http://localhost:3058/auth/v1/authorize?provider=google"]);assert.equal(c.calls[0].args.options.skipBrowserRedirect,true);}
  for(const url of ["javascript:alert(1)","https://evil.example/auth/v1/authorize?provider=google","http://localhost:3058/other?provider=google"]){const c=form({run:async()=>({error:null,data:{url}})});await c.button("ادامه با حساب گوگل").props.onClick();assert.deepEqual(c.routes,[]);}
});
