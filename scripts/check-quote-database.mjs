// Disposable PostgreSQL only: no credentials, production URL, exposed ports or host volumes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
const container=`ornova-quote-test-${randomUUID()}`, a="11111111-1111-4111-8111-111111111111", b="22222222-2222-4222-8222-222222222222", staff="33333333-3333-4333-8333-333333333333", inquiry="44444444-4444-4444-8444-444444444444", other="55555555-5555-4555-8555-555555555555";
function docker(args,input) { const r=spawnSync("docker",args,{input,encoding:"utf8",timeout:30000,windowsHide:true}); if(r.status!==0) throw Error(r.stderr||r.error?.message||"Docker failed"); return r.stdout.trim(); }
const sql=q=>docker(["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"],q);
const actor=(id,q,isStaff=false)=>`set role authenticated; set request.jwt.claim.sub='${id}'; set request.jwt.claims='${JSON.stringify({app_metadata:isStaff?{ornova_role:"staff"}:{},user_metadata:{ornova_role:"staff"}})}'; ${q}`;
const literal=v=>`'${JSON.stringify(v).replaceAll("'","''")}'::jsonb`;
const valid=(patch={})=>({version:1,source_quote_no:"Q-TEST",source_order_no:"O-TEST",source_revision:1,issued_at:new Date(Date.now()-3600000).toISOString(),valid_until:new Date(Date.now()+3600000).toISOString(),lines:[{description:"آزمایش",quantity:2,amount_rial:"10000000"}],discount_rial:"1000000",tax_rial:"900000",total_rial:"9900000",...patch});
const publish=(v,id=inquiry)=>`select public.publish_inquiry_quote('${id}','fixture',${literal(v)});`;
const asStaff=q=>actor(staff,q,true);
function concurrent(q) { return new Promise((resolve,reject)=>{ const p=spawn("docker",["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"],{windowsHide:true}); let out="",err="";p.stdout.on("data",c=>out+=c);p.stderr.on("data",c=>err+=c);p.on("error",reject);p.on("close",code=>code?reject(Error(err)):resolve(JSON.parse(out.trim())));p.stdin.end(q); }); }
try {
  docker(["run","--rm","-d","--name",container,"--network","none","--tmpfs","/var/lib/postgresql:rw","-e","POSTGRES_HOST_AUTH_METHOD=trust","postgres:18-alpine"]);
  let ready=false; for(let n=0;n<50;n++) { if(spawnSync("docker",["exec",container,"pg_isready","-U","postgres"],{windowsHide:true}).status===0){ready=true;break;} await new Promise(r=>setTimeout(r,200)); } assert.ok(ready);
  sql(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}'),('${staff}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated,anon;`);
  const read=name=>readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),"utf8");
  sql(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  sql(`create schema storage;create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
  sql(read("003_inquiry_conversations.sql"));
  sql(`insert into public.inquiries(id,user_id,message) values('${inquiry}','${a}','test'),('${other}','${b}','test');grant select,update on public.inquiries to authenticated;`);
  const migration=new URL("../supabase/migrations/013_private_quote_snapshots.sql",import.meta.url); if(existsSync(migration)) sql(readFileSync(migration,"utf8"));
  const first=valid(); const stored=JSON.parse(sql(asStaff(publish(first)))); assert.equal(stored.created,true);
  assert.equal(JSON.parse(sql(asStaff(publish(first)))).id,stored.id);
  assert.equal(sql(actor(a,"select count(*) from public.inquiry_quote_snapshots;")),"1");
  assert.equal(sql(actor(b,"select count(*) from public.inquiry_quote_snapshots;")),"0");
  for(const column of ["created_by","source_id","owner_id"]) assert.throws(()=>sql(actor(a,`select ${column} from public.inquiry_quote_snapshots;`)),/permission denied/);
  assert.throws(()=>sql(actor(a,publish(valid({source_quote_no:"Q-FORGE"})))),/QUOTE_FORBIDDEN/);
  assert.throws(()=>sql(`set role anon;${publish(first)}`),/permission denied/);
  for(const table of ["inquiry_quote_snapshots","inquiry_quote_sources","inquiry_quote_withdrawals","inquiry_quote_withdrawal_reasons"]) assert.throws(()=>sql(asStaff(`delete from public.${table};`)),/permission denied/);
  assert.equal(sql(actor(a,"select count(*) from public.inquiry_quote_sources;")),"0");
  assert.throws(()=>sql(asStaff(`update public.inquiries set user_id='${b}' where id='${inquiry}';`)),/QUOTE_OWNER_IMMUTABLE/);
  for(const bad of [valid({owner_id:a}),valid({total_rial:"1"}),valid({source_revision:2,valid_until:new Date(Date.now()-1000).toISOString()}),valid({issued_at:"2026-02-30T00:00:00Z"}),valid({lines:[{...first.lines[0],profit:"private"}]}),valid({source_revision:"2"})]) assert.throws(()=>sql(asStaff(publish(bad))),/QUOTE_INVALID/);
  assert.throws(()=>sql(asStaff(publish({...first,total_rial:"10000000",discount_rial:"900000"}))),/QUOTE_CONFLICT/);
  assert.throws(()=>sql(asStaff(publish(first,other))),/QUOTE_CONFLICT/);
  const next=valid({source_revision:2}); assert.equal(JSON.parse(sql(asStaff(publish(next)))).created,true);
  assert.equal(sql(actor(a,"select count(distinct document_id) from public.customer_inquiry_quotes;")),"1");
  sql(asStaff(publish(valid()).replace("'fixture'","'fixture-second-source'")));
  assert.equal(sql(actor(a,"select count(distinct document_id) from public.customer_inquiry_quotes;")),"2");
  assert.throws(()=>sql(asStaff(publish(valid({source_revision:1,source_order_no:"different"})))),/QUOTE_CONFLICT/);
  const withdrawal=`select public.withdraw_inquiry_quote('${inquiry}','${stored.id}','internal fixture reason');`;
  sql(asStaff(withdrawal));sql(asStaff(withdrawal));
  assert.equal(sql(actor(a,`select count(*) from public.inquiry_quote_withdrawals where snapshot_id='${stored.id}';`)),"1");
  assert.equal(sql(actor(a,"select count(*) from public.inquiry_quote_withdrawal_reasons;")),"0");
  assert.throws(()=>sql(asStaff(`select public.withdraw_inquiry_quote('${other}','${stored.id}','wrong case');`)),/QUOTE_NOT_FOUND/);
  sql(`create function public.fixture_abort_quote() returns trigger language plpgsql as $$begin if new.source_quote_no='Q-ROLLBACK' then raise exception 'fixture abort';end if;return new;end$$;create trigger fixture_abort before insert on public.inquiry_quote_snapshots for each row execute function public.fixture_abort_quote();`);
  assert.throws(()=>sql(asStaff(publish(valid({source_quote_no:"Q-ROLLBACK"})))),/fixture abort/);
  assert.equal(sql("select count(*) from public.inquiry_quote_sources where source_quote_no='Q-ROLLBACK';"),"0");
  const race=valid({source_quote_no:"Q-RACE"});const results=await Promise.all([concurrent(asStaff(publish(race))),concurrent(asStaff(publish(race)))]);assert.equal(results[0].id,results[1].id);assert.equal(results.filter(v=>v.created).length,1);
  const expiring=valid({source_quote_no:"Q-EXPIRED-RETRY",valid_until:new Date(Date.now()+1500).toISOString()});
  const expiresId=JSON.parse(sql(asStaff(publish(expiring)))).id;sql("select pg_sleep(1.6);");
  assert.equal(JSON.parse(sql(asStaff(publish(expiring)))).id,expiresId);
  for(const bad of [valid({source_quote_no:"Q-FUTURE",issued_at:new Date(Date.now()+600000).toISOString()}),valid({source_quote_no:"Q-MAX",lines:[{...first.lines[0],amount_rial:"9223372036854775808"}]}),valid({source_quote_no:"Q-LEAK",true_cost_rial:"1"})]) assert.throws(()=>sql(asStaff(publish(bad))),/QUOTE_INVALID/);
  sql(`update public.inquiries set status='closed' where id='${other}';`);
  assert.throws(()=>sql(asStaff(publish(valid({source_quote_no:"Q-CLOSED"}),other))),/QUOTE_CLOSED/);
  console.log("PASS: actual quote migration, exact totals, trusted role, A/B isolation, direct-write denial, immutable owner/source/revisions, withdrawal privacy, rollback and concurrent idempotency.");
} finally { spawnSync("docker",["stop","--time","1",container],{encoding:"utf8",timeout:15000,windowsHide:true}); }
