# Versioning policy

Single source of truth: [`src/lib/version.js`](../src/lib/version.js) → `APP_VERSION`.
`package.json` → `version` must always hold the **same** string. A test and
`npm run check:version` fail the build if they drift.

The version is shown to customers in the site footer and to the owner in the
admin sidebar (`vX.Y.Z`), so the release running on Cloudflare is always
identifiable without opening the dashboard.

## Format

```
MAJOR . MINOR . PATCH
  1   .   1   .   0
```

## Rules

| Change | Bump | Example |
| --- | --- | --- |
| Fix or small feature | `PATCH` + 1 | `1.1.0` → `1.1.1` |
| Big feature | `MINOR` + 1, `PATCH` → 0 | `1.1.4` → `1.2.0` |
| New release | `MAJOR` + 1, `MINOR` and `PATCH` → 0 | `1.4.2` → `2.0.0` |

**Bumping a number resets every number to its right to `0`.** Never bump more
than one position per change.

### What counts as what

- **PATCH — fix or small feature.** Bug fixes, CSP/header/ops tweaks, copy and
  translation changes, a new field or button on an existing screen, dependency
  and security patches, performance work that does not change behaviour.
- **MINOR — big feature.** A new capability or module that a user would
  describe as "the site can now do X": a new admin section, a new storefront
  flow (offers, bundles, stock), a new integration, a new page type.
- **MAJOR — new release.** A coordinated milestone: redesign, breaking data or
  URL change, new product surface, or a hand-over to the owner. Announce it;
  do not use MAJOR for routine work.

If a change is hard to classify, it is a PATCH. Reserve MINOR for work that
ships as a named feature.

## When to bump

Bump **once per batch of changes that is deployed**, not once per commit. Bump
in the same commit that introduces the change, before `npm run cf:deploy`.

`npm run cf:deploy` runs `npm run verify` before building, so a failing gate
(secrets, version, format, lint, typecheck, tests/coverage) blocks the deploy.
CI runs the same `verify` on every push and pull request.

## Checklist

1. Pick the position: PATCH for a fix/small feature, MINOR for a big feature,
   MAJOR for a new release.
2. Increment it by `1` and set everything to its right to `0`.
3. Update **both** files to the same string:
   - `src/lib/version.js` → `APP_VERSION`
   - `package.json` → `version`
4. Run `npm run verify` (`check:version` fails on any mismatch or bad format).
5. Deploy. Confirm the footer/admin sidebar shows the new `vX.Y.Z` on
   https://koutobi-ma.maktabattullabalilm.workers.dev/.
6. If a `build-id` was needed to prove the deploy landed, remember the PWA
   precaches the shell: a stale service worker can mask a release, so check the
   visible version, not just the deploy log.

## Changelog in the admin console

`src/lib/changelog.js` holds one entry per deployed version (newest first).
It powers **لوحة التحكم → سجل التغييرات** (`/admin/changelog`), which only
signed-in admins can open. Add the new release's entry there in the same commit
as the version bump — `changelog.test.js` fails if `APP_VERSION` has no entry.

## History

| Version | Date | Summary |
| --- | --- | --- |
| `1.3.0` | 2026-10-30 | Admin-only «سجل التغييرات» page: every release grouped by version with date, type, notes and the current version highlighted |
| `1.2.2` | 2026-10-30 | Arabic-aware storefront search (normalization, multi-word AND, metadata fields, relevance ranking), packs in results, and a catalog search field |
| `1.2.1` | 2026-10-29 | RTL form direction across the app; horizontal scroll controls for the admin books table |
| `1.2.0` | 2026-10-29 | Admin-managed homepage hero slides with per-slide colour and up to nine books |
| `1.1.12` | 2026-10-27 | Remove the legacy PWA service worker from returning browsers |
| `1.1.11` | 2026-10-27 | Show الباقات everywhere: dedicated page, homepage, catalog filter and categories |
| `1.1.10` | 2026-10-27 | Admin-managed customer reviews; online-only storefront |
| `1.1.8` | 2026-10-26 | Admin setting for books per row (4/6/8) on desktop grids; phones/tablets scale proportionally (2/3–4 columns); most-recent row follows the setting |
| `1.1.7` | 2026-10-26 | «كيف أطلب؟» scrolls to the how-it-works section on every click, not just the first one |
| `1.1.6` | 2026-10-25 | CI on GitHub Actions (`verify` + `build` on push/PR); `verify` now enforces `format:check` and coverage and the test scripts pin `NODE_ENV=test`; Prettier pass over the admin/storefront components; `cf:deploy` runs `verify` first |
| `1.1.5` | 2026-10-25 | Unlimited-depth sub-categories (with drag-and-drop reparenting + save confirmation) across admin, catalog, header hover menus and footer; home category grid capped at two rows; per-type hide switches for the edition specs shown on the public book page |
| `1.1.4` | 2026-10-24 | Telegram uses the paper-plane glyph instead of the “TE” fallback; social icons are full-width pills that stay on one row |
| `1.1.3` | 2026-10-24 | Footer contact e-mail uses a proper mail icon; remove the public `/admin` entry points (header button, mobile drawer, footer link) |
| `1.1.2` | 2026-10-24 | Editable contact e-mail in Admin → محتوى المتجر → روابط مواقع التواصل; footer reads it from content |
| `1.1.1` | 2026-10-20 | Fix admin image uploads: CSP `img-src blob:`, CSP-independent decoding, fresh PWA shell per build |
| `1.1.0` | — | Baseline introduced with the version display |
