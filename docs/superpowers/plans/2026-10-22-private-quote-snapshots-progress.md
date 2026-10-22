# SDD ledger — plan: docs/superpowers/plans/2026-10-22-private-quote-snapshots.md

- Execution approved by Yas: native, same chat, task-by-task. Baseline e8c0b06; branch codex/private-quote-snapshots. Baseline npm test passed (122 dots).
- Ruling: keep the owner-requested existing checkout and isolate commits on a new codex branch, not a fresh worktree — extensive uncommitted prior features are prerequisites and must remain available — isolation is by scoped files/commits, not a separate filesystem.
- Ruling: use this tracked PowerShell-compatible ledger rather than Bash-only SDD wrappers — shell scripts rely on an unverified Bash environment; no dependency installation needed — manual task bookkeeping must retain the same evidence.
- Pre-flight 1→2: canonical QuoteSnapshot string amounts feed API/SQL; both must reject unknown fields and enforce identical sums/date normalization. SQL remains authority for publish-time freshness/idempotency.
- Pre-flight 2→3: CustomerQuoteDTO must include withdrawal timestamp but not private withdrawal reason/source linkage; read failures stay independent of inquiry loading.
- Task 1: complete. Seven behavioral tests failed on absent exports, then passed; full 129 tests and ESLint passed (exit 0). Exact int64 amounts, sum consistency, dates, localized input and fractional/large toman rendering covered. No calculator/source configuration activated.
- Task 2: in progress. Files: migration 013, quote routes/reader, tests, isolated SQL fixture and example source namespace. Only a disposable DB may run migrations.
