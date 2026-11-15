// Disposable in-memory PostgreSQL. Pass ORNOVA_PGLITE_MODULE to an external PGlite install.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const modulePath = process.env.ORNOVA_PGLITE_MODULE;
assert.ok(modulePath, "set ORNOVA_PGLITE_MODULE to a PGlite index.js outside the repository");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const read = (name) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const one = async (sql) => (await db.query(sql)).rows[0];
const customer = "11111111-1111-4111-8111-111111111111";
const staff = "33333333-3333-4333-8333-333333333333";
const as = async (id, sql, trusted = false) => {
  await db.exec(`begin;set local role authenticated;set local request.jwt.claim.sub='${id}';set local request.jwt.claims='${JSON.stringify({app_metadata:trusted?{ornova_role:"staff"}:{},user_metadata:{ornova_role:"staff"}})}';`);
  try { const result = await db.query(sql); await db.exec("commit;"); return result.rows; }
  catch (error) { await db.exec("rollback;"); throw error; }
};
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const request = (items) => `select public.create_inquiry_with_configurations('آزمون','پیام','test@example.invalid',${json(items)}) as id`;
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${customer}'),('${staff}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
  await db.exec(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  await db.exec(read("003_inquiry_conversations.sql").split("create table if not exists public.inquiry_messages")[0]);
  await db.exec(read("005_save_inquiry_customer_name.sql"));
  await db.exec(read("011_product_request_preferences.sql"));
  await db.exec(read("012_independent_request_configurations.sql"));
  await db.exec(read("017_catalog_products.sql"));
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text not null,public boolean not null,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(name text primary key,bucket_id text not null);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant insert on storage.objects to authenticated;`);
  await db.exec(read("018_catalog_media.sql"));
  await db.exec(read("020_catalog_room_placement.sql"));
  const bucket = await one("select public,file_size_limit,allowed_mime_types from storage.buckets where id='ornova-catalog'");
  assert.equal(bucket.public, true);
  assert.equal(Number(bucket.file_size_limit), 4194304);
  assert.deepEqual(bucket.allowed_mime_types, ["image/png", "image/jpeg", "image/webp"]);
  const media = "12345678-1234-4234-8234-123456789abc.webp";
  // Storage uploads with upsert:false need INSERT only; RETURNING would also require SELECT.
  const upload = (name, target = "ornova-catalog") => `insert into storage.objects(name,bucket_id) values('${name}','${target}')`;
  await assert.rejects(as(customer, upload(media)), /row-level security|permission denied/i);
  await assert.rejects(as(staff, upload("customer/forged.webp"), true), /row-level security|permission denied/i);
  await assert.rejects(as(staff, upload(media, "ornova-private"), true), /row-level security|permission denied/i);
  await as(staff, upload(media), true);
  assert.equal((await one("select count(*)::int as n from storage.objects where bucket_id='ornova-catalog'")).n, 1);
  const counts = await one("select count(*)::int as n from public.catalog_products where status='published'");
  assert.equal(counts.n,3);
  assert.equal((await as(customer,"select count(*)::int as n from public.catalog_products"))[0].n,3);
  assert.equal((await as(customer,"select count(*)::int as n from public.catalog_products where status='review'"))[0].n,0);
  const draft = {name:"انگشتر آزمون",category_id:"rings",category_label:"انگشتر",subtype_id:null,description:"توضیح آزمون",image_path:null,stand_image_path:null,gallery:[],details:[],packaging_gallery:[],turntable_video_path:null,image_fit:"contain",gallery_placement_verified:false,status:"review"};
  const save = (rev, value = draft) => `select (public.save_catalog_product('test-ring',${rev},${json(value)})).revision as revision`;
  await assert.rejects(as(customer,save(0)),/CATALOG_FORBIDDEN/);
  assert.equal((await as(staff,save(0),true))[0].revision,1);
  await assert.rejects(as(staff,save(0),true),/CATALOG_CONFLICT/);
  await assert.rejects(as(customer,request([{product_slug:"test-ring",quantity:1}])),/invalid product/);
  const published = {...draft,image_path:"/images/ornova/lajvard-shab-01.jpg",stand_image_path:"/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp",gallery:[{src:"/images/ornova/lajvard-shab-01.jpg",alt:"آزمون"}],gallery_placement_verified:true,status:"published"};
  assert.equal((await as(staff,save(1,published),true))[0].revision,2);
  await assert.rejects(as(staff,save(1,published),true),/CATALOG_CONFLICT/);
  const placement = {src:published.stand_image_path,image:[994,608],bounds:[50,84,893,439]};
  const place = (rev,value) => `select (public.save_catalog_room_placement('test-ring',${rev},${json(value)})).revision as revision`;
  await assert.rejects(as(customer,place(2,placement)),/CATALOG_FORBIDDEN/);
  await assert.rejects(as(staff,place(2,{...placement,bounds:[50,84,990,439]}),true),/CATALOG_INVALID/);
  await assert.rejects(as(staff,place(2,{...placement,src:"/images/ornova/other.webp"}),true),/CATALOG_CONFLICT/);
  assert.equal((await as(staff,place(2,placement),true))[0].revision,3);
  assert.equal((await as(customer,"select room_placement->>'src' as src from public.catalog_products where slug='test-ring'"))[0].src,placement.src);
  const replaced = {...published,stand_image_path:"/images/ornova/gallery/products/replaced-stand.webp"};
  assert.equal((await as(staff,save(3,replaced),true))[0].revision,4);
  assert.equal((await one("select room_placement from public.catalog_products where slug='test-ring'")).room_placement,null);
  const [created] = await as(customer,request([{product_slug:"test-ring",quantity:1,preferences:{version:1,ring_size_eu:54}}]));
  assert.equal((await one(`select product_name from public.inquiry_items where inquiry_id='${created.id}'`)).product_name,"انگشتر آزمون");
  assert.equal((await one(`select preferences->>'ring_size_eu' as size from public.inquiry_items where inquiry_id='${created.id}'`)).size,"54");
  await as(staff,save(4,{...replaced,status:"archived"}),true);
  await assert.rejects(as(customer,request([{product_slug:"test-ring",quantity:1}])),/invalid product/);
  assert.equal((await one(`select product_name from public.inquiry_items where inquiry_id='${created.id}'`)).product_name,"انگشتر آزمون");
  console.log("PASS: catalog migrations, RLS, staff media, measured room placement, revisions, publication and request snapshots");
} finally { await db.close(); }
