import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uploadUrlRoute = readFileSync(new URL("../app/api/inquiries/[id]/files/upload-url/route.ts", import.meta.url), "utf8");
const finalizeRoute = readFileSync(new URL("../app/api/inquiries/[id]/files/route.ts", import.meta.url), "utf8");

test("customers cannot create upload URLs for closed inquiries", () => {
  assert.match(uploadUrlRoute, /\.select\("id,status"\)/);
  assert.match(uploadUrlRoute, /inquiry\.status\s*===\s*"closed"[\s\S]*?status:\s*409/);
  assert.match(uploadUrlRoute, /\.eq\("user_id",\s*user\.id\)/);
});

test("customers cannot finalize an upload for a closed inquiry", () => {
  assert.match(finalizeRoute, /\.select\("id,status"\)/);
  assert.match(finalizeRoute, /inquiry\.status\s*===\s*"closed"[\s\S]*?status:\s*409/);
  assert.match(finalizeRoute, /\.eq\("user_id",\s*user\.id\)/);
});
