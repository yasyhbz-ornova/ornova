import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
function load(path, dependencies = {}, browser) {
  const file = new URL(`../${path}`, import.meta.url), loaded = { exports: {} };
  new Function("require", "exports", "window", ts.transpileModule(existsSync(file) ? readFileSync(file,"utf8") : "", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX } }).outputText)((name)=>dependencies[name]??require(name), loaded.exports, browser);
  return loaded.exports;
}
const prefs = load("lib/commerce/product-preferences.ts");
const basket = load("lib/commerce/request-basket.ts", {"./product-preferences":prefs});
const configs = load("lib/commerce/request-configurations.ts", {"./product-preferences":prefs,"./request-basket":basket});
const identity = { slug:"lajvard-shab-ring",name:"انگشتر",category:"انگشتر" };
const a="11111111-1111-4111-8111-111111111111", b="22222222-2222-4222-8222-222222222222";
const size = n => ({version:1,ring_size_eu:n});

test("same model keeps independent configurations; identical save is idempotent, not an increment",()=>{
  assert.equal(typeof configs.applyProductConfiguration,"function");
  const first=configs.applyProductConfiguration([],identity,size(54),a);
  const second=configs.applyProductConfiguration(first.items,identity,size(56),b);
  assert.equal(second.success,true); assert.equal(second.items.length,2);
  assert.deepEqual(second.items.map(i=>i.preferences.ring_size_eu),[54,56]);
  const replay=configs.applyProductConfiguration(second.items,identity,size(54),b);
  assert.equal(replay.key,a); assert.deepEqual(replay.items,second.items);
});

test("explicit configuration edit preserves only its own identity, quantity and note; stale/colliding edits never write",()=>{
  assert.equal(typeof configs.applyProductConfiguration,"function");
  const rows=[{...identity,lineId:a,quantity:2,note:"یادداشت اول",preferences:size(54)},{...identity,lineId:b,quantity:1,note:"یادداشت دوم",preferences:size(56)}];
  const edit=configs.applyProductConfiguration(rows,identity,size(55),b,a);
  assert.equal(edit.success,true); assert.deepEqual(edit.items[0],{...rows[0],preferences:size(55)}); assert.deepEqual(edit.items[1],rows[1]);
  assert.equal(configs.applyProductConfiguration(rows,identity,size(56),b,a).success,false);
  assert.equal(configs.applyProductConfiguration(rows,identity,size(55),b,"missing").success,false);
  const full=Array.from({length:50},(_,i)=>({...identity,slug:`piece-${i}`,quantity:1}));
  assert.equal(configs.applyProductConfiguration(full,identity,size(55),a).success,false);
});

test("basket IDs survive parsing; malformed and repeated IDs cannot make two controls target the same line",()=>{
  const row={...identity,lineId:a,quantity:1,preferences:size(54)};
  assert.deepEqual(basket.parseRequestItems([row]),[row]);
  assert.deepEqual(basket.parseRequestItems([row,{...row,preferences:size(56)}]),[row]);
  assert.deepEqual(basket.parseRequestItems([{...row,lineId:"bad"}]),[]);
  assert.equal(basket.getRequestItemKey(row),a);
  assert.equal(basket.getRequestItemKey({...identity,quantity:1}),identity.slug);
  const other={...row,lineId:b,preferences:size(56)};
  assert.deepEqual(basket.updateRequestItemNote([row,other],a,"فقط اول"),[{...row,note:"فقط اول"},other]);
});

test("explicit contact selection and cleanup isolate configuration IDs, including changed/new same-product lines",()=>{
  const selection=load("lib/commerce/request-selection.ts");
  const first={...identity,lineId:a,quantity:1,preferences:size(54)};
  const second={...identity,lineId:b,quantity:2,preferences:size(56)};
  assert.deepEqual(selection.getInquiryItems([first,second],identity,false,b),[second]);
  assert.deepEqual(selection.getInquiryItems([first,second],identity,false,"missing"),[]);
  assert.deepEqual(selection.getInquiryItems([first,second],identity),[first,second]);
  const newLine={...first,lineId:b};
  assert.deepEqual(selection.removeSubmittedRequestItems([first,newLine],[first]),[newLine]);
  const changed={...first,preferences:size(55)};
  assert.deepEqual(selection.removeSubmittedRequestItems([changed,second],[first]),[changed,second]);
});

