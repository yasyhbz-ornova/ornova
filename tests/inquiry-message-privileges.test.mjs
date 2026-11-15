import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(projectRoot, "supabase/migrations/009_restrict_inquiry_message_inserts.sql"), "utf8");

test("message inserts cannot forge generated IDs or timestamps", () => {
  assert.match(migration, /revoke insert on table public\.inquiry_messages from public, anon, authenticated/i);
  assert.match(migration, /revoke insert \(id, inquiry_id, author_user_id, author_role, body, created_at\)[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant insert \(inquiry_id, author_user_id, author_role, body\)[\s\S]*to authenticated/i);
  assert.doesNotMatch(migration, /grant insert on table public\.inquiry_messages/i);
});
