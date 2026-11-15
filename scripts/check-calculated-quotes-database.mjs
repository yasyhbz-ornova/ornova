// Disposable PostgreSQL only: isolated Docker or owned SCRAM/loopback portable cluster.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { startFixtureProcess, readFixtureJson, completeVerifiedFixture } from "./lib/fixture-process.mjs";
import { createPortablePostgresFixture } from "./lib/portable-postgres-fixture.mjs";
const container=`ornova-calculated-quotes-${randomUUID()}`;
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222",staff="33333333-3333-4333-8333-333333333333",inquiry="44444444-4444-4444-8444-444444444444",other="55555555-5555-4555-8555-555555555555";
const migration=new URL("../supabase/migrations/015_calculated_quote_links.sql",import.meta.url);
assert.ok(existsSync(migration),"calculated quote migration must exist");
const options=Object.fromEntries(process.argv.slice(2).map(value=>{const match=/^--(portable-bin|temp-root)=(.+)$/.exec(value);assert.ok(match,"only --portable-bin and --temp-root options are supported");return[match[1],match[2]];}));
assert.ok(!options["temp-root"]||options["portable-bin"],"temp-root requires an explicit portable-bin");
const portable=options["portable-bin"]?createPortablePostgresFixture({binDirectory:options["portable-bin"],temporaryRoot:options["temp-root"]??tmpdir()}):null;
let containerAttempted=false;
const read=name=>readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),"utf8");
function docker(args,input){const r=spawnSync("docker",args,{input,encoding:"utf8",timeout:30000,windowsHide:true});if(r.status!==0)throw Error(r.stderr||r.error?.message||"Docker failed");return r.stdout.trim();}
const sql=query=>portable?portable.sql(query):docker(["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"],query);
const session=()=>portable?portable.session():startFixtureProcess(["exec","-i",container,"psql","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"]);
const json=value=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const actor=(id,query,trusted=false)=>`set role authenticated;set request.jwt.claim.sub='${id}';set request.jwt.claim.role='authenticated';set request.jwt.claims='${JSON.stringify({app_metadata:trusted?{ornova_role:"staff"}:{},user_metadata:{ornova_role:"staff"}})}';${query}`;
const service=query=>`set role service_role;set request.jwt.claim.role='service_role';${query}`;
const meta=calculation_id=>({calculation_id,source_quote_no:"Q-test",source_order_no:"O-test",source_revision:1,issued_at:new Date(Date.now()-60000).toISOString(),valid_until:new Date(Date.now()+3600000).toISOString(),description:"شرح مشتری",quantity:2,tax_rial:null});
function snapshot(){return{schema_version:1,request_id:randomUUID(),method:"cost-plus",policy_version:"fixture",input:{true_cost_rial:"9007199254740993",mandatory_buffer_rial:"0",profit_method:"markup",profit_bp:0,rounding:"none",rounding_step_rial:"0",tax_bp:0,override_pre_tax_rial:null,override_reason:"PRIVATE-NOTE"},algorithm_version:"pcs-standard-48c17189-v1",result:{cost_floor_rial:"9007199254740993",target_rial:"9007199254740993",pre_tax_rial:"9007199254740993",tax_rial:"1",total_rial:"9007199254740994",effective_margin_bp:0,warnings:["MANDATORY_BUFFER_ZERO"]}};}
const save=value=>JSON.parse(sql(service(`select public.save_inquiry_pricing_calculation('${inquiry}','${a}','${staff}','fixture',${json(value)});`))).record;
const publish=(value,target=inquiry,source="fixture")=>`select public.publish_calculated_inquiry_quote('${target}','${source}',${json(value)});`;
function concurrent(query,name="quote-concurrent"){
  const {child,result}=session();
  child.stdin.end(`set statement_timeout='10s';set application_name='${name}';${query}`);
  return result.then(readFixtureJson);
}
// Keep stdin open so the transaction stays alive until we explicitly release it.
// The observer proves its server PID/state/actual blocker; no guessed sleep overlap.
function held(name,setup){
  const {child,result}=session();
  let ended=false;
  const done=settled(result.then(readFixtureJson));
  child.stdin.write(`set application_name='${name}';set statement_timeout='10s';set idle_in_transaction_session_timeout='20s';begin;${setup}select null;\n`);
  return {done,finish(query=""){if(!ended){ended=true;child.stdin.end(`${query}commit;\n`);}return done;},rollback(){if(!ended){ended=true;child.stdin.end("rollback;\n");}return done;}};
}
async function observeSession(name,predicate){
  for(let attempt=0;attempt<40;attempt++){
    const pid=sql(`select pid from pg_stat_activity where application_name='${name}' and pid<>pg_backend_pid() and ${predicate};`);
    if(pid){assert.match(pid,/^[1-9][0-9]*$/);return Number(pid);}
    await new Promise(done=>setTimeout(done,50));
  }
  assert.fail(`live fixture session not observed: ${name} (${predicate})`);
}
const settled=promise=>promise.then(value=>({value}),error=>({error:String(error)}));
await completeVerifiedFixture(async()=>{
  if(portable)await portable.start();
  else{
  docker(["info","--format","{{.ServerVersion}}"]);
  assert.equal(docker(["ps","-a","--filter",`name=^/${container}$`,"--format","{{.Names}}"]),"","fixture name must not already exist");
  containerAttempted=true;
  docker(["run","--pull","never","--rm","-d","--name",container,"--network","none","--tmpfs","/var/lib/postgresql:rw","-e","POSTGRES_HOST_AUTH_METHOD=trust","postgres:18-alpine"]);
  let ready=false;for(let n=0;n<50;n++){const probe=spawnSync("docker",["exec",container,"pg_isready","-U","postgres"],{windowsHide:true,timeout:3000});if(probe.error)throw probe.error;if(probe.status===0){ready=true;break;}await new Promise(done=>setTimeout(done,200));}assert.ok(ready);
  }
  sql(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb not null default '{}');insert into auth.users values('${a}','{}'),('${b}','{}'),('${staff}','{"ornova_role":"staff"}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;grant usage on schema auth to authenticated,anon,service_role;`);
  sql(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  sql(`create schema storage;create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
  sql(read("003_inquiry_conversations.sql"));
  sql(`insert into public.inquiries(id,user_id,message) values('${inquiry}','${a}','test'),('${other}','${b}','test');grant select,update on public.inquiries to authenticated;`);
  sql(read("013_private_quote_snapshots.sql"));sql(read("014_private_pricing_calculations.sql"));
  sql(readFileSync(migration,"utf8"));
  const calculation=save(snapshot()),request=meta(calculation.id);
  const first=JSON.parse(sql(actor(staff,publish(request),true)));
  assert.equal(first.created,true);assert.equal(first.calculation_id,calculation.id);assert.equal(first.calculation_revision,1);
  assert.equal(first.payload.total_rial,"9007199254740994");assert.deepEqual(first.payload.lines,[{description:"شرح مشتری",quantity:2,amount_rial:"9007199254740993"}]);assert.equal(first.payload.tax_rial,"1");assert.equal(first.payload.discount_rial,"0");
  assert.ok(!JSON.stringify(first.payload).includes("PRIVATE"));assert.ok(!JSON.stringify(first.payload).includes("profit"));
  assert.equal(JSON.parse(sql(actor(staff,publish(request),true))).id,first.id);
  assert.equal(sql(actor(staff,"select count(*) from public.inquiry_quote_calculations;",true)),"1");
  for(const id of [a,b]){assert.equal(sql(actor(id,"select count(*) from public.inquiry_quote_calculations;")),"0");assert.throws(()=>sql(actor(id,publish(request))),/QUOTE_FORBIDDEN/);}
  assert.throws(()=>sql(actor(a,publish(request),true)),/QUOTE_FORBIDDEN/);
  for(const role of ["anon","service_role"])assert.throws(()=>sql(`set role ${role};${publish(request)}`),/permission denied/);
  for(const role of ["authenticated","service_role"])for(const command of ["delete from public.inquiry_quote_calculations","update public.inquiry_quote_calculations set tax_basis='saved'","insert into public.inquiry_quote_calculations default values"])assert.throws(()=>sql(`set role ${role};${command};`),/permission denied/);
  const publicRows=JSON.parse(sql(actor(a,"select coalesce(jsonb_agg(row_to_json(v)),'[]') from public.customer_inquiry_quotes v;")));
  assert.equal(publicRows.length,1);assert.equal(publicRows[0].payload.total_rial,first.payload.total_rial);assert.ok(!JSON.stringify(publicRows).includes("PRIVATE"));assert.equal(sql(actor(b,"select count(*) from public.customer_inquiry_quotes;")),"0");
  assert.throws(()=>sql(actor(staff,publish(request,other),true)),/QUOTE_CONFLICT/);assert.throws(()=>sql(actor(staff,publish(request,inquiry,"other"),true)),/QUOTE_CONFLICT/);
  // Fixture-superuser corruption simulates a legacy/mismatched stored owner.
  // No production data/RLS/trigger is touched or disabled by this verifier.
  sql(`update public.inquiry_pricing_calculations set owner_id='${b}' where id='${calculation.id}';`);
  try{assert.throws(()=>sql(actor(staff,publish({...request,source_quote_no:"Q-owner-mismatch"}),true)),/QUOTE_CONFLICT/);assert.equal(sql("select count(*) from public.inquiry_quote_sources where source_quote_no='Q-owner-mismatch';"),"0");}
  finally{sql(`update public.inquiry_pricing_calculations set owner_id='${a}' where id='${calculation.id}';`);}
  sql(`update auth.users set raw_app_meta_data='{}' where id='${staff}';`);
  try{assert.throws(()=>sql(actor(staff,publish(request),true)),/QUOTE_FORBIDDEN/);}
  finally{sql(`update auth.users set raw_app_meta_data='{"ornova_role":"staff"}' where id='${staff}';`);}
  const another=save(snapshot());assert.throws(()=>sql(actor(staff,publish({...request,calculation_id:another.id}),true)),/QUOTE_CONFLICT/);
  for(const patch of [{total_rial:"1"},{actor_id:staff},{quantity:null},{quantity:0},{source_revision:null},{calculation_id:null},{tax_rial:"0"},{description:null},{issued_at:null},{valid_until:null}])assert.throws(()=>sql(actor(staff,publish({...request,...patch}),true)),/QUOTE_INVALID/);
  assert.throws(()=>sql(actor(staff,`select public.publish_calculated_inquiry_quote('${inquiry}','fixture',null);`,true)),/QUOTE_INVALID/);
  const gram=snapshot();Object.assign(gram,{method:"gram-sale",algorithm_version:"pcs-gram-explicit-fees-v1",input:{weight_mg:"1500",rate_per_gram_rial:"1000000",under_2g_fee_rial:"0",under_4g_fee_rial:"0",stone_total_rial:"0",stone_count:0,setting_per_stone_rial:"0",packaging_rial:"0",logistics_rial:"0",design_rial:"0"},result:{base_rial:"1500000",light_piece_rial:"0",setting_rial:"0",pre_tax_rial:"1500000",tax_rial:"0",total_rial:"1500000",warnings:["GRAM_SALE_HAS_NO_TAX_POLICY"]}});
  const gramCalc=save(gram),g={...meta(gramCalc.id),source_quote_no:"Q-gram"};
  assert.throws(()=>sql(actor(staff,publish(g),true)),/QUOTE_INVALID/);
  assert.throws(()=>sql(actor(staff,publish({...g,tax_rial:"9223372036854775807"}),true)),/QUOTE_INVALID/);
  const gramQuote=JSON.parse(sql(actor(staff,publish({...g,tax_rial:"0"}),true)));assert.equal(gramQuote.payload.total_rial,"1500000");
  const taxed=JSON.parse(sql(actor(staff,publish({...g,source_quote_no:"Q-gram-tax",tax_rial:"1"}),true)));assert.equal(taxed.payload.total_rial,"1500001");
  assert.equal(sql(`select tax_basis from public.inquiry_quote_calculations where snapshot_id='${gramQuote.id}';`),"staff-entered");
  // Never retroactively bless a manually published record as calculator-derived.
  const manual={...first.payload,source_quote_no:"Q-manual"};sql(actor(staff,`select public.publish_inquiry_quote('${inquiry}','fixture',${json(manual)});`,true));
  assert.throws(()=>sql(actor(staff,publish({...request,source_quote_no:"Q-manual"}),true)),/QUOTE_CONFLICT/);
  // A failure in the private link insertion must roll back the public quote/source too.
  sql(`create function public.fixture_abort_link() returns trigger language plpgsql as $$begin if exists(select 1 from public.inquiry_quote_snapshots where id=new.snapshot_id and source_quote_no='Q-rollback') then raise exception 'fixture rollback';end if;return new;end$$;create trigger fixture_abort before insert on public.inquiry_quote_calculations for each row execute function public.fixture_abort_link();`);
  assert.throws(()=>sql(actor(staff,publish({...request,source_quote_no:"Q-rollback"}),true)),/fixture rollback/);assert.equal(sql("select count(*) from public.inquiry_quote_sources where source_quote_no='Q-rollback';"),"0");
  const concurrentRequest={...request,source_quote_no:"Q-race"};const results=await Promise.all([concurrent(actor(staff,publish(concurrentRequest),true)),concurrent(actor(staff,publish(concurrentRequest),true))]);assert.equal(results[0].id,results[1].id);assert.equal(results.filter(v=>v.created).length,1);
  // Manual source lock first: wrapper must wait there WITHOUT owning the inquiry row.
  const manualRequest={...request,source_quote_no:"Q-manual-held"},manualPayload={...first.payload,source_quote_no:"Q-manual-held"};
  const manualHolder=held("manual-source-holder",actor(staff,"select pg_advisory_xact_lock(hashtextextended('fixture:Q-manual-held',0));",true));
  try{
    const holderPid=await observeSession("manual-source-holder","state='idle in transaction' and wait_event='ClientRead'");
    const waiting=settled(concurrent(actor(staff,publish(manualRequest),true),"calculated-source-waiter"));
    const waiterPid=await observeSession("calculated-source-waiter","wait_event_type='Lock' and wait_event='advisory'");
    assert.equal(sql(`select ${holderPid}=any(pg_blocking_pids(${waiterPid}));`),"t");
    assert.equal(sql(`begin;select id from public.inquiries where id='${inquiry}' for update nowait;rollback;`),inquiry,"wrapper must not hold inquiry row while waiting on source lock");
    const published=await manualHolder.finish(`select public.publish_inquiry_quote('${inquiry}','fixture',${json(manualPayload)});`);
    assert.ok(!published.error,published.error);assert.equal(published.value.created,true);
    assert.match((await waiting).error,/QUOTE_CONFLICT/); // Never attach to a manual quote.
  }finally{await manualHolder.rollback();}
  // Calculated publication first: manual publisher must wait and then replay that same offer.
  const calculatedRequest={...request,source_quote_no:"Q-calculated-held"},calculatedPayload={...first.payload,source_quote_no:"Q-calculated-held"};
  const calculatedHolder=held("calculated-source-holder",actor(staff,publish(calculatedRequest),true));
  try{
    const holderPid=await observeSession("calculated-source-holder","state='idle in transaction' and wait_event='ClientRead'");
    const waiting=settled(concurrent(actor(staff,`select public.publish_inquiry_quote('${inquiry}','fixture',${json(calculatedPayload)});`,true),"manual-source-waiter"));
    const waiterPid=await observeSession("manual-source-waiter","wait_event_type='Lock' and wait_event='advisory'");
    assert.equal(sql(`select ${holderPid}=any(pg_blocking_pids(${waiterPid}));`),"t");
    const published=await calculatedHolder.finish(),replay=await waiting;
    assert.ok(!published.error,published.error);assert.ok(!replay.error,replay.error);
    assert.equal(published.value.created,true);assert.equal(replay.value.created,false);assert.equal(replay.value.id,published.value.id);
  }finally{await calculatedHolder.rollback();}
  const expired={...meta(calculation.id),source_quote_no:"Q-expiring",valid_until:new Date(Date.now()+5000).toISOString()};
  const beforeExpiry=JSON.parse(sql(actor(staff,publish(expired),true)));
  sql(`select pg_sleep(greatest(0,extract(epoch from '${expired.valid_until}'::timestamptz-clock_timestamp()))+0.05);`);
  assert.equal(sql(`select clock_timestamp()>='${expired.valid_until}'::timestamptz;`),"t");
  assert.equal(JSON.parse(sql(actor(staff,publish(expired),true))).id,beforeExpiry.id);
  assert.throws(()=>sql(actor(staff,publish({...expired,source_quote_no:"Q-new-expired"}),true)),/QUOTE_INVALID/);
  const future={...meta(calculation.id),source_quote_no:"Q-future",issued_at:new Date(Date.now()+3600000).toISOString(),valid_until:new Date(Date.now()+7200000).toISOString()};
  assert.throws(()=>sql(actor(staff,publish(future),true)),/QUOTE_INVALID/);
  assert.equal(sql("select count(*) from public.inquiry_quote_sources where source_quote_no in ('Q-new-expired','Q-future');"),"0");
  sql(`update public.inquiries set status='closed' where id='${inquiry}';`);assert.equal(JSON.parse(sql(actor(staff,publish(request),true))).id,first.id);assert.throws(()=>sql(actor(staff,publish({...request,source_quote_no:"Q-closed"}),true)),/QUOTE_CLOSED/);
},async()=>{
  if(portable){await portable.cleanup();return;}
  if(!containerAttempted)return;
  const own=()=>docker(["ps","-a","--filter",`name=^/${container}$`,"--format","{{.Names}}"]);
  const found=own();assert.ok(found===""||found===container,"unexpected fixture target");
  if(found)docker(["stop","--time","1",container]);
  assert.equal(own(),"","owned fixture must be gone before success is recorded");
},()=>{
  const evidence=mkdtempSync(join(portable?.temporaryRoot??tmpdir(),"ornova-calculated-quotes-"));writeFileSync(join(evidence,"evidence.json"),JSON.stringify({passed:true,synthetic:true,teardown_verified:true,runtime:portable?.description()??{kind:"docker",image:"postgres:18-alpine"},portable_helper_sha256:createHash("sha256").update(readFileSync(new URL("./lib/portable-postgres-fixture.mjs",import.meta.url))).digest("hex"),migration_sha256:createHash("sha256").update(readFileSync(migration)).digest("hex"),verifier_sha256:createHash("sha256").update(readFileSync(new URL(import.meta.url))).digest("hex"),process_helper_sha256:createHash("sha256").update(readFileSync(new URL("./lib/fixture-process.mjs",import.meta.url))).digest("hex"),completed_at:new Date().toISOString(),checks:["013+014+015 actual migrations","exact allowlisted customer projection","explicit gram tax incl zero and overflow","A/B/staff/live-role and service-role boundaries","no direct link DML","cross inquiry/source/different calculation conflict","stored owner mismatch and live staff revocation rejected","unlinked manual collision rejected","null/malformed rejection","transactional rollback","concurrent idempotency","observed manual-first and calculated-first source-lock waits","NOWAIT inquiry-row probe while wrapper source-blocked","expired exact replay/new expired/future rejection","closed replay","checked teardown before PASS"],scope:"isolated postgres18 fixture, no production/native/live account E2E"},null,2));console.log(`PASS: calculated quote DB fixture. Evidence: ${evidence}`);
});
