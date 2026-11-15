// Actual disposable PostgreSQL fixture. No credentials, exposed ports, host volumes or network.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
const migration = new URL("../supabase/migrations/014_private_pricing_calculations.sql", import.meta.url);
assert.ok(existsSync(migration), "private calculation migration must exist");
const container = `ornova-pricing-records-${randomUUID()}`;
const a="11111111-1111-4111-8111-111111111111", b="22222222-2222-4222-8222-222222222222", staff="33333333-3333-4333-8333-333333333333", inquiry="44444444-4444-4444-8444-444444444444", other="55555555-5555-4555-8555-555555555555";
function docker(args, input) { const result=spawnSync("docker",args,{input,encoding:"utf8",timeout:30000,windowsHide:true}); if(result.status!==0) throw Error(result.stderr||result.error?.message||"Docker failed"); return result.stdout.trim(); }
const sql = query => docker(["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"], query);
const literal = value => `'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const actor = (id, query, trusted=false) => `set role authenticated;set request.jwt.claim.sub='${id}';set request.jwt.claim.role='authenticated';set request.jwt.claims='${JSON.stringify({app_metadata:trusted?{ornova_role:"staff"}:{},user_metadata:{ornova_role:"staff"}})}';${query}`;
const service = query => `set role service_role;set request.jwt.claim.role='service_role';${query}`;
function snapshot(id=randomUUID()) { return {schema_version:1,request_id:id,method:"cost-plus",policy_version:"synthetic-v1",input:{true_cost_rial:"9007199254740993",mandatory_buffer_rial:"0",profit_method:"markup",profit_bp:0,rounding:"none",rounding_step_rial:"0",tax_bp:0,override_pre_tax_rial:null,override_reason:null},algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"9007199254740993",target_rial:"9007199254740993",pre_tax_rial:"9007199254740993",tax_rial:"0",total_rial:"9007199254740993",effective_margin_bp:0,warnings:["MANDATORY_BUFFER_ZERO"]}}; }
const save = (value, { target=inquiry, owner=a, who=staff, source="fixture" }={}) => `select public.save_inquiry_pricing_calculation('${target}','${owner}','${who}','${source}',${literal(value)});`;
function concurrent(query,parse=true) { return new Promise((resolve,reject)=>{ const child=spawn("docker",["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"],{windowsHide:true});let out="",err="";child.stdout.on("data",c=>out+=c);child.stderr.on("data",c=>err+=c);child.on("error",reject);child.on("close",code=>code?reject(Error(err)):resolve(parse?JSON.parse(out.trim()):out.trim()));child.stdin.end(query); }); }
try {
  docker(["run","--rm","-d","--name",container,"--network","none","--tmpfs","/var/lib/postgresql:rw","-e","POSTGRES_HOST_AUTH_METHOD=trust","postgres:18-alpine"]);
  let ready=false;for(let n=0;n<50;n++){if(spawnSync("docker",["exec",container,"pg_isready","-U","postgres"],{windowsHide:true}).status===0){ready=true;break;}await new Promise(done=>setTimeout(done,200));}assert.ok(ready);
  sql(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb not null default '{}');insert into auth.users values('${a}','{}'),('${b}','{}'),('${staff}','{"ornova_role":"staff"}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;grant usage on schema auth to authenticated,anon,service_role;`);
  const read=name=>readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),"utf8");
  sql(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  sql(`create schema storage;create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
  sql(read("003_inquiry_conversations.sql"));
  sql(`insert into public.inquiries(id,user_id,message) values('${inquiry}','${a}','test'),('${other}','${b}','test');grant select,update on public.inquiries to authenticated;`);
  sql(readFileSync(migration,"utf8"));
  const first=snapshot(), initial=JSON.parse(sql(service(save(first))));
  assert.equal(initial.created,true); assert.equal(initial.record.revision,1); assert.equal(initial.record.snapshot.result.total_rial,"9007199254740993");
  assert.equal(JSON.parse(sql(service(save(first)))).record.id,initial.record.id);
  assert.equal(sql(actor(staff,"select count(*) from public.inquiry_pricing_calculations;",true)),"1");
  for(const id of [a,b]) { assert.equal(sql(actor(id,"select count(*) from public.inquiry_pricing_calculations;")),"0"); assert.throws(()=>sql(actor(id,save(snapshot()))),/permission denied/); }
  assert.throws(()=>sql(actor(staff,save(snapshot()),true)),/permission denied/);
  assert.throws(()=>sql(`set role anon;select * from public.inquiry_pricing_calculations;`),/permission denied/);
  for(const role of ["authenticated","service_role"]) for(const statement of ["delete from public.inquiry_pricing_calculations", "update public.inquiry_pricing_calculations set revision=9", "insert into public.inquiry_pricing_calculations default values"]) assert.throws(()=>sql(`set role ${role};${statement};`),/permission denied/);
  assert.throws(()=>sql(service(save(snapshot(),{who:a}))),/CALC_FORBIDDEN/);
  assert.throws(()=>sql(service(save(snapshot(),{owner:b}))),/CALC_CONFLICT/);
  assert.throws(()=>sql(service(save(first,{target:other,owner:b}))),/CALC_CONFLICT/);
  assert.throws(()=>sql(service(save(first,{source:"other"}))),/CALC_CONFLICT/);
  const modified=structuredClone(first);modified.input.tax_bp=1;assert.throws(()=>sql(service(save(modified))),/CALC_CONFLICT/);
  for(const change of [v=>v.owner_id=a,v=>v.input.trace="private",v=>v.result.total_rial="1",v=>v.result.total_rial=1,v=>v.result.pre_tax_rial="9223372036854775808",v=>v.algorithm_version="unreviewed",v=>v.input.tax_bp=-1,v=>v.input.profit_method="fixed",v=>v.input.true_cost_rial="01"]) { const bad=snapshot();change(bad);assert.throws(()=>sql(service(save(bad))),/CALC_INVALID/); }
  for(const change of [v=>v.algorithm_version=null,v=>v.input.profit_method=null,v=>v.input.rounding=null,v=>v.result.warnings=[null]]) { const bad=snapshot();change(bad);assert.throws(()=>sql(service(save(bad))),/CALC_INVALID/); }
  const race=snapshot(), results=await Promise.all([concurrent(service(save(race))),concurrent(service(save(race)))]);
  assert.equal(results[0].record.id,results[1].record.id);assert.equal(results.filter(r=>r.created).length,1);assert.equal(results[0].record.revision,2);
  assert.throws(()=>sql(`update public.inquiries set user_id='${b}' where id='${inquiry}';`),/CALC_OWNER_IMMUTABLE/);
  // Observe the live transaction holding the target row, then attempt a stale-owner save.
  const transfer=concurrent(`begin;update public.inquiries set user_id='${a}' where id='${other}';select pg_sleep(2) /* pricing-owner-race */;commit;`,false);
  let locked=false;
  for(let n=0;n<15;n++){if(sql("select count(*) from pg_stat_activity where wait_event='PgSleep' and query like '%/* pricing-owner-race */%';")==="1"){locked=true;break;}await new Promise(done=>setTimeout(done,50));}
  assert.ok(locked,"owner-transfer transaction must be observed alive before racing");
  const staleSave=concurrent(service(save(snapshot(),{target:other,owner:b}))).then(()=>"unexpected success",error=>error.message);
  await transfer;assert.match(await staleSave,/CALC_CONFLICT/);
  assert.equal(sql(`select count(*) from public.inquiry_pricing_calculations where inquiry_id='${other}';`),"0");
  sql(`create function public.fixture_abort_calculation() returns trigger language plpgsql as $$begin if new.snapshot->>'policy_version'='rollback' then raise exception 'fixture abort';end if;return new;end$$;create trigger fixture_abort before insert on public.inquiry_pricing_calculations for each row execute function public.fixture_abort_calculation();`);
  const aborted=snapshot();aborted.policy_version="rollback";assert.throws(()=>sql(service(save(aborted))),/fixture abort/);
  assert.equal(sql(`select count(*) from public.inquiry_pricing_calculations where request_id='${aborted.request_id}';`),"0");
  const gram={schema_version:1,request_id:randomUUID(),method:"gram-sale",policy_version:"synthetic-v1",input:{weight_mg:"1500",rate_per_gram_rial:"1000000",under_2g_fee_rial:"0",under_4g_fee_rial:"0",stone_total_rial:"0",stone_count:0,setting_per_stone_rial:"0",packaging_rial:"0",logistics_rial:"0",design_rial:"0"},algorithm_version:"pcs-gram-explicit-fees-v1",result:{base_rial:"1500000",light_piece_rial:"0",setting_rial:"0",pre_tax_rial:"1500000",tax_rial:"0",total_rial:"1500000",warnings:["GRAM_SALE_HAS_NO_TAX_POLICY"]}};
  assert.equal(JSON.parse(sql(service(save(gram)))).record.revision,3);
  sql(`update public.inquiries set status='closed' where id='${inquiry}';`);
  assert.equal(JSON.parse(sql(service(save(first)))).record.id,initial.record.id);
  assert.throws(()=>sql(service(save(snapshot()))),/CALC_CLOSED/);
  const evidence=mkdtempSync(join(tmpdir(),"ornova-pricing-records-"));
  writeFileSync(join(evidence,"evidence.json"),JSON.stringify({passed:true,synthetic:true,migration_sha256:createHash("sha256").update(readFileSync(migration)).digest("hex"),completed_at:new Date().toISOString(),checks:["exact snapshots","A/B/staff/service-role access","direct DML denied","source/owner/request pins","concurrent identical insert","observed live owner-transfer race rejects stale save","rollback","sequential revisions","closed identical retry","malformed/null envelope rejection"],scope:"isolated postgres18 migration fixture; not real Supabase or unified API/native/account E2E"},null,2));
  console.log("PASS: real migration, exact native snapshots, A/B/staff isolation, service-only RPC, no direct DML, source/owner/request pins, concurrent idempotency, rollback, sequential versions, closed retry.");
  console.log(`Evidence: ${evidence}`);
} finally { spawnSync("docker",["stop","--time","1",container],{encoding:"utf8",timeout:15000,windowsHide:true}); }
