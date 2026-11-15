// Disposable in-memory PostgreSQL; pass ORNOVA_PGLITE_MODULE to an external install.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

assert.ok(process.env.ORNOVA_PGLITE_MODULE, "set ORNOVA_PGLITE_MODULE to an external PGlite index.js");
const { PGlite } = await import(pathToFileURL(process.env.ORNOVA_PGLITE_MODULE).href);
const db = new PGlite();
const read = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const staff = "33333333-3333-4333-8333-333333333333";
const inquiry = "44444444-4444-4444-8444-444444444444";
const other = "55555555-5555-4555-8555-555555555555";
const json = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const one = async sql => (await db.query(sql)).rows[0];
async function as(id, sql, trusted = false) {
  await db.exec(`begin;set local role authenticated;set local request.jwt.claim.sub='${id}';set local request.jwt.claims='${JSON.stringify({ app_metadata: trusted ? { ornova_role: "staff" } : {}, user_metadata: { ornova_role: "staff" } })}';`);
  try { const result = await db.query(sql); await db.exec("commit;"); return result.rows; }
  catch (error) { await db.exec("rollback;"); throw error; }
}
const quote = (number, revision = 1, validUntil = new Date(Date.now() + 3600000).toISOString()) => ({
  version: 1, source_quote_no: number, source_order_no: "O-TEST", source_revision: revision,
  issued_at: new Date(Date.now() - 60000).toISOString(), valid_until: validUntil,
  lines: [{ description: "قطعهٔ آزمایشی", quantity: 1, amount_rial: "9007199254740993" }],
  discount_rial: "0", tax_rial: "0", total_rial: "9007199254740993",
});
const publish = (value, target = inquiry) => as(staff, `select public.publish_inquiry_quote('${target}','fixture',${json(value)}) as result`, true);
const accept = (id, snapshot, target = inquiry) => as(id, `select public.accept_inquiry_quote('${target}','${snapshot}') as result`);
const paymentTime = "2026-11-15T08:00:00Z";
const payment = (actor,id,amount,reference,target=inquiry) => as(actor, `select public.record_inquiry_payment('${id}','${target}','${amount}','${reference}','${paymentTime}',null) as result`, actor === staff);
const reverse = (actor,id,reason) => as(actor, `select public.reverse_inquiry_payment('${id}','${reason}') as result`, actor === staff);
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}'),('${staff}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
    create schema storage;create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;`);
  await db.exec(read("001_ornova_core.sql").split("-- Private customer storage.")[0]);
  await db.exec(read("003_inquiry_conversations.sql"));
  await db.exec(`insert into public.inquiries(id,user_id,message) values('${inquiry}','${a}','test'),('${other}','${b}','test');`);
  await db.exec(read("013_private_quote_snapshots.sql"));
  await db.exec(read("019_quote_acceptances.sql"));
  await db.exec(read("021_internal_payment_register.sql"));
  const source = quote("Q-ACCEPT");
  const [{ result: first }] = await publish(source);
  assert.ok(first.id);
  await assert.rejects(accept(b, first.id), /QUOTE_FORBIDDEN/);
  await assert.rejects(accept(a, first.id, other), /QUOTE_FORBIDDEN/);
  const [{ result: accepted }] = await accept(a, first.id);
  assert.equal(accepted.created, true);
  assert.equal(accepted.id, first.id);
  assert.equal((await accept(a, first.id))[0].result.created, false, "exact replay must be idempotent");
  const stored = await one(`select snapshot_id,accepted_total_rial::text as amount,accepted_payload->>'total_rial' as payload_amount from public.inquiry_quote_acceptances where inquiry_id='${inquiry}'`);
  assert.deepEqual(stored, { snapshot_id: first.id, amount: source.total_rial, payload_amount: source.total_rial });
  const ownView = await as(a, `select accepted_at,accepted_total_rial from public.customer_inquiry_quotes where id='${first.id}'`);
  assert.equal(ownView.length, 1);
  assert.equal(ownView[0].accepted_total_rial, source.total_rial);
  assert.equal((await as(b, `select accepted_at from public.customer_inquiry_quotes where id='${first.id}'`)).length, 0);
  assert.equal((await as(staff, `select accepted_total_rial from public.customer_inquiry_quotes where id='${first.id}'`, true))[0].accepted_total_rial, source.total_rial);
  const receiptA = "77777777-7777-4777-8777-777777777777";
  const receiptB = "88888888-8888-4888-8888-888888888888";
  const receiptC = "99999999-9999-4999-8999-999999999999";
  await assert.rejects(payment(a,receiptA,"9007199254740991","BANK-A"),/PAYMENT_FORBIDDEN/);
  await assert.rejects(payment(staff,receiptA,"9007199254740991","BANK-A",other),/PAYMENT_NOT_FOUND/);
  assert.equal((await payment(staff,receiptA,"9007199254740991","BANK-A"))[0].result.created,true);
  assert.equal((await payment(staff,receiptA,"9007199254740991","BANK-A"))[0].result.created,false);
  await assert.rejects(payment(staff,receiptA,"1","BANK-A"),/PAYMENT_CONFLICT/);
  await assert.rejects(payment(staff,receiptB,"3","BANK-B"),/PAYMENT_OVERPAY/);
  assert.equal((await payment(staff,receiptB,"2","BANK-B"))[0].result.created,true);
  const visible = await as(staff, `select amount_rial,reversal_reason from public.staff_inquiry_payments where inquiry_id='${inquiry}' order by amount_rial desc`, true);
  assert.deepEqual(visible.map(row=>row.amount_rial),["9007199254740991","2"]);
  assert.equal((await as(a,`select * from public.staff_inquiry_payments where inquiry_id='${inquiry}'`)).length,0);
  await assert.rejects(reverse(a,receiptA,"اصلاح"),/PAYMENT_FORBIDDEN/);
  assert.equal((await reverse(staff,receiptA,"اصلاح"))[0].result.created,true);
  assert.equal((await reverse(staff,receiptA,"اصلاح"))[0].result.created,false);
  await assert.rejects(payment(staff,receiptA,"9007199254740991","BANK-A"),/PAYMENT_CONFLICT/);
  await assert.rejects(reverse(staff,receiptA,"دلیل دیگر"),/PAYMENT_CONFLICT/);
  assert.equal((await payment(staff,receiptC,"3","BANK-C"))[0].result.created,true);
  await assert.rejects(as(a,`update public.inquiry_payment_records set amount_rial=1 where id='${receiptB}'`),/permission denied/);
  await assert.rejects(db.exec(`update public.inquiry_payment_records set amount_rial=1 where id='${receiptB}'`),/PAYMENT_IMMUTABLE/);
  await assert.rejects(publish({ ...source, source_revision: 2 }), /QUOTE_ACCEPTED/);
  await assert.rejects(publish(quote("Q-OTHER")), /QUOTE_ACCEPTED/);
  await assert.rejects(as(staff, `select public.withdraw_inquiry_quote('${inquiry}','${first.id}','test')`, true), /QUOTE_ACCEPTED/);
  await assert.rejects(as(a, `update public.inquiry_quote_acceptances set accepted_total_rial=1 where inquiry_id='${inquiry}'`), /permission denied/);
  await assert.rejects(db.exec(`update public.inquiry_quote_acceptances set accepted_total_rial=1 where inquiry_id='${inquiry}'`), /QUOTE_ACCEPTED/);
  const [{ result: competing }] = await publish(quote("Q-SECOND"), other);
  await assert.rejects(accept(a, competing.id, other), /QUOTE_FORBIDDEN/);
  await as(staff, `select public.withdraw_inquiry_quote('${other}','${competing.id}','test')`, true);
  await assert.rejects(accept(b, competing.id, other), /QUOTE_CONFLICT/);
  const [{ result: expired }] = await publish(quote("Q-EXPIRE", 1, new Date(Date.now() + 180).toISOString()), other);
  await new Promise(resolve => setTimeout(resolve, 250));
  await assert.rejects(accept(b, expired.id, other), /QUOTE_EXPIRED/);
  console.log("PASS: quote acceptance and internal payment register, owner/staff isolation, exact amounts, idempotency, overpayment, reversal and immutable history");
} finally { await db.close(); }
