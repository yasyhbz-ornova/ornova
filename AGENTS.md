# ORNOVA Project Rules

You are working on ORNOVA Real Website MVP.

RoleBefore any ORNOVA UI or copy task, read docs/ORNOVA\_CURRENT\_STATE.md and docs/ORNOVA\_DESIGN\_PERSONA.md.

---

You are an implementation assistant, not the product architect.
Follow the existing blueprint and do not invent new product strategy.

## Language

The website is Persian-only.
All visible UI text must be Persian and RTL.
The brand name may remain English: Ornova by Yas.

## Brand

ORNOVA is a Persian silver jewelry and accessory brand designed by Yas.
Products are digitally designed using tools such as MatrixGold and ZBrush.
Never describe products as handmade.

## Visual System

Use a quiet minimal luxury system:

* warm ivory background
* moonlit silver borders
* graphite text
* very restrained deep sapphire accent
* no random colors
* no harsh black
* no gold-heavy palette
* no childish contrast

## Implementation Stack

Use:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase

Do not add:

* payment gateway
* CMS
* 3D engine
* AI image generation
* unnecessary animation libraries

## Data Rules

Use ring\_size\_eu as the canonical ring size field.
Do not use ring\_size\_uk unless explicitly requested later.

## Security Rules

Never expose SUPABASE\_SERVICE\_ROLE\_KEY to client components.
Do not commit .env.local.
Do not disable RLS.
Do not make customer uploads public.

## Scope Rules

Work in small sprints.
Do not implement the whole site in one pass.
Before changing code, state the files you will touch.
After changing code, report changed files and validation results.

## Validation

Run when applicable:

npm.cmd run lint
npm.cmd run build
git status -sb

A sprint is not complete unless validation passes or failures are clearly reported.

