# Backlog — koutobi-ma

Planned work, one file per task. Status legend: `planned` → `in_progress` → `done`.

## Build order (dependency-aware)

| # | Task file | Status | Size |
|---|-----------|--------|------|
| 1 | [Image system v2](./01-image-system-v2.md) | **done** | L |
| 2 | [Editable categories & attributes](./02-categories-attributes.md) | **done** | M |
| 3 | [Stock basics + quantity visibility](./03-stock-quantity.md) | **done** | M |
| 4 | [Import from sifatusafwa URL](./04-sifatusafwa-import.md) | **done** | M |
| 5 | [Import by ISBN](./05-isbn-import.md) | **done** | S–M |
| 6 | [Full responsiveness pass](./06-responsiveness.md) | planned | M |
| 7 | [Admin TOTP two-factor](./07-totp-2fa.md) | **done** | M |

## Senior audit — fix order (dependency-aware)

P0 security first, then arch, then quality/perf. Authorized scope: everything, direct DB access, breaking hardening allowed.

| # | Task file | Status | Size | Severity |
|---|-----------|--------|------|----------|
| 8 | [Server-side order pricing + anti-spam](./08-server-order-pricing.md) | **done** | L | critical |
| 9 | [Harden `decrement_stock` RPC](./09-decrement-stock.md) | **done** | S | high |
| 10 | [R2 upload XSS hardening](./10-r2-upload-xss.md) | **done** | M | high |
| 11 | [Schema + RLS single source of truth](./11-schema-rls-truth.md) | **done** | L | high |
| 12 | [Secrets hygiene + leak prevention](./12-secrets-hygiene.md) | **done** | S | high |
| 13 | [Security headers + CSP + caching](./13-security-headers.md) | **done** | S | medium |
| 14 | [Auth hardening](./14-auth-hardening.md) | **done** | M | medium |
| 15 | [Validation + PII + error hygiene](./15-validation-pii.md) | **done** | M | medium |
| 16 | [Import SSRF hardening](./16-import-ssrf.md) | **done** | M | medium |
| 17 | [Bundle splitting + lazy routes](./17-bundle-splitting.md) | **done** | M | perf high |
| 18 | [Responsive images + R2 transforms](./18-responsive-images.md) | **done** | M | perf high |
| 19 | [SEO head + sitemap](./19-seo-head.md) | **done** | S | SEO med |
| 20 | [Font optimization](./20-fonts.md) | **done** | S | perf low |
| 21 | [Arch split (god-module/component)](./21-arch-split.md) | **done** | L | arch high |
| 22 | [Dedupe constants + logic](./22-dedupe-constants.md) | **done** | M | arch med |
| 23 | [Single source of truth](./23-source-of-truth.md) | **done** | M | arch med |
| 24 | [Backend boundary + shared lib](./24-backend-boundary.md) | **done** | M | arch med |
| 25 | [Lint / types / cleanup](./25-lint-types-cleanup.md) | **done** | M | quality high |
| 26 | [Test expansion](./26-test-expansion.md) | **done** | L | quality high |
| 27 | [i18n prep](./27-i18n-prep.md) | **done** | M | quality med |
| 28 | [A11y pass](./28-a11y-pass.md) | **done** | M | a11y med-high |
| 29 | [PWA / offline + cart](./29-pwa-offline.md) | **done** | M | UX med |
| 30 | [Observability + ops](./30-observability-ops.md) | **done** | S | ops med |

Suggested build order: 12 → 11 → 9 → 10 → 8 → 13 → 14 → 15 → 16 → 25 → 21 → 22 → 23 → 24 → 26 → 17 → 18 → 20 → 19 → 28 → 6 → 29 → 27 → 30.

## Explicitly deferred (not in backlog)

Wishlist, product reviews, multi-language / multi-currency, newsletter,
Trustpilot-style widgets — none needed to sell books for cash on delivery.

## Conventions for every task

- Local-first testing per `TESTING.md` (hand-testing by the owner, no Netlify deploys without approval).
- Test data uses `TEST-` prefixes; wiped with `scripts/cleanup-test-data.sql`.
- R2 test uploads go to `covers/_test/` and are deleted after verification.
- No service-role key anywhere — server code verifies admins via anon key + RLS.
