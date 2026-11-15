import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/008_optimize_inquiry_access.sql", import.meta.url),
  "utf8",
).replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();

test("customer and admin inquiry access paths have supporting indexes", () => {
  for (const index of [
    "inquiries_user_created_idx",
    "inquiry_items_inquiry_id_idx",
    "inquiry_files_inquiry_id_idx",
    "inquiry_messages_author_user_id_idx",
    "inquiry_events_actor_user_id_idx",
  ]) {
    assert.ok(migration.includes(`create index if not exists ${index}`), `missing index ${index}`);
  }
});

test("security-definer functions use an empty search path", () => {
  assert.match(migration, /alter function public\.record_inquiry_status_event\(\) set search_path = ''/);
  assert.match(migration, /alter function public\.create_inquiry_with_items\(text, text, text, jsonb\) set search_path = ''/);
});

test("RLS policies cache auth and trusted-role checks and are limited to authenticated users", () => {
  assert.ok(migration.includes("revoke all on function public.is_ornova_staff() from public, anon"));
  assert.ok(migration.includes("grant execute on function public.is_ornova_staff() to authenticated"));

  const policySql = migration.split("revoke all on function public.is_ornova_staff()")[0];
  const uidCalls = policySql.match(/auth\.uid\(\)/g) ?? [];
  const cachedUidCalls = policySql.match(/\(select auth\.uid\(\)\)/g) ?? [];
  assert.equal(uidCalls.length, cachedUidCalls.length);

  const staffCalls = policySql.match(/public\.is_ornova_staff\(\)/g) ?? [];
  const cachedStaffCalls = policySql.match(/\(select public\.is_ornova_staff\(\)\)/g) ?? [];
  assert.equal(staffCalls.length, cachedStaffCalls.length);
  assert.equal((policySql.match(/create policy/g) ?? []).length, (policySql.match(/for (select|insert|update) to authenticated/g) ?? []).length);
});

test("conversation reads are limited to the request owner or trusted staff", () => {
  for (const policyName of ["inquiry_messages_select_thread", "inquiry_events_select_thread"]) {
    const policy = migration.match(new RegExp(`create policy "${policyName}"[\\s\\S]*?using \\(([\\s\\S]*?)\\);`))?.[1];
    assert.ok(policy, `missing ${policyName} policy`);
    assert.match(policy, /\(select public\.is_ornova_staff\(\)\)/);
    assert.match(policy, /exists \( select 1 from public\.inquiries/);
    assert.match(policy, /inquiries\.id = inquiry_(?:messages|events)\.inquiry_id/);
    assert.match(policy, /inquiries\.user_id = \(select auth\.uid\(\)\)/);
  }
});

test("customer messages require ownership and an open request", () => {
  const policy = migration.match(/create policy "inquiry_messages_insert_thread"[\s\S]*?with check \(([\s\S]*?)\);/)?.[1];
  assert.ok(policy, "missing inquiry_messages_insert_thread policy");
  assert.match(policy, /author_user_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /author_role = 'staff' and \(select public\.is_ornova_staff\(\)\)/);
  assert.match(policy, /author_role = 'customer'[\s\S]*?inquiries\.id = inquiry_messages\.inquiry_id/);
  assert.match(policy, /inquiries\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /inquiries\.status <> 'closed'/);
});
