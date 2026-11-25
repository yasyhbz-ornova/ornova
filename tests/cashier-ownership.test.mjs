import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const receiptId = "39fe816c-5c30-4cde-8200-611bcfb2afd0";
const otherId = "41111111-4444-4444-8444-411111111111";

function fixture(user) {
  const calls = [];
  const records = [
    { id: receiptId, user_id: "a", created_at: "2026-11-24T10:00:00Z", status: "received", message: "private a" },
    { id: otherId, user_id: "b", created_at: "2026-11-24T11:00:00Z", status: "received", message: "private b" },
  ];
  const get = loadTs("app/api/account/inquiries/route.ts", {
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from: (table) => {
        if (table === "inquiry_items") return { select() { return this; }, async in(column, ids) {
          calls.push([column, ids]);
          return { data: [
            { inquiry_id: receiptId, product_slug: "lapis", product_name: "انگشتر لاجورد" },
            { inquiry_id: receiptId, product_slug: "lapis", product_name: "انگشتر لاجورد" },
            { inquiry_id: receiptId, product_slug: "silver-bracelet", product_name: "دستبند نقره" },
            { inquiry_id: otherId, product_slug: "private-work", product_name: "private b work" },
          ].filter((item) => ids.includes(item.inquiry_id)), error: null };
        } };
        assert.equal(table, "inquiries");
        let filtered = records;
        const query = {
          select(columns) { calls.push(["select", columns]); return this; },
          eq(column, value) { calls.push([column, value]); filtered = filtered.filter((row) => row[column] === value); return this; },
          maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
          order() { return this; },
          range: async () => ({ data: filtered, error: null }),
        };
        return query;
      },
    }) },
  }).GET;
  return { calls, get: (suffix = "") => get(new Request(`https://www.ornova.ir/api/account/inquiries?view=receipts${suffix}`)) };
}

test("cashier receipt list and direct receipt lookups are scoped to the verified account", async () => {
  const guest = fixture(null);
  assert.equal((await guest.get()).status, 401);
  assert.deepEqual(guest.calls, []);

  const account = fixture({ id: "a" });
  const list = await account.get();
  assert.equal(list.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await list.json()).receipts, [{
    id: receiptId, status: "received", created_at: "2026-11-24T10:00:00Z", workName: "انگشتر لاجورد", additionalWorks: 1, archiveNumber: null,
  }]);
  assert.deepEqual(account.calls.filter(([column]) => column === "inquiry_id"), [["inquiry_id", [receiptId]]]);
  assert.equal((await account.get(`&receiptId=${otherId}`)).status, 404);
  assert.equal((await account.get("&receiptId=invalid")).status, 400);
  const detail = await account.get(`&receiptId=${receiptId}`);
  assert.equal((await detail.json()).receipt.id, receiptId);
  assert.equal(account.calls.filter(([column, value]) => column === "user_id" && value === "a").length, 3);
});

test("archive receipt summaries use the recorded name without returning a private message", async () => {
  let failed = false;
  let reads = 0;
  const { readReceiptSummaries } = loadTs("lib/account/inquiry-receipts.ts", {
    "./inquiry-items": { readInquiryItems: async () => { reads++; return { data: [], error: failed ? { code: "unavailable" } : null }; } },
  });
  const fields = { id: receiptId, status: "received", created_at: "2026-11-24T10:00:00Z" };
  const archive = { ...fields, message: "درخواست سفارش اثر آرشیو «آویز دندان» (عکس 02)\n\nیادداشت خصوصی" };
  const custom = { ...fields, id: otherId, message: "ایدهٔ خصوصی در کارگاه" };
  assert.deepEqual(await readReceiptSummaries({}, []), []);
  assert.equal(reads, 0);
  assert.deepEqual(await readReceiptSummaries({}, [archive, custom]), [
    { ...fields, workName: "آویز دندان", additionalWorks: 0, archiveNumber: "02" },
    { ...fields, id: otherId, workName: null, additionalWorks: 0, archiveNumber: null },
  ]);
  failed = true;
  assert.deepEqual(await readReceiptSummaries({}, [archive]), [{ ...fields, workName: null, additionalWorks: 0, archiveNumber: null }]);
});

test("saved archive receipts retain the exact title and numbers from before a rename", async () => {
  const readReceipt = loadTs("lib/account/inquiry-receipts.ts", {
    "./inquiry-items": { readInquiryItems: async () => ({ data: [], error: null }) },
    "./inquiry-quotes": { readInquiryQuotes: async () => ({ data: [], error: false }) },
  }).readInquiryReceipt;
  const article = { id: receiptId, created_at: "2026-11-24T10:00:00Z", status: "received" };
  const reference = (title, number) => `درخواست سفارش اثر آرشیو «${title}» (عکس ${number})`;

  for (const [title, number] of [
    ["آویز دندان", "02"],
    ["سنجاق‌سینهٔ دندان تاج‌دار", "02"],
    ["سنجاق‌سینهٔ مدور با نقش بادبان", "18"],
    ["نشان سینهٔ ترازوی عدالت", "18"],
  ]) {
    const result = await readReceipt({}, { ...article, message: `${reference(title, number)}\n\nیادداشت مشتری` });
    assert.equal(result.archiveTitle, title);
    assert.equal(result.archiveNumber, number);
    assert.deepEqual(result.price, { kind: "pending" });
  }

  for (const message of [reference("آویز دندان", "18"), reference("اثر دلخواه", "02"), `یادداشت\n\n${reference("آویز دندان", "02")}`]) {
    const result = await readReceipt({}, { ...article, message });
    assert.equal(result.archiveTitle, null);
    assert.equal(result.archiveNumber, null);
  }
});

test("receipt pricing comes from the current accepted quote only", async () => {
  let quotes;
  const readReceipt = loadTs("lib/account/inquiry-receipts.ts", {
    "./inquiry-items": { readInquiryItems: async () => ({ data: [], error: null }) },
    "./inquiry-quotes": { readInquiryQuotes: async () => ({ data: quotes, error: false }) },
  }).readInquiryReceipt;
  const inquiry = { id: receiptId, created_at: "2026-11-24T10:00:00Z", status: "received", message: "درخواست" };
  const accepted = { id: otherId, document_id: receiptId, source_revision: 1, accepted_at: inquiry.created_at, withdrawn_at: null, payload: { total_rial: "9007199254740993" } };
  quotes = [accepted];
  assert.deepEqual((await readReceipt({}, inquiry)).price, { kind: "accepted", quoteId: otherId, totalRial: "9007199254740993" });

  for (const ineligible of [
    [{ ...accepted, accepted_at: null }],
    [{ ...accepted, withdrawn_at: inquiry.created_at }],
    [{ ...accepted, id: receiptId, source_revision: 2, accepted_at: null }, accepted],
  ]) {
    quotes = ineligible;
    assert.deepEqual((await readReceipt({}, inquiry)).price, { kind: "pending" });
  }
});
