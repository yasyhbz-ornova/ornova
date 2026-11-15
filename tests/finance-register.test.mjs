import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";

const inquiry = "44444444-4444-4444-8444-444444444444";
const quote = "66666666-6666-4666-8666-666666666666";
const row = { id: quote, inquiry_id: inquiry, source_quote_no: "Q-TEST", source_order_no: "O-TEST", source_revision: 1, accepted_at: "2026-11-15T08:00:00Z", accepted_total_rial: "9007199254740993" };
const { readFinanceRegister } = loadTs("lib/admin/finance-register.ts");

function client({ rows = [row], count = rows.length, viewError = null, inquiries = [{ id: inquiry, customer_name: "مشتری آزمایشی" }], inquiryError = null, payments = [], paymentCount = payments.length, paymentError = null } = {}) {
  const calls = [];
  const adapter = { from(table) {
    calls.push(table);
    if (table === "customer_inquiry_quotes") return {
      select(columns, options) { assert.ok(!columns.includes("payload")); assert.equal(options.count, "exact"); return this; },
      not(column, operator, value) { assert.deepEqual([column, operator, value], ["accepted_at", "is", null]); return this; },
      order() { return this; },
      range(from, to) { assert.equal(to - from, 19); return Promise.resolve({ data: rows, count, error: viewError }); },
    };
    if (table === "inquiries") return { select(columns) { assert.equal(columns, "id,customer_name"); return this; }, in(column, ids) { assert.equal(column, "id"); assert.deepEqual(ids, rows.map(item => item.inquiry_id)); return Promise.resolve({ data: inquiries, error: inquiryError }); } };
    assert.equal(table, "staff_inquiry_payments");
    return { select(columns, options) { assert.equal(columns, "inquiry_id,amount_rial,reversed_at"); assert.equal(options.count, "exact"); return this; }, in(column, ids) { assert.equal(column, "inquiry_id"); assert.deepEqual(ids, rows.map(item => item.inquiry_id)); return Promise.resolve({ data: payments, count: paymentCount, error: paymentError }); } };
  } };
  return { adapter, calls };
}

test("finance register reads only accepted quote projections and preserves large rial strings", async () => {
  const fixture = client();
  const result = await readFinanceRegister(fixture.adapter, 1);
  assert.equal(result.error, false);
  assert.equal(result.count, 1);
  assert.deepEqual(fixture.calls, ["customer_inquiry_quotes", "inquiries", "staff_inquiry_payments"]);
  assert.equal(result.data[0].amountRial, row.accepted_total_rial);
  assert.equal(result.data[0].receivedRial, "0");
  assert.equal(result.data[0].balanceRial, row.accepted_total_rial);
  assert.equal(result.data[0].customerName, "مشتری آزمایشی");
  assert.equal(Object.hasOwn(result.data[0], "payload"), false);
});

test("finance register fails closed on corrupt amounts, incomplete ownership context and database failures", async () => {
  assert.equal((await readFinanceRegister(client({ rows: [{ ...row, accepted_total_rial: 9007199254740993 }] }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ rows: [{ ...row, accepted_at: "bad" }] }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ inquiries: [] }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ viewError: { message: "private" } }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ inquiryError: { message: "private" } }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ payments: [{ inquiry_id: inquiry, amount_rial: "3", reversed_at: null }], paymentCount: 2 }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client({ paymentError: { message: "private" } }).adapter, 1)).error, true);
  assert.equal((await readFinanceRegister(client().adapter, 0)).error, true);
});

test("finance register sums active receipts exactly and excludes reversed history", async () => {
  const result = await readFinanceRegister(client({ payments: [{ inquiry_id: inquiry, amount_rial: "9007199254740992", reversed_at: null }, { inquiry_id: inquiry, amount_rial: "12", reversed_at: "2026-11-15T10:00:00Z" }] }).adapter, 1);
  assert.equal(result.error, false);
  assert.equal(result.data[0].receivedRial, "9007199254740992");
  assert.equal(result.data[0].balanceRial, "1");
});

function page({ user = { id: "staff", app_metadata: { ornova_role: "staff" } }, authError = null, result = { data: [{ inquiryId: inquiry, quoteId: quote, quoteNo: row.source_quote_no, orderNo: row.source_order_no, revision: 1, acceptedAt: row.accepted_at, amountRial: row.accepted_total_rial, receivedRial: "0", balanceRial: row.accepted_total_rial, customerName: "مشتری آزمایشی" }], count: 1, error: false } } = {}) {
  const calls = [];
  const Link = ({ children, href }) => React.createElement("a", { href }, children);
  const loaded = loadTs("app/admin/finance/page.tsx", {
    "next/navigation": { notFound() { throw Error("not-found"); } }, "next/link": { default: Link },
    "@/lib/auth/authorization": { isOrnovaStaff: value => value?.app_metadata?.ornova_role === "staff" },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    "@/lib/admin/finance-register": { FINANCE_PAGE_SIZE: 20, readFinanceRegister: async (_client, number) => { calls.push(number); return result; } },
  });
  return { calls, render: async (params = {}) => renderToStaticMarkup(await loaded.default({ searchParams: Promise.resolve(params) })) };
}

test("finance page authenticates trusted staff before any financial read", async () => {
  for (const options of [{ user: null }, { user: { id: "customer", user_metadata: { ornova_role: "staff" } } }, { authError: { message: "private" } }]) {
    const fixture = page(options);
    await assert.rejects(fixture.render(), /not-found/);
    assert.equal(fixture.calls.length, 0);
  }
  const fixture = page();
  const html = await fixture.render();
  assert.deepEqual(fixture.calls, [1]);
  assert.ok(html.includes("Q-TEST"));
  assert.ok(html.includes("O-TEST"));
  assert.ok(html.includes("مشتری آزمایشی"));
  assert.ok(html.includes("ریال"));
  assert.ok(!html.includes("پرداخت‌شده"));
  await assert.rejects(fixture.render({ page: ["1", "2"] }), /not-found/);
  const unavailable = await page({ result: { data: [], count: 0, error: true } }).render();
  assert.ok(unavailable.includes("فعلاً خوانده نشدند"));
  assert.ok(!unavailable.includes("Q-TEST"));
});
