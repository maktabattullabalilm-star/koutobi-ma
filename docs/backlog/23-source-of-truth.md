# 23. Single source of truth (categories / seed / config / schema split)

- **Status:** **done**
- **Done 2026-09-22:** `lib/site.js` (identity + `FALLBACK_CATEGORIES` + `warnFallback`) vs `lib/config.js` (env + endpoints only) — `CATEGORIES` object deleted, all consumers migrated (BookForm/AdminLogin/Footer/Cart/tests); fallback use logs drift warnings; `seed-parity.test.js` locks `sampleData.js` ↔ `seed.sql` (titles/prices/categories).
- **Deliberately not done:** splitting `schema.sql` into replay files (cloud holds the 5 applied versions; fabricating local copies risks divergence — fresh installs use `schema.sql`, now complete per 11); `books.category` stays text-by-design with rename-propagation (backlog 02).
- **Size:** M
- **Depends on:** 11 (migrations), 21 (consumers)
- **Severity:** arch medium

## Goal

DB is truth; code never hardcodes what DB owns; seed never drifts.

## Findings

- `src/lib/config.js:10-17 CATEGORIES` vs DB `categories` vs `BookForm.jsx:68-71 FALLBACK_CATS/PAPER/BINDING/SIZES` — three truths.
- `src/lib/sampleData.js:1-124` mirrors `supabase/seed.sql:1-74` manually; `config.js:1-21` mixes env, endpoints, constants, hardcoded phone/name (test locks at `config.test.js:6`).
- `supabase/schema.sql:1-187` monolith; `src/lib/utils.ts:1` lone-TS re-export of obscure `cn` dep (`package.json:19`) vs standard `clsx+tailwind-merge`.

## Spec / acceptance criteria

- [ ] DB-driven selects everywhere with `FALLBACK_*` only as offline fallback (already pattern — enforce + log drift warning if fallback used in prod).
- [ ] `sampleData.js` generated from `seed.sql` (script) or deleted in favor of `DEMO_MODE` fixture generator; CI asserts parity.
- [ ] `config.js` split → `env.js` (Vite env + placeholder guard) + `constants.js` (21) + `site.js` (name/phone, env-overridable not hardcoded).
- [ ] `schema.sql` split into `migrations/` (11); `utils.ts` removed or full-TS decision made (see 25).

## Touches

- `src/lib/config.js`, `sampleData.js`, `supabase/*`, `scripts/*`.

## Risks / notes

- Renaming `CATEGORIES` shape breaks Header/Footer/Home — codemod + tests.
