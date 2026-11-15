// Explicit opt-in disposable PostgreSQL fixture; ordinary npm test needs no Docker.
// No production connection or host port is used.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";

const container = `ornova-studio-test-${randomUUID()}`;
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const c = "33333333-3333-4333-8333-333333333333";
const first = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", timeout: 30000, windowsHide: true });
  if (result.status !== 0) throw Error(result.stderr || result.error?.message || "Docker operation failed");
  return result.stdout.trim();
}
function sql(query) { return docker(["exec", "-i", container, "psql", "-U", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], query); }
function concurrentSql(query) {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], { windowsHide: true });
    let out = "", error = "";
    process.stdout.on("data", (chunk) => { out += chunk; }); process.stderr.on("data", (chunk) => { error += chunk; });
    process.on("error", reject); process.on("close", (code) => code === 0 ? resolve(out.trim()) : reject(Error(error)));
    process.stdin.end(query);
  });
}
const reserve = (owner, id) => `select public.reserve_studio_generation('${owner}', '${id}', 'silver ring');`;
const actor = (owner, query, staff = false) => `set role authenticated; set request.jwt.claim.sub = '${owner}'; set request.jwt.claim.staff = '${staff}'; ${query}`;
function denied(query, pattern = /permission denied|row-level security/) { assert.throws(() => sql(query), pattern); }

try {
  docker(["run", "--rm", "-d", "--name", container, "--network", "none", "--tmpfs", "/var/lib/postgresql:rw", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:18-alpine"]);
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    const check = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], { encoding: "utf8", windowsHide: true });
    if (check.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.equal(ready, true, "isolated PostgreSQL did not start");
  sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${a}'),('${b}'),('${c}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    create function public.is_ornova_staff() returns boolean language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.staff', true),''),'false')::boolean$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(name text primary key, bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
  sql(readFileSync(new URL("../supabase/migrations/010_private_design_gallery.sql", import.meta.url), "utf8"));
  assert.equal(sql("select public from storage.buckets where id = 'ornova-designs';"), "f");
  assert.equal(sql("select has_function_privilege('authenticated','public.reserve_studio_generation(uuid,uuid,text)','execute');"), "f");
  denied(actor(a, reserve(a, first)));
  assert.equal(JSON.parse(sql(`set role service_role; ${reserve(a, first)}`)).fresh, true);
  assert.equal(JSON.parse(sql(`set role service_role; ${reserve(a, first)}`)).fresh, false);
  denied(`set role service_role; ${reserve(b, first)}`, /STUDIO_CONFLICT/);
  denied(`set role service_role; ${reserve(a, randomUUID())}`, /STUDIO_BUSY/);
  sql(`set role service_role; update public.studio_generations set state='ready',storage_path='${a}/${first}.png',mime='image/png' where id='${first}'; ${reserve(b, second)}
    update public.studio_generations set state='ready',storage_path='${b}/${second}.png',mime='image/png' where id='${second}';`);
  sql(`insert into storage.objects values ('${a}/${first}.png','ornova-designs'),('${b}/${second}.png','ornova-designs');`);
  assert.equal(sql(actor(a, "select count(*) from public.studio_generations;")), "1");
  assert.equal(sql(actor(b, "select count(*) from public.studio_generations;")), "1");
  assert.equal(sql(actor(a, "select count(*) from public.studio_generations;", true)), "2");
  assert.equal(sql(actor(a, "select name from storage.objects;")), `${a}/${first}.png`);
  assert.equal(sql(actor(b, "select name from storage.objects;")), `${b}/${second}.png`);
  assert.equal(sql(actor(a, "select count(*) from storage.objects;", true)), "2");
  denied("set role anon; select * from public.studio_generations;");
  denied(actor(a, `insert into public.studio_generations(id,user_id,idea) values ('${randomUUID()}','${a}','forged');`));
  denied(actor(a, "update public.studio_generations set state='ready';"));
  denied(actor(a, `insert into storage.objects values ('${a}/forged.png','ornova-designs');`));
  const parallelId = randomUUID();
  const results = await Promise.all([concurrentSql(`set role service_role; ${reserve(c, parallelId)}`), concurrentSql(`set role service_role; ${reserve(c, parallelId)}`)]);
  assert.deepEqual(results.map((row) => JSON.parse(row).fresh).sort(), [false, true]);
  sql(`update public.studio_generations set state='failed' where user_id='${c}';`);
  for (let attempt = 0; attempt < 4; attempt++) {
    sql(`set role service_role; ${reserve(c, randomUUID())} update public.studio_generations set state='failed' where user_id='${c}';`);
  }
  denied(`set role service_role; ${reserve(c, randomUUID())}`, /STUDIO_QUOTA/);
  assert.equal(sql(`select count(*) from public.studio_generations where user_id='${c}';`), "5");
  console.log("PASS: migration executes; private bucket; customer/staff RLS; anonymous/forged writes denied; duplicate and concurrent reservation; in-flight guard; five-attempt quota.");
} finally {
  // Only this uniquely named, disposable fixture is removed; no shared containers or data.
  spawnSync("docker", ["stop", "--time", "1", container], { encoding: "utf8", timeout: 15000, windowsHide: true });
}
