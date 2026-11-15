import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
function button(ready=Promise.resolve(),fails=false){
 const hooks=[],cleanups=[];let i=0,prints=0,tree;
 const api=loadTs("components/account/PrintDocumentButton.tsx",{"react":{useRef:value=>{const n=i++;return hooks[n]??=( {current:value});},useState:value=>{const n=i++;hooks[n]??={value};return[hooks[n].value,next=>{hooks[n].value=next;}];},useEffect:fn=>{const n=i++;if(!hooks[n]){hooks[n]={};cleanups.push(fn());}}}});
 // Browser globals are scoped to the handler execution and restored after each test.
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 globalThis.window={print(){prints++;if(fails)throw Error("blocked");}};globalThis.document={fonts:{ready}};
 function render(){i=0;tree=api.PrintDocumentButton();return tree;}
 render();return{click:()=>tree.props.children[0].props.onClick(),render,prints:()=>prints,unmount:()=>cleanups.forEach(fn=>fn?.()),restore:()=>{globalThis.window=originalWindow;globalThis.document=originalDocument;}};
}
test("print is explicit and single flight while fonts load, without stale printing after navigation",async()=>{
 for(const leave of [false,true]){let resolve;const c=button(new Promise(r=>{resolve=r;}));try{assert.equal(c.prints(),0);const first=c.click(),again=c.click();assert.equal(c.render().props.children[0].props.disabled,true);if(leave)c.unmount();resolve();await Promise.all([first,again]);assert.equal(c.prints(),leave?0:1);}finally{c.restore();}}
});
test("browser print error provides a safe fallback and releases pending state",async()=>{
 const c=button(Promise.resolve(),true);try{await c.click();const tree=c.render();assert.equal(tree.props.children[0].props.disabled,false);assert.equal(tree.props.children[1].props.role,"alert");}finally{c.restore();}
});
