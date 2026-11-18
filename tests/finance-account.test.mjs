import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";

const inquiryId = "44444444-4444-4444-8444-444444444444";
const quote = { inquiry_id: inquiryId, source_quote_no: "Q-1", source_order_no: "O-1", source_revision: 2, accepted_at: "2026-11-15T09:00:00Z", accepted_total_rial: "9007199254740993" };
const payment = { id: "55555555-5555-4555-8555-555555555555", inquiry_id: inquiryId, amount_rial: "9007199254740992", reference: "BANK-1", paid_at: "2026-11-15T10:00:00Z", note: null, recorded_at: "2026-11-15T10:00:01Z", reversed_at: null, reversal_reason: null };
const { readFinanceAccount } = loadTs("lib/admin/finance-account.ts", { "@/lib/commerce/quote-money": loadTs("lib/commerce/quote-money.ts") });
function client({ payments = [payment], count = payments.length, quoteData = [quote], inquiryData = { customer_name: "مشتری" } } = {}) {
  return { from(table) {
    if (table === "customer_inquiry_quotes") return { select() { return this; }, eq() { return this; }, not() { return this; }, limit: async () => ({ data: quoteData, error: null }) };
    if (table === "inquiries") return { select() { return this; }, eq() { return this; }, single: async () => ({ data: inquiryData, error: null }) };
    assert.equal(table, "staff_inquiry_payments");
    return { select(_columns, options) { assert.equal(options.count, "exact"); return this; }, eq() { return this; }, order() { return this; }, range: async () => ({ data: payments, count, error: null }) };
  } };
}

test("account keeps exact large rial balance and excludes reversed entries", async () => {
  const result = await readFinanceAccount(client({ payments: [payment, { ...payment, id: "66666666-6666-4666-8666-666666666666", amount_rial: "15", reference: "BANK-2", reversed_at: "2026-11-15T11:00:00Z", reversal_reason: "تکراری" }] }), inquiryId);
  assert.equal(result.receivedRial, "9007199254740992");
  assert.equal(result.balanceRial, "1");
  assert.equal(result.payments.length, 2);
});

test("account refuses truncated or inconsistent financial rows", async () => {
  assert.equal(await readFinanceAccount(client({ count: 2 }), inquiryId), null);
  assert.equal(await readFinanceAccount(client({ payments: [{ ...payment, amount_rial: 9007199254740992 }] }), inquiryId), null);
  assert.equal(await readFinanceAccount(client({ quoteData: [] }), inquiryId), null);
});

test("finance detail authenticates staff before reading account", async () => {
  const calls = [];
  const loaded = loadTs("app/admin/finance/[inquiryId]/page.tsx", {
    "next/navigation": { notFound() { throw Error("not-found"); }, redirect(url) { throw Error(`redirect:${url}`); } },
    "@/components/admin/AdminAccessDenied": { AdminAccessDenied: ({ returnTo }) => React.createElement("p", null, `denied:${returnTo}`) },
    "next/link": { default: ({ children, href }) => React.createElement("a", { href }, children) },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "customer", user_metadata: { ornova_role: "staff" } } }, error: null }) } }) },
    "@/lib/auth/authorization": { isOrnovaStaff: () => false },
    "@/lib/admin/finance-account": { readFinanceAccount: async () => { calls.push("read"); return null; } },
    "@/components/admin/ManualPaymentEditor": { default: () => null },
  });
  assert.match(renderToStaticMarkup(await loaded.default({ params: Promise.resolve({ inquiryId }) })), /denied:\/admin\/finance/);
  assert.deepEqual(calls, []);
});
