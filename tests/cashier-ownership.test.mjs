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
        assert.equal(table, "inquiries");
        let filtered = records;
        const query = {
          select(columns) { calls.push(["select", columns]); return this; },
          eq(column, value) { calls.push([column, value]); filtered = filtered.filter((row) => row[column] === value); return this; },
          maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
          order() { return this; },
          range: async () => ({ data: filtered.map(({ id, status, created_at }) => ({ id, status, created_at })), error: null }),
        };
        return query;
      },
    }) },
    "@/lib/account/inquiry-receipts": { readInquiryReceipt: async (_client, inquiry) => ({ receipt: { id: inquiry.id, items: [] } }) },
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
  assert.deepEqual((await list.json()).receipts.map((receipt) => receipt.id), [receiptId]);
  assert.equal((await account.get(`&receiptId=${otherId}`)).status, 404);
  assert.equal((await account.get("&receiptId=invalid")).status, 400);
  const detail = await account.get(`&receiptId=${receiptId}`);
  assert.equal((await detail.json()).receipt.id, receiptId);
  assert.equal(account.calls.filter(([column, value]) => column === "user_id" && value === "a").length, 3);
});
