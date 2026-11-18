import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const id="a1111111-abcd-4111-8111-a11111111111",other="b2222222-abcd-4222-8222-b22222222222",staff="d4444444-abcd-4444-8444-d44444444444",marker=()=>null;
const nodes=n=>!n||typeof n!=="object"?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
test("admin desk rejects an authentication error before reading any customer records", async () => {
  const loaded = loadTs("app/admin/page.tsx", {
    "next/navigation": { notFound() { throw Error("not-found"); }, redirect(url) { throw Error(`redirect:${url}`); } },
    "next/link": { default: "a" },
    "@/components/admin/InquiryDesk": { InquiryDesk: marker },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: staff, app_metadata: { ornova_role: "staff" } } }, error: { message: "invalid session" } }) },
      from() { assert.fail("must not read customer records when authentication fails"); },
    }) },
  });
  await assert.rejects(() => loaded.default({}), /redirect:\/\?galleryPanel=account&next=%2Fadmin/);
});
function page(){return loadTs("app/admin/page.tsx",{
  "next/navigation":{notFound(){throw Error("not-found");}},"next/link":{default:"a"},"@/components/admin/InquiryDesk":{InquiryDesk:marker},
  "@/lib/account/inquiry-quotes":{readInquiryQuotes:async()=>({data:[],error:false})},"@/lib/account/inquiry-items":{readInquiryItems:async()=>({data:[],error:false})},
  "@/lib/supabase/server":{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:{id:staff,app_metadata:{ornova_role:"staff"}}},error:null})},from(name){assert.ok(["inquiries","profiles","inquiry_files"].includes(name));const q={select:()=>q,order:async()=>({data:[id,other].map(id=>({id,user_id:id,customer_name:"مشتری",status:"reviewing",created_at:"2026-10-25T10:00:00Z",message:"درخواست",contact:null})),error:null}),in:async()=>({data:[],error:null})};return q;}})},
});}
test("admin return targets only an existing validated inquiry and keys the desk selection",async()=>{
  const p=page(),tree=await p.default({searchParams:Promise.resolve({inquiry:other.toUpperCase()})}),desk=nodes(tree).find(n=>n.type===marker);
  assert.equal(desk.props.initialInquiryId,other);assert.ok(desk.key.includes(other));assert.ok(desk.key.includes(staff));
  for(const inquiry of ["bad",[other],staff])await assert.rejects(()=>p.default({searchParams:Promise.resolve({inquiry})}),/not-found/);
});

test("desk actually selects the requested non-first inquiry and falls back safely for absent identity",()=>{
  const loaded=loadTs("components/admin/InquiryDesk.tsx",{"react":{useState:value=>[value,()=>{}]},"next/link":{default:"a"},"@/components/account/InquiryConversation":{InquiryConversation:"conversation"},"@/components/commerce/ProductPreferencesSummary":{ProductPreferencesSummary:"preferences"},"@/components/admin/InquiryQuoteEditor":{InquiryQuoteEditor:"quotes"}});
  const inquiries=[id,other].map((id,n)=>({id,customer_name:n?"مشتری دوم":"مشتری اول",status:"reviewing",created_at:"2026-10-25T10:00:00Z",message:"درخواست",contact:null,customer_phone:null,customer_design_note:null,items:[],files:[]}));
  const props={inquiries,quotes:[],quotesError:false,quoteReadAt:"2026-10-25T10:00:00Z",quoteEnabled:false};
  const title=initialInquiryId=>nodes(loaded.InquiryDesk({...props,initialInquiryId})).find(n=>n.type==="h2").props.children;
  assert.equal(title(other),"مشتری دوم");assert.equal(title(staff),"مشتری اول");
});
