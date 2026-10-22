# Private Quote Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the private, immutable, customer-safe quote boundary needed between the future web calculator and customer documents; no financial workflow or live PCS integration is implied.

**Architecture:** Staff review an explicitly labelled transcription of an existing PCS output, then publish an immutable revision through a staff-only atomic RPC. Session-scoped SSR reads and RLS expose only customer-safe fields to the owning inquiry; withdrawal is an append-only event. The future calculator/transport reuses this boundary rather than adding a second price formula.

**Tech Stack:** Existing Next.js App Router 16.4.0, TypeScript, React, Tailwind, Supabase/PostgreSQL, node:test; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-22-private-quote-snapshots-design.md`

## Global Constraints

- Persian-only visible UI, RTL, current design persona/contract; `ring_size_eu` stays canonical.
- Rial values are exact decimal strings, range `0..9223372036854775807`; no Number conversion, pricing engine, invented rates or manufacturing facts.
- Staff role comes only from trusted `app_metadata.ornova_role`; RLS enabled, no service-role key or public customer files.
- No PCS edits, operational DB access, production migration/deployment, invoice/payment acceptance or automatic file transmission.
- Preserve all existing unrelated dirty/staged work. Announce each task's files before editing; use apply_patch. No bulk staging/commit.
- Before UI code, load current design contract/persona once if absent. Before Next API code, read installed route-handler/server-component guides.
- The missing installed PCS directory is not a verified runtime source; `ORNOVA_PCS_SOURCE_KEY` stays unconfigured until the operational source is identified.

## Review Focus

1. Two tabs publish the same revision concurrently: exactly one immutable document, not two or a false failure. Task 2 owns the race test.
2. A staff user tries to move inquiry ownership after publication: deny transfer rather than leak a historical quote. Task 2 owns the FK/trigger test.
3. Expiry passes between preview and retry: new expired documents fail, an identical retry of an existing document remains idempotent. Tasks 1–2 own these tests.
4. A rial total is not divisible by ten or exceeds Number.MAX_SAFE_INTEGER: exact Persian toman rendering without rounding. Task 1 owns the display test.
5. Staff switches the selected inquiry while publication is pending: late success and draft data stay bound to the original inquiry. Task 3 owns this test.

---

## File responsibilities

Task 1: `lib/commerce/quote-snapshot.ts` strict public input/canonicalization; `quote-money.ts` exact presentation; `tests/quote-snapshot.test.mjs` pure behavior.

Task 2: migration `013_private_quote_snapshots.sql`; `scripts/check-quote-database.mjs` isolated real SQL; `app/api/inquiries/[id]/quotes/route.ts` publication; nested `[quoteId]/withdraw/route.ts` withdrawal; `lib/account/inquiry-quotes.ts` safe reads/DTO; `tests/quote-routes.test.mjs` and `quote-access.test.mjs` access behavior; `.env.local.example` documented optional server namespace. No actual `.env.local` edit.

Task 3: `components/admin/InquiryQuoteEditor.tsx`, `components/commerce/InquiryQuoteCard.tsx`, existing `components/admin/InquiryDesk.tsx`, `app/admin/page.tsx`, `app/account/page.tsx`; focused `app/globals.css` only if existing tokens cannot express layout. `tests/quote-ui.test.mjs`; related docs updated with actual evidence, not intended outcomes.

### Task 1: Exact customer-safe quote contract

**Interfaces:** Export `QuoteSnapshotInput`, `QuoteSnapshot`, `QuoteLine`; `parseQuoteSnapshot(input: unknown): {success:true; value:QuoteSnapshot}|{success:false; error:string}`; `validateQuoteDates(value:QuoteSnapshot, now:Date): boolean`; `parseRialInput(value:string): string|null`; `formatRialAsToman(value:string): string`. Parser normalizes dates/strings/amounts but does not apply current-time freshness (the DB's idempotency order needs that separation).

- [ ] Write RED tests for required/unknown keys at every level, version/ranges, timezone/date ordering, row-total semantics and sum-discount-tax equality. Synthetic valid example: two units on one line with total `10000000`, discount `1000000`, tax `900000`, total `9900000`; do not multiply the line total by quantity again.
- [ ] Add RED tests for negative/decimal/exponent/unsafe numeric input, amount above int64, overflow in a sum, zero total, all bounds from the spec, Persian/Arabic amount input, `15` → `۱٫۵ تومان` and exact digits for `9007199254740993` rial. Reject future/expired publication using an injected `now`, not wall-clock-flaky fixtures.
- [ ] Run `node --test tests/quote-snapshot.test.mjs`; observe failures from missing behavior, not fixture syntax.
- [ ] Implement strict parsing/canonicalization and BigInt sum checks; implement exact toman formatting without a floating-point conversion. No rate or tax policy is introduced.
- [ ] Re-run the task tests, then full `npm.cmd test`; inspect outputs for any cost/profit/raw-source exposure. Record the exact results.
- [ ] Review and checkpoint only these files; do not include the existing staged photos or other work.

### Task 2: Private immutable persistence and API

**Consumes:** Task 1's canonical contract. **Produces:** database functions/signatures from the spec, route POST handlers, `readInquiryQuotes(client, inquiryIds:string[]): Promise<{data:CustomerQuoteDTO[];error:boolean}>`. `CustomerQuoteDTO` contains source document/order display numbers, revision, issued/valid/published dates, public payload and `withdrawn_at` only—no source namespace, source customer identifiers, actor IDs, internal reason or raw errors.

- [ ] Create route harness RED tests: anonymous 401; customer/forged user_metadata 403; cross-origin 403; invalid ID 404; unknown keys/amounts 400; missing source config/RPC 503 without fallback; body beyond 65536 bytes 413 even when Content-Length is absent/false. Publish success201/idempotent200; conflict409; no change to inquiry status. Withdrawal must bind quoteId to route inquiryId.
- [ ] Create isolated PostgreSQL fixture modeled on the existing preference fixture: unique --rm postgres container, no host ports/volumes/production URL, real core/staff helpers and migration under test. RED tests cover two customers and staff, role spoofing, source-link uniqueness/immutability, all direct DML denial, stale/future/new revision checks, identical retry after expiry, same-version conflict, lower revision conflict, ownership-transfer denial, closed inquiry, reason privacy, idempotent withdrawal, partial-write rollback and concurrent identical publication.
- [ ] Run both RED commands: `node --test tests/quote-routes.test.mjs tests/quote-access.test.mjs` and `node scripts/check-quote-database.mjs`. A stopped Docker daemon is reported, not a passing SQL test; do not alter/install services automatically.
- [ ] Implement `013_private_quote_snapshots.sql` exactly within the spec: source mapping, public snapshot and withdrawal/private-reason separation; empty search_path staff-only RPCs; no broad privilege grants or changes to customer upload policies. Include equivalent payload validation inside SQL so calling the RPC bypasses neither privacy nor numeric/date constraints. Source identity lock serializes source-link/revision creation. Compare normalized JSONB for retry equality before rejecting an expired existing revision.
- [ ] Implement routes with bounded-stream body reads, server auth/role/origin, configured namespace and explicit public DTO mapping. Do not trust client owner/source/actor fields. Restrict read failures to the quote section and preserve existing inquiry data. Document `ORNOVA_PCS_SOURCE_KEY` only in the example; do not invent or activate a real namespace.
- [ ] Re-run route/SQL tests until passing. In the fixture query owner-visible table/view/function surfaces directly to prove the withdrawal reason and source mapping cannot be recovered by bypassing Next. Ensure all temporary containers/processes are cleaned up.
- [ ] Run full tests/lint/build, inspect scoped diff, and checkpoint only Task 2 files. Do not apply the migration to Supabase or claim production access QA.

### Task 3: Staff review and customer document presentation

**Consumes:** Task 1 parser/money formatting, Task 2 API and `CustomerQuoteDTO`. **Produces:** `InquiryQuoteCard({quote:CustomerQuoteDTO;isPreviousVersion:boolean})`; `InquiryQuoteEditor({inquiryId:string;customerLabel:string;quotes:CustomerQuoteDTO[]})`, keyed by inquiry. Both use existing ivory/silver/graphite styling and accessible native controls.

- [ ] Write RED tests for input→review→publish, editing invalidates review, selected inquiry changes clear the previous preview, late response belongs only to the original inquiry, pending disables duplicate submit, network failure retains fields, server error renders as plain text, returned success uses the stored server snapshot rather than a mutable draft.
- [ ] Add rendering cases: missing quotes vs read failure; separate current/previous revision per source document, expiry and withdrawal text from spec; exact rial/toman display; no accept/pay/invoice buttons or internal fields. Show old `quoted` missing-amount guidance only when no real quote was successfully read; with a stored quote, show its actual document guidance instead. Neither inquiry status nor quote presence implies financial acceptance; keep existing helper tests for the no-document fallback.
- [ ] Run RED tests; implement separate editor/card and minimally wire into account/admin. Admin copy must say this is reviewed transcription, not a live calculator. Do not load full internal PCS objects or unrelated customer profiles into the form.
- [ ] Run task/full tests, `npm.cmd run lint`, `npm.cmd run build`, scoped whitespace and `git status -sb`. Inspect all output and report failures; no completion claim from a running build session.
- [ ] Browser QA with synthetic data only: desktop1280×720/mobile390×844, keyboard/focus/live feedback, no horizontal overflow, validation/review reset, customer-safe document states. Real RLS access is proven by Task 2's fixture; missing actual login QA stays explicitly open. Do not seed real Supabase or alter an existing user's basket to make a screenshot.
- [ ] Save actual screenshots and update `docs/ORNOVA_WORKING_CONTEXT.md` / `docs/ORNOVA_PCS_INTEGRATION.md` with exact test counts, blockers, remaining live-PCS/real-auth/fiscal work and deployment status. Preserve the distinction between proposed, locally implemented and deployed.

## Execution / release handoff

Recommended method: native execution in this same chat, one task at a time, to reuse context and keep usage down. Request a fresh independent review only if an actual reviewer tool is available; never represent self-review as independent. The plan awaits Yas's review before implementation. Local commits/checkpoints must be scoped; production, real migrations and any customer publication remain separate operations requiring the appropriate authorization.

Full calculator continuation follows this slice: resolve actual PCS source, choose the single authoritative calculation path and hosting/port method with conformance tests, then connect its output to this quote contract. Acceptance and invoice creation must reference an exact issued/accepted revision; they are not inferred from the inquiry status or rebuilt from mutable market rates.
