// Opt-in disposable database; no host ports, volumes, network or production URL.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const container = `ornova-preferences-test-${randomUUID()}`;
const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", timeout: 30000, windowsHide: true });
  if (result.status !== 0) throw Error(result.stderr || result.error?.message || "Docker operation failed");
  return result.stdout.trim();
}
function sql(query) { return docker(["exec", "-i", container, "psql", "-U", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], query); }
const read = (file) => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
const actor = (id, query) => `set role authenticated; set request.jwt.claim.sub='${id}'; ${query}`;
const configured = (items, name = "آزمون") => `select public.create_inquiry_with_preferences('${name}', 'synthetic review', 'example.invalid', '${JSON.stringify(items).replaceAll("'", "''")}'::jsonb);`;
const ring = { product_slug: "lajvard-shab-ring", quantity: 2, preferences: { version: 1, ring_size_eu: 54.5, stone_note: "آبی" } };
try {
  docker(["run", "--rm", "-d", "--name", container, "--network", "none", "--tmpfs", "/var/lib/postgresql:rw", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:18-alpine"]);
  let ready = false;
  for (let i = 0; i < 50; i++) {
    const check = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], { windowsHide: true });
    if (check.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.equal(ready, true);
  sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${a}'),('${b}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to authenticated;`);
  sql(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  sql(read("005_save_inquiry_customer_name.sql"));
  sql("alter function public.create_inquiry_with_items(text,text,text,jsonb) set search_path='';");
  sql(read("011_product_request_preferences.sql"));
  sql(read("012_independent_request_configurations.sql"));
  sql("grant select,insert,update on public.profiles,public.inquiries,public.inquiry_items to authenticated;");
  const id = sql(actor(a, configured([ring])));
  assert.equal(sql(actor(a, `select preferences->>'ring_size_eu' from public.inquiry_items where inquiry_id='${id}';`)), "54.5");
  assert.equal(sql(actor(a, `select quantity from public.inquiry_items where inquiry_id='${id}';`)), "2");
  assert.equal(sql(actor(b, "select count(*) from public.inquiry_items;")), "0");
  assert.throws(() => sql(`set role anon; ${configured([ring])}`), /permission denied/);
  assert.throws(() => sql(`set role authenticated; ${configured([ring])}`), /authentication required/);
  const bad = [null, [], { version: 2 }, { version: 1, ring_size_uk: "M" }, { version: 1, ring_size_eu: "54" }, { version: 1, ring_size_eu: 54.2 }, { version: 1, ring_size_eu: 101 }, { version: 1, stone_note: null }, { version: 1, finish_note: "ا".repeat(121) }];
  for (const preferences of bad) assert.throws(() => sql(actor(a, configured([{ ...ring, preferences }]))), /invalid product preferences/);
  assert.throws(() => sql(actor(a, configured([{ ...ring, product_slug: "sepid-brooch" }]))), /ring size requires a ring/);
  assert.throws(() => sql(actor(a, configured([ring, ring]))), /duplicate inquiry item/);
  assert.equal(sql("select count(*) from public.inquiries;"), "1");
  sql(`create function public.fixture_abort_preferences() returns trigger language plpgsql as $$begin raise exception 'fixture update rejected'; end$$;
    create trigger fixture_abort before update on public.inquiry_items for each row execute function public.fixture_abort_preferences();`);
  assert.throws(() => sql(actor(a, configured([ring], "نام جایگزین"))), /fixture update rejected/);
  assert.equal(sql("select count(*) from public.inquiries;"), "1");
  assert.equal(sql(`select display_name from public.profiles where id='${a}';`), "آزمون");
  sql("drop trigger fixture_abort on public.inquiry_items;");
  sql(actor(a, `update public.inquiry_items set preferences='{"version":1,"ring_size_eu":60}' where inquiry_id='${id}';`));
  assert.equal(sql(actor(a, `select preferences->>'ring_size_eu' from public.inquiry_items where inquiry_id='${id}';`)), "54.5");
  assert.ok(sql(actor(a, "select public.create_inquiry_with_items('آزمون','legacy','example.invalid','[]'::jsonb);")));
  assert.equal(sql("select count(*) from public.inquiries;"), "2");
  const multi = (items,name="آزمون چند انتخاب") => configured(items,name).replace("create_inquiry_with_preferences","create_inquiry_with_configurations");
  const second={...ring,quantity:1,preferences:{version:1,ring_size_eu:56}};
  const multiId=sql(actor(a,multi([ring,second])));
  assert.equal(sql(actor(a,`select string_agg((preferences->>'ring_size_eu') || ':' || quantity, ',' order by preferences->>'ring_size_eu') from public.inquiry_items where inquiry_id='${multiId}';`)),"54.5:2,56:1");
  assert.equal(sql(actor(b,`select count(*) from public.inquiry_items where inquiry_id='${multiId}';`)),"0");
  assert.throws(()=>sql(`set role anon; ${multi([ring,second])}`),/permission denied/);
  assert.throws(()=>sql(`set role authenticated; ${multi([ring,second])}`),/authentication required/);
  for (const invalid of [null,{},Array.from({length:51},()=>ring),[ring,ring],[{...ring,quantity:"2"}],[{...ring,quantity:0}],[{...ring,quantity:1.5}],[{...ring,product_slug:"unknown"}],[{...ring,product_slug:"sepid-brooch"}],[{...ring,preferences:{version:1,stone_note:" آبی "}},{...ring,preferences:{version:1,stone_note:"آبی"}}]]) assert.throws(()=>sql(actor(a,multi(invalid))),/invalid|duplicate|ring size/);
  assert.equal(sql("select count(*) from public.inquiries;"),"3");
  sql(`create function public.fixture_abort_insert() returns trigger language plpgsql as $$begin if new.preferences->>'ring_size_eu'='57' then raise exception 'fixture insert rejected'; end if; return new; end$$;
    create trigger fixture_abort_insert before insert on public.inquiry_items for each row execute function public.fixture_abort_insert();`);
  assert.throws(()=>sql(actor(a,multi([ring,{...second,preferences:{version:1,ring_size_eu:57}}],"نام نباید بماند"))),/fixture insert rejected/);
  assert.equal(sql("select count(*) from public.inquiries;"),"3");
  assert.equal(sql(`select display_name from public.profiles where id='${a}';`),"آزمون چند انتخاب");
  assert.equal(sql(`select count(*) from public.inquiry_items where inquiry_id='${multiId}';`),"2");
  sql("drop trigger fixture_abort_insert on public.inquiry_items;");
  assert.ok(sql(actor(a,configured([ring]))));
  assert.equal(sql("select count(*) from public.inquiries;"),"4");
  console.log("PASS: real 001/005/011/012 migrations; independent same-model sizes/quantities persist; owner isolation; invalid/duplicate/unauthed writes denied; multi-line partial inserts roll back with profile/inquiry; customer cannot mutate snapshot; both legacy RPCs work.");
} finally {
  // Exact unique fixture name; --rm removes only this temporary database.
  spawnSync("docker", ["stop", "--time", "1", container], { encoding: "utf8", timeout: 15000, windowsHide: true });
}
