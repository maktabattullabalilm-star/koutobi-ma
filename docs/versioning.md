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

## History

| Version | Date | Summary |
| --- | --- | --- |
| `1.1.4` | 2026-10-24 | Telegram uses the paper-plane glyph instead of the “TE” fallback; social icons are full-width pills that stay on one row |
| `1.1.3` | 2026-10-24 | Footer contact e-mail uses a proper mail icon; remove the public `/admin` entry points (header button, mobile drawer, footer link) |
| `1.1.2` | 2026-10-24 | Editable contact e-mail in Admin → محتوى المتجر → روابط مواقع التواصل; footer reads it from content |
| `1.1.1` | 2026-10-20 | Fix admin image uploads: CSP `img-src blob:`, CSP-independent decoding, fresh PWA shell per build |
| `1.1.0` | — | Baseline introduced with the version display |