test("receipt retains opaque line IDs and independent preference snapshots",()=>{
  const {createInquiryReceipt}=load("lib/commerce/inquiry-receipt.ts");
  const rows=[{...identity,lineId:a,quantity:1,preferences:size(54)},{...identity,lineId:b,quantity:2,preferences:size(56)}];
  const receipt=createInquiryReceipt({id:a},rows);
  rows[0].preferences.ring_size_eu=55;
  assert.equal(receipt.items[0].lineId,a); assert.equal(receipt.items[1].lineId,b);
  assert.equal(receipt.items[0].preferences.ring_size_eu,54);
});

test("restoring a login draft preserves current changes, deduplicates configurations and reports capacity omissions",()=>{
  assert.equal(typeof basket.mergeRequestDraftItems,"function");
  const first={...identity,lineId:a,quantity:2,preferences:size(54)};
  const current={...first,preferences:size(55)};
  const second={...identity,lineId:b,quantity:1,preferences:size(56)};
  assert.deepEqual(basket.mergeRequestDraftItems([current],[first,second]),{items:[current,second],omitted:0});
  assert.equal(basket.mergeRequestDraftItems([],[first,{...first,lineId:b}]).items.length,1);
  const full=Array.from({length:50},(_,i)=>({...identity,slug:`piece-${i}`,quantity:1}));
  assert.deepEqual(basket.mergeRequestDraftItems(full,[first]),{items:full,omitted:1});
});

test("browser storage helpers change quantity, note and removal only for the targeted configuration",()=>{
  let serialized="[]";
  const browser={localStorage:{getItem:()=>serialized,setItem:(_key,value)=>{serialized=value;}},dispatchEvent:()=>{}};
  const storage=load("components/commerce/RequestBasketButton.tsx",{"@/lib/commerce/request-basket":basket,"@/lib/commerce/product-preferences":prefs,"@/lib/commerce/request-configurations":configs},browser);
  const one=storage.saveConfiguredRequestItem(identity,size(54));
  const two=storage.saveConfiguredRequestItem(identity,size(56));
  assert.equal(one.success,true); assert.equal(two.success,true);
  assert.notEqual(one.key,two.key);
  storage.updateRequestItemQuantity(one.key,3);
  storage.updateRequestItemNote(two.key,"فقط سایز دوم");
  assert.deepEqual(JSON.parse(serialized).map(i=>[i.quantity,i.note]),[[3,undefined],[1,"فقط سایز دوم"]]);
  assert.equal(storage.updateRequestItemQuantity(one.key,NaN),false);
  storage.removeRequestItem(one.key);
  assert.deepEqual(JSON.parse(serialized).map(i=>i.lineId),[two.key]);
  storage.addRequestItem(identity);
  assert.equal(JSON.parse(serialized).length,2);
  assert.equal(JSON.parse(serialized)[0].quantity,1);
});

test("same-model line notes include preference labels so the persisted message cannot attach them to the wrong size",()=>{
  const message=basket.buildInquiryMessage("بررسی",[{...identity,lineId:a,quantity:1,preferences:size(54),note:"اول"},{...identity,lineId:b,quantity:1,preferences:size(56),note:"دوم"}]);
  assert.equal(message.success,true);
  assert.match(message.value,/سایز اروپایی انگشتر: ۵۴\): اول/);
  assert.match(message.value,/سایز اروپایی انگشتر: ۵۶\): دوم/);
});

