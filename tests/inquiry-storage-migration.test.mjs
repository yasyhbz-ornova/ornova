import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/007_lock_inquiry_uploads.sql", import.meta.url),
  "utf8",
).replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();

test("private inquiry bucket enforces the API's file size and MIME limits", () => {
  assert.match(migration, /update storage\.buckets set public = false/);
  assert.match(migration, /file_size_limit = 10485760/);
  for (const mime of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
    assert.ok(migration.includes(mime), `missing bucket MIME restriction: ${mime}`);
  }
});

test("customers cannot append request items outside the atomic inquiry RPC", () => {
  assert.match(migration, /drop policy if exists "inquiry_items_insert_own" on public\.inquiry_items/);
  assert.match(migration, /revoke insert on public\.inquiry_items from anon, authenticated/);
});

test("private uploads are scoped to the authenticated owner's existing inquiry", () => {
  assert.match(migration, /drop policy if exists "private_files_insert_own" on storage\.objects/);
  assert.match(migration, /create policy "private_files_insert_own" on storage\.objects for insert to authenticated/);
  assert.ok(migration.includes("(storage.foldername(name))[1] = (select auth.uid())::text"));
  assert.ok(migration.includes("inquiries.id::text = (storage.foldername(name))[2]"));
  assert.match(migration, /inquiries\.user_id = \(select auth\.uid\(\)\)/);
});

test("file metadata rows must correspond to the actual private storage object", () => {
  assert.match(migration, /drop policy if exists "inquiry_files_insert_own" on public\.inquiry_files/);
  assert.match(migration, /storage\.objects\.name = inquiry_files\.storage_path/);
  assert.match(migration, /storage\.objects\.metadata ->> 'mimetype' = inquiry_files\.content_type/);
  assert.match(migration, /storage\.objects\.metadata ->> 'size' = inquiry_files\.size_bytes::text/);
});

test("inquiry status updates require both a column grant and trusted staff RLS", async () => {
  const staffMigration = (await import("node:fs")).readFileSync(
    new URL("../supabase/migrations/003_inquiry_conversations.sql", import.meta.url),
    "utf8",
  ).replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();

  assert.match(staffMigration, /revoke update on public\.inquiries from authenticated/);
  assert.match(staffMigration, /grant update \(status\) on public\.inquiries to authenticated/);
  assert.match(staffMigration, /create policy "inquiries_update_staff" on public\.inquiries for update using \(public\.is_ornova_staff\(\)\) with check \(public\.is_ornova_staff\(\)\)/);
});
