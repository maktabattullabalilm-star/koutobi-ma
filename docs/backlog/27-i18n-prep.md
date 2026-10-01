# 27. i18n prep (single-locale today, translatable tomorrow)

- **Status:** **done**
- **Done 2026-09-22:** `lib/i18n/` (`ar.json` + `t()` + `LOCALE`/`CURRENCY`); validators + AnnouncementBar consume the dictionary (no duplicated sentences); `format.js` uses `LOCALE`/`CURRENCY`; `slugifyAr` + tests; `categories.slug` column live with verified backfill + auto-fill on create + `schema.sql` updated.
- **Deliberately incremental:** full string extraction stays boy-scout (migrate the file you touch); slug-based routing is a follow-up (slugs stored, URLs still use `?category=` names).
- **Size:** M
- **Depends on:** 22 (strings centralized first), 25
- **Severity:** quality medium — explicitly deferred in README but tracked

## Goal

Stay Arabic-only for COD Morocco, but stop adding to i18n debt. New code translatable without refactor.

## Findings

- No `i18n` dep, no `locales/*.json`; 100+ inline Arabic hits (`App.jsx:26-28`, `Header/Footer/Home/Cart/Checkout/BookDetail`, `AnnouncementBar MESSAGES`, lib errors in Arabic). `format.js:3,9` locks `ar-MA + درهم`; `Catalog.jsx:58 localeCompare(...,'ar')`; `components.json:18 rtl:true` but no locale switcher. `CATEGORIES` slug===Arabic name, works only via `encodeURIComponent`.

## Spec / acceptance criteria

- [ ] Add `src/lib/i18n/` dictionary (`ar.json` only, `t(key)` helper, `Intl` locale constant); migrate `AnnouncementBar/Toast/Checkout` messages first as pattern; lint rule bans new raw user-facing strings outside dictionary (allow gradual migration, no big-bang rewrite).
- [ ] Slugs: keep Arabic slugs working (redirects) but add ASCII `slug` column (transliteration) for new categories/books; canonical uses ASCII.
- [ ] Currency/locale via constants (`CURRENCY='MAD'`, `LOCALE='ar-MA'`) not literals.
- [ ] README deferred list updated: multi-language stays deferred for product, but infra ready.

## Touches

- `src/lib/i18n/*`, `src/components/*`, `src/pages/*`, `supabase/` slug column migration (optional phase 2).

## Risks / notes

- Full string extraction is large — do incrementally per file touched by other tasks (boy-scout rule).
