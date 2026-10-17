# ORNOVA Current Project State

## Purpose

This file is the persistent project context for Codex.

Codex must read this file together with AGENTS.md before every new task.

Codex must not rebuild the project from scratch.
Codex must work as a patch assistant on the current codebase.

---

## Current Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase client/server scaffold, auth callback, proxy session refresh, migration and RLS policies are configured; local credentials are configured for the dedicated `ornova` project in Central EU (Frankfurt), and the core migration has been executed successfully
* Persian-only UI
* RTL layout
* Inquiry-based commerce, not direct checkout

---

## Current Completed Scope

Sprint 1 and Sprint 1.1 created the public UI shell.

Existing areas:

* Global Persian RTL layout
* Ornova design tokens
* SiteHeader
* SiteFooter
* Home page
* Shop page
* Product detail page
* Custom Design page
* Ring Builder concept page
* Account / client dashboard concept
* Guide, size guide, silver care, silver properties and FAQ content routes
* Concept routes including approved Archive Home route
* Local request basket with product actions
* Inquiry API and private-file upload routes ready for authenticated Supabase use
* Real Ornova product images restored and wired to product cards

---

## Locked Product Names

Use these exact product names unless explicitly changed by the project owner:

* انگشتر نقره «لاجورد شب»
* سنجاق سینه نقره «گلدان خاموش»
* بروچ نقره «سپید»

Do not shorten them to only poetic names.

---

## Brand Truth

ORNOVA pieces are not handmade.

Correct language:

* طراحی دیجیتال جواهر
* طراحی قابل ساخت
* طراحی شده با نگاه فنی و هنری
* طراحی اختصاصی جواهرات نقره
* طراحی با ابزارهایی مانند MatrixGold و ZBrush

Forbidden language:

* دست‌ساز
* دست ساز
* handmade

---

## Commerce Model

The website is inquiry-based.

Use:

* درخواست قیمت
* افزودن به سبد درخواست
* ارسال برای بررسی Ornova

Do not use:

* fake prices
* تومان
* direct checkout
* payment gateway

---

## Ring Size Rule

Database field planned:

* ring_size_eu

Visible Persian UI text must use:

* سایز اروپایی انگشتر

Forbidden visible UI text:

* ring_size_eu
* ring_size_uk

---

## Visual Direction

ORNOVA visual mood:

* minimal
* premium
* moonlit
* silver
* quiet
* feminine
* Persian
* emotionally warm
* professional

Use:

* warm ivory base
* moonlit silver borders
* graphite text
* restrained sapphire accents
* dark navy only for limited preview panels

Avoid:

* random colors
* harsh black
* gold-heavy palette
* childish contrast
* Divar/classified-ad feeling
* dry admin dashboard feeling
* clutter

---

## Image Policy

Do not generate product photos.

Do not add fake real product photos. The current selected product images are real Ornova assets restored from project history. For products without approved imagery, use elegant abstract placeholders that feel like:

* dark textile
* moonlit silver
* jewelry silhouette
* editorial crop logic
* consistent card proportions

---

## Current Pages That Should Not Be Rebuilt Broadly

Do not broadly redesign these unless explicitly requested:

* app/page.tsx
* app/shop/page.tsx
* app/shop/[slug]/page.tsx
* app/custom-design/page.tsx
* app/ring-builder/page.tsx
* app/account/page.tsx
* components/layout/SiteHeader.tsx
* components/layout/SiteFooter.tsx
* lib/constants/products.ts
* styles/tokens.css

Future work should be small scoped patches.

---

## Known Open Items

These are not finished yet:

* Verify authenticated inquiry submission and private upload with real accounts
* admin panel
* quote/pre-invoice logic
* messages
* final cross-device mobile polish

Verified deployment state (2026-10-17):

* The latest `main` deployment is Ready on Vercel.
* `https://ornova.ir/` and `https://www.ornova.ir/` resolve through Cloudflare and return HTTP 200.
* Production HTML contains the current ritual archive hero and commerce paths.
* Supabase authenticated inquiry testing and the pending security migration still require an authenticated dashboard session.

Do not implement these unless the current sprint explicitly asks for them.

---

## Codex Working Rule

For every new task:

1. Read AGENTS.md.
2. Read docs/ORNOVA_CURRENT_STATE.md.
3. State files to touch before editing.
4. Patch only the requested scope.
5. Do not rebuild existing pages unless explicitly requested.
6. Run:

npm.cmd run lint
npm.cmd run build
git status -sb

7. Report changed files and validation results.
