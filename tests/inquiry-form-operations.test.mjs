import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const require=createRequire(import.meta.url),ts=require("typescript");
const id="a1111111-abcd-4111-8111-a11111111111",other="b2222222-abcd-4222-8222-b22222222222";
const basketKey="ornova-request-basket:v2",draftKey="ornova-inquiry-draft",pendingKey="ornova-pending-upload-inquiry",ringKey="ornova-ring-draft";
const item={slug:"lajvard-shab",name:"لاجورد",category:"انگشتر",quantity:1};
const ring=JSON.stringify({base:"باریک",shape:"گرد",color:"لاجوردی",ornament:"بدون جزئیات افزوده"});
function storage(seed={}){const values=new Map(Object.entries(seed));return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
function form({run=async()=>({status:201,json:async()=>({id})}),upload=async()=>({success:true}),local=storage({[basketKey]:JSON.stringify([item])}),session=storage(),props={requestBasketContext:true},file=null}={}){
  const hooks=[],effects=[],cleanups=[],calls=[],uploads=[];let cursor=0,tree;
  const fields=Object.fromEntries(Object.entries({name:"یاس",contact:"yas@example.com",message:"درخواست بررسی",designPreserve:"",designAvoid:"",file:""}).map(([k,value])=>[k,{value,...(k==="file"?{files:file?[file]:[]}:{}),focus(){}}]));
  const formElement={elements:{namedItem:k=>fields[k]},querySelector:()=>null};
  const browser={localStorage:local,sessionStorage:session,location:{search:""},addEventListener(){},removeEventListener(){},dispatchEvent(){}};
  const react={useState(initial){const i=cursor++;hooks[i]??={value:typeof initial==="function"?initial():initial};return[hooks[i].value,next=>{hooks[i].value=typeof next==="function"?next(hooks[i].value):next;}];},useRef(value){const i=cursor++;hooks[i]??={current:value};return hooks[i];},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n])){hooks[i]={deps};effects.push(fn);}},useMemo:fn=>fn(),useSyncExternalStore:(_,snapshot)=>snapshot()};
  const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},loaded={exports:{}};
  new Function("require","exports","window","fetch","FormData","document",ts.transpileModule(readFileSync(new URL("../components/commerce/InquiryForm.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==="react"?react:name==="react/jsx-runtime"?jsx:name==="next/link"?{default:"a"}:name==="./ProductPreferencesSummary"?{ProductPreferencesSummary:"summary"}:name==="@/lib/supabase/client"?{createSupabaseBrowserClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})}:name==="@/lib/commerce/upload-inquiry-file"?{uploadInquiryReferenceFile:(target,file)=>{uploads.push({target,file});return upload(target,file);}}:name.startsWith("@/")?loadTs(name.slice(2)+".ts"):require(name),loaded.exports,browser,async(url,options)=>{calls.push({url,options});const response=await run(url,options);return{...response,ok:response.status>=200&&response.status<300};},class {get(k){return k==="file"?fields.file.files[0]:fields[k]?.value;}},{activeElement:null});
  const nodes=(node=tree)=>!node||typeof node!=="object"?[]:[node,...[node.props?.children].flat(Infinity).filter(v=>v!=null).flatMap(v=>nodes(v))];
  const text=(node=tree)=>typeof node==="string"?node:!node||typeof node!=="object"?" ":[node.props?.children].flat(Infinity).filter(v=>v!=null).map(v=>text(v)).join(" ");
  function render(){cursor=0;tree=loaded.exports.InquiryForm(props);while(typeof tree.type==="function")tree=tree.type(tree.props);for(const n of nodes()){if(n.props?.ref)n.props.ref.current=n.type==="form"?formElement:fields[n.props.name];}for(const effect of effects.splice(0))cleanups.push(effect());return tree;}
  const button=label=>{const b=nodes().find(n=>n.type==="button"&&text(n).includes(label));assert.ok(b,label);return b;};
  render();return{render,nodes,text,button,calls,uploads,local,session,fields,submit:()=>nodes().find(n=>n.type==="form").props.onSubmit({preventDefault(){},currentTarget:formElement}),unmount:()=>cleanups.forEach(fn=>fn?.()),contextKey:next=>loaded.exports.InquiryForm(next).key};
}

test("inquiry POST is single flight and uncertainty blocks repeat including reload",async()=>{
  const d=deferred(),c=form({run:()=>d.promise});const first=c.submit(),second=c.submit();assert.equal(c.calls.length,1);d.resolve({status:503,json:async()=>({error:"PRIVATE"})});await Promise.all([first,second]);c.render();
  assert.equal(JSON.parse(c.session.getItem(draftKey)).submissionUncertain,true);assert.ok(c.local.getItem(basketKey).includes("lajvard"));assert.ok(!c.text().includes("PRIVATE"));await c.submit();assert.equal(c.calls.length,1);
  const reloaded=form({session:c.session,local:c.local});await reloaded.submit();assert.equal(reloaded.calls.length,0);assert.ok(reloaded.text().includes("بررسی"));
});
test("network and malformed success preserve intent and never upload",async()=>{
  for(const run of [async()=>{throw Error("lost reply");},async()=>({status:201,json:async()=>({})})]){const c=form({run,file:new File(["test"],"ref.png")});await c.submit();c.render();assert.equal(c.uploads.length,0);assert.ok(c.local.getItem(basketKey).includes("lajvard"));assert.equal(JSON.parse(c.session.getItem(draftKey)).submissionUncertain,true);assert.ok(!c.text().includes("درخواست شما ثبت شد."));}
});
test("known rejection restores editable login draft without uncertain marker",async()=>{
  for(const status of [400,401,403]){const c=form({run:async()=>({status,json:async()=>({error:"PRIVATE"})})});await c.submit();c.render();assert.notEqual(JSON.parse(c.session.getItem(draftKey)).submissionUncertain,true);assert.ok(c.nodes().some(n=>n.type==="input"&&!n.props.disabled));assert.ok(!c.text().includes("PRIVATE"));}
});
test("receipt and pending-file target are established before upload; unrelated target survives",async()=>{
  const d=deferred(),local=storage({[pendingKey]:other,[basketKey]:JSON.stringify([item])});
  // The other marker appears after this request starts, as from another tab.
  local.removeItem(pendingKey);const c=form({local,file:new File(["test"],"ref.png"),upload:()=>d.promise,run:async()=>{local.setItem(pendingKey,other);return{status:201,json:async()=>({id})};}});
  const submission=c.submit();await new Promise(r=>setImmediate(r));c.render();assert.equal(c.uploads[0].target,id);assert.equal(local.getItem(pendingKey),other);assert.equal(c.session.getItem(draftKey),null);assert.equal(JSON.parse(local.getItem(basketKey)).length,0);
  await c.button("تلاش دوباره").props.onClick();assert.equal(c.uploads.length,1);d.resolve({success:false});await submission;c.render();
  const retry=c.button("تلاش دوباره").props.onClick(),again=c.button("تلاش دوباره").props.onClick();await Promise.all([retry,again]);assert.equal(c.uploads.length,2);assert.ok(c.uploads.every(v=>v.target===id));assert.equal(local.getItem(pendingKey),other);
});
test("success clears only included unchanged ring, and completion after unmount performs no cleanup/upload",async()=>{
  for(const included of [true,false]){const local=storage({[ringKey]:ring});const c=form({local,props:{includeRingDraft:included}});await c.submit();assert.equal(local.getItem(ringKey),included?null:ring);}
  const d=deferred(),local=storage({[ringKey]:ring});const c=form({local,run:()=>d.promise});const pending=c.submit();local.setItem(ringKey,ring+" ");d.resolve({status:201,json:async()=>({id})});await pending;assert.equal(local.getItem(ringKey),ring+" ");
  const lost=deferred(),away=form({run:()=>lost.promise,file:new File(["test"],"ref.png")});const active=away.submit();away.unmount();lost.resolve({status:201,json:async()=>({id})});await active;assert.equal(away.uploads.length,0);assert.ok(away.local.getItem(basketKey).includes("lajvard"));assert.equal(JSON.parse(away.session.getItem(draftKey)).submissionUncertain,true);
});
test("form context key changes across source/product/intent rather than reusing an old receipt",()=>{
  const c=form();assert.notEqual(c.contextKey({sourceContext:"custom-design"}),c.contextKey({sourceContext:"ring-builder"}));assert.notEqual(c.contextKey({intent:"price"}),c.contextKey({intent:"question"}));
});

test("a restored studio inquiry excludes the separate ring draft and leaves it available", async () => {
  const message = "آویز نقره با فرم بیضی";
  const local = storage({ [ringKey]: ring });
  const session = storage({ [draftKey]: JSON.stringify({ message, sourceContext: "custom-design" }) });
  const inquiry = form({ local, session, props: { galleryMode: true } });

  assert.equal(inquiry.fields.message.value, message);
  assert.doesNotMatch(inquiry.text(), /پیش‌طرح مفهومی همراه درخواست/);
  await inquiry.submit();

  assert.equal(inquiry.calls.length, 1);
  const payload = JSON.parse(inquiry.calls[0].options.body);
  assert.match(payload.message, /آویز نقره با فرم بیضی/);
  assert.match(payload.message, /مسیر درخواست: طراحی اختصاصی/);
  assert.doesNotMatch(payload.message, /پهنای رکاب/);
  assert.equal(local.getItem(ringKey), ring);
});

test("unavailable storage keeps the page gated and explains that persistence failed",async()=>{
  const session={getItem:()=>null,setItem(){throw Error("unavailable");},removeItem(){throw Error("unavailable");}};
  const c=form({session,run:async()=>{throw Error("lost");}});await c.submit();c.render();await c.submit();assert.equal(c.calls.length,1);assert.ok(c.text().includes("مرورگر پیش‌نویس را ذخیره نکرد"));
  c.button("پرونده‌ها را بررسی کردم").props.onClick();c.render();assert.ok(c.nodes().some(n=>n.type==="input"&&!n.props.disabled));
});

test("an acknowledged uncertain draft is editable, while a newer draft/basket survives old success",async()=>{
  const c=form({run:async()=>({status:503,json:async()=>({})})});await c.submit();c.render();c.button("پرونده‌ها را بررسی کردم").props.onClick();c.render();assert.equal(JSON.parse(c.session.getItem(draftKey)).submissionUncertain,false);
  const d=deferred(),newer=JSON.stringify({message:"new draft"}),next=form({run:()=>d.promise});const pending=next.submit();next.session.setItem(draftKey,newer);next.local.setItem(basketKey,JSON.stringify([{...item,quantity:3}]));d.resolve({status:201,json:async()=>({id})});await pending;assert.equal(next.session.getItem(draftKey),newer);assert.equal(JSON.parse(next.local.getItem(basketKey))[0].quantity,2);
});

test("a reload during file upload finds a known target, and upload success cannot delete another reminder",async()=>{
  const d=deferred(),c=form({file:new File(["test"],"ref.png"),upload:()=>d.promise});const active=c.submit();await new Promise(r=>setImmediate(r));
  assert.equal(c.local.getItem(pendingKey),id);assert.equal(c.session.getItem(draftKey),null);
  const reload=form({local:c.local,session:c.session});await reload.submit();assert.equal(reload.calls.length,0);assert.ok(reload.button("تلاش دوباره"));
  c.local.setItem(pendingKey,other);d.resolve({success:true});await active;c.render();assert.equal(c.local.getItem(pendingKey),other);assert.ok(!c.nodes().some(n=>n.type==="button"&&c.text(n).includes("تلاش دوباره")));
});

test("basket requests recheck the raw selection before submitting, including corruption after the last render",async()=>{
  for(const raw of ["null","corrupt",JSON.stringify([item,null]),JSON.stringify([item,item]),"[]"]){
    const c=form();c.local.setItem(basketKey,raw);await c.submit();c.render();
    assert.equal(c.calls.length,0);assert.equal(c.local.getItem(basketKey),raw);assert.equal(c.session.getItem(draftKey),null);
  }
});
test("restoring a request draft never overwrites unreadable current basket data",()=>{
  const raw=JSON.stringify([item,null]),local=storage({[basketKey]:raw});
  form({local,session:storage({[draftKey]:JSON.stringify({message:"draft",items:[{...item,slug:"another"}]})})});
  assert.equal(local.getItem(basketKey),raw);
});
test("a confirmed receipt preserves newly unreadable basket data and reports cleanup failure",async()=>{
  const d=deferred(),c=form({run:()=>d.promise});const pending=c.submit();
  const raw=JSON.stringify([item,null]);c.local.setItem(basketKey,raw);d.resolve({status:201,json:async()=>({id})});await pending;c.render();
  assert.equal(c.local.getItem(basketKey),raw);assert.ok(c.text().includes("درخواست شما ثبت شد."));assert.ok(c.text().includes("پاک‌سازی انتخاب‌های ارسال‌شده"));
  assert.ok(!c.text().includes("ارسال انتخاب‌های ناقص متوقف شده است"));
});
test("custom design can proceed without consuming an unrelated unreadable basket",async()=>{
  const raw=JSON.stringify([item,null]),local=storage({[basketKey]:raw});
  const c=form({local,props:{sourceContext:"custom-design",includeRingDraft:false}});await c.submit();
  assert.equal(c.calls.length,1);assert.equal(local.getItem(basketKey),raw);assert.deepEqual(JSON.parse(c.calls[0].options.body).items,[]);
});
test("cleared explicit selection does not show a missing-row error next to its confirmed receipt",async()=>{
  const c=form({props:{productContext:{slug:item.slug,name:item.name,category:item.category},productSelectionKey:item.slug,intent:"price"}});
  await c.submit();c.render();assert.ok(c.text().includes("درخواست شما ثبت شد."));assert.ok(!c.text().includes("این انتخاب دیگر در سبد نیست"));
});
test("explicit basket route is not relabelled as custom design by an older draft",async()=>{
  const c=form({session:storage({[draftKey]:JSON.stringify({sourceContext:"custom-design",message:"یادداشت قبلی",designPreserve:"یادداشت طراحی قبلی"})})});
  await c.submit();
  const body=JSON.parse(c.calls[0].options.body);
  assert.equal(body.items.length,1);assert.ok(!body.message.includes("مسیر درخواست: طراحی اختصاصی"));assert.ok(!body.message.includes("راهنمای طراحی اختصاصی"));
});