test("unreadable storage cannot be treated as an empty basket and overwritten; invalid quantities never delete a line",()=>{
  const row={...identity,lineId:a,quantity:2,preferences:size(54)};
  let serialized=JSON.stringify([row]), unreadable=true, writes=0;
  const browser={localStorage:{getItem:()=>{if(unreadable) throw Error("blocked read"); return serialized;},setItem:(_key,value)=>{writes++;serialized=value;}},dispatchEvent:()=>{}};
  const storage=load("components/commerce/RequestBasketButton.tsx",{"@/lib/commerce/request-basket":basket,"@/lib/commerce/product-preferences":prefs,"@/lib/commerce/request-configurations":configs},browser);
  assert.equal(storage.saveConfiguredRequestItem(identity,size(56)).success,false);
  assert.equal(storage.addRequestItem(identity),false);
  assert.equal(storage.updateRequestItemQuantity(a,2),false);
  assert.equal(storage.updateRequestItemNote(a,"نکته"),false);
  assert.equal(storage.removeRequestItem(a),false);
  assert.equal(writes,0); assert.deepEqual(JSON.parse(serialized),[row]);
  unreadable=false;
  assert.equal(storage.updateRequestItemQuantity(a,-Infinity),false);
  assert.deepEqual(JSON.parse(serialized),[row]);
});

test("editing cannot replace a saved line ID through extra identity properties",()=>{
  const row={...identity,lineId:a,quantity:2,preferences:size(54)};
  const edited=configs.applyProductConfiguration([row],{...identity,lineId:b},size(55),b,a);
  assert.equal(edited.success,true); assert.equal(edited.key,a); assert.equal(edited.items[0].lineId,a);
});

test("legacy basket is readable, but an older tab cannot overwrite the new multi-configuration basket",()=>{
  const legacy="ornova-request-basket";
  const original=[{...identity,quantity:2,note:"قبلی",preferences:size(54)}];
  const values=new Map([[legacy,JSON.stringify(original)]]);
  const browser={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},dispatchEvent:()=>{}};
  const storage=load("components/commerce/RequestBasketButton.tsx",{"@/lib/commerce/request-basket":basket,"@/lib/commerce/product-preferences":prefs,"@/lib/commerce/request-configurations":configs},browser);
  assert.deepEqual(storage.readItems(),original);
  assert.equal(storage.saveConfiguredRequestItem(identity,size(56)).success,true);
  const saved=storage.readItems(); assert.equal(saved.length,2);
  values.set(legacy,"[]"); // Simulate the deployed pre-configuration client.
  assert.deepEqual(storage.readItems(),saved);
  values.set(legacy,JSON.stringify(original));
  assert.equal(storage.clearRequestItems(),true);
  assert.deepEqual(storage.readItems(),[]);
  assert.equal(values.has(legacy),false);
});

test("every basket mutation preserves unsupported or partially unreadable snapshots without normalizing away data",()=>{
  const row={...identity,lineId:a,quantity:2,preferences:size(54)};
  for (const rows of [[{...row,note:7}],[{...row,futureNote:"preserve"}],[row,null]]) {
    const original=JSON.stringify(rows);
    let serialized=original,writes=0;
    const browser={localStorage:{getItem:key=>key===basket.REQUEST_BASKET_STORAGE_KEY?serialized:null,setItem:(_key,value)=>{writes++;serialized=value;}},dispatchEvent:()=>{}};
    const storage=load("components/commerce/RequestBasketButton.tsx",{"@/lib/commerce/request-basket":basket,"@/lib/commerce/product-preferences":prefs,"@/lib/commerce/request-configurations":configs},browser);
    assert.equal(storage.addRequestItem(identity),false);
    assert.equal(storage.saveConfiguredRequestItem(identity,size(56)).success,false);
    assert.equal(storage.updateRequestItemQuantity(a,3),false);
    assert.equal(storage.updateRequestItemNote(a,"نکته"),false);
    assert.equal(storage.removeRequestItem(a),false);
    assert.equal(writes,0);
    assert.equal(serialized,original);
  }
});
