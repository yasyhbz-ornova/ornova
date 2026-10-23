# PCS Engine Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Yas explicitly chose native, same-chat, step-by-step execution.

**Goal:** Make the existing PCS C# test gate repeatable without modifying either original source tree or accessing operational data.

**Architecture:** An opt-in Node script validates the pinned common engine, copies only build source into a fresh temporary fixture, and runs the caller-specified verified .NET SDK with offline cached packages. A real TRX report, not console wording, determines success.

**Tech Stack:** Node built-ins; the existing .NET10/xUnit PCS projects; dev-only `@xmldom/xmldom`0.9.12 for structural TRX parsing (final-review ruling).

**Spec:** `docs/ORNOVA_PCS_INTEGRATION.md`, sections «ادامهٔ بررسی موتور» and «ازسرگیری اجرایی». This is the already requested prerequisite stage, not a new pricing strategy or live API.

## Global Constraints

- Keep current checkout/branch and pre-existing changes; never modify original PCS source, operational SQLite, PATH, shared Docker/network configuration or provider credentials.
- Common engine SHA256: `48C17189FD76F18DB89F290B1981E448D0FAED7770EC4F7BDC870DAB0220819A`.
- Copy only .cs/.csproj in Domain/Application/Infrastructure/Reporting/tests plus the three root build configuration files. Exclude bin/obj, hidden entries, symlinks, DB/config/customer data.
- No network restore: explicit local package source, NuGet audit disabled only for this offline baseline test. This is not a dependency security audit.
- No auto-download, install, source discovery, cleanup, service activation or desktop UI launch in the runner. Explicit --dotnet, --source and --packages arguments.
- Retain the unique temporary fixture/report for inspection; no recursive deletion or modification of an existing target.
- Both pricing methods remain the owner's selected destination; passing existing core tests does not establish quick-method parity, web connection, financial acceptance or invoice readiness.

## Review Focus

1. Existing destination or source-overlapping target must be refused without overwriting source or data.
2. A link or excluded file must not copy customer data out of the allowed source set.
3. An empty, skipped, failed or inconsistent report must never be labelled passing.
4. Child processes must not inherit provider/database credentials or a conflicting dotnet host.
5. A changed engine or missing source marker must fail before tests; never fall back to another source folder.

### Task 1: Safe fixture and test-result boundary

**Files:** create `scripts/pcs-engine-verification.mjs`, `tests/pcs-engine-verification.test.mjs`.

**Interfaces:** `verifyPcsSource(root)` checks markers and pinned SHA; `copyPcsSources(root,target)` copies the allowlisted source set into a new target; `readPassingCounters(xml)` returns integer total/executed/passed only for a fully green run; `dotnetEnvironment(parent,sdk,workspace)` returns a minimal child environment without mutating parent.

- [x] Write filesystem/report/environment tests first; run `node --test tests/pcs-engine-verification.test.mjs`, expecting assertion failures on missing exports.
- [x] Implement exact boundaries above, including excluded/nested destinations and unsafe reports.
- [x] Rerun focused tests and `npm.cmd test`; require all passing.
- [x] Checkpoint only these new files and this plan/ledger; preserve existing staged photos and unrelated changes.

### Task 2: Opt-in native gate and evidence

**Files:** complete CLI in the runner; update this ledger, `docs/ORNOVA_PCS_INTEGRATION.md`, `docs/ORNOVA_WORKING_CONTEXT.md`.

**Interfaces:** CLI requires --dotnet PATH --source ROOT --packages CACHE; creates a unique `ornova-pcs-engine-*` fixture, restores/tests its copied test project, reads `results/pcs.trx`, and prints source hash, real counters and report path. Nonzero process status, missing report or invalid counters fails the command.

- [x] Exercise missing/unknown arguments as a failing boundary; implement explicit argument handling without side effects on import.
- [x] Run against working source with the hash-verified temporary SDK10.0.402 and existing local NuGet cache. Expected:68 passed,0 failed/skipped, original source unchanged. Actual count is read from TRX, not hard-coded as success.
- [x] Run full Node suite, lint, build and scoped diff/status checks. Review once with a fresh reviewer when available, fix Important findings via RED→GREEN, document limitations.
- [x] Record SDK recovery, exact test evidence and next engine-contract step. No push/deploy or live API claim.
