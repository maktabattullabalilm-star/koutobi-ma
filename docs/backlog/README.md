# Backlog — active work

Only planned and in-progress work lives here. Completed tasks were removed on
2026-10-27; their history is still in git:

```bash
git log --all -- docs/backlog
git show <commit>:docs/backlog/<file>
```

Code comments still use the historical task numbers (`backlog 19`, `backlog 21`,
…); the matching files are available from git history.

## Active

| # | Task | Status | Size | Severity |
|---|------|--------|------|----------|
| 6 | [Full responsiveness pass](./06-responsiveness.md) | planned | M | UX |
| 31 | [Store identity, SEO and no-fallback storefront](./31-store-identity-branding.md) | in_progress | L | multi-client blocker |

## Completed (files removed)

- **1–5** — image system v2, editable categories/attributes, stock basics,
  sifatusafwa + ISBN imports.
- **7–16** — TOTP 2FA, server-side order pricing, stock RPC hardening, R2 upload
  XSS, schema/RLS truth, secrets hygiene, security headers/CSP, auth hardening,
  validation/PII, import SSRF.
- **17–26** — bundle splitting, responsive images, SEO head/sitemap, fonts,
  architecture split, constants dedupe, source of truth, backend boundary,
  lint/type cleanup, test expansion.
- **27–30** — i18n prep, a11y pass, PWA/offline, observability/ops.

## Explicitly deferred (not in backlog)

Wishlist, product reviews, multi-language / multi-currency, newsletter,
Trustpilot-style widgets — none needed to sell books for cash on delivery.

## Conventions for every task

- Local-first testing per `TESTING.md` (hand-testing by the owner, no Netlify
  deploys without approval).
- Test data uses `TEST-` prefixes; wiped with `scripts/cleanup-test-data.sql`.
- R2 test uploads go to `covers/_test/` and are deleted after verification.
- No service-role key anywhere — server code verifies admins via anon key + RLS.
