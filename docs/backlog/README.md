# Backlog — koutobi-ma

Planned work, one file per task. Status legend: `planned` → `in_progress` → `done`.

## Build order (dependency-aware)

| # | Task file | Status | Size |
|---|-----------|--------|------|
| 1 | [Image system v2](./01-image-system-v2.md) | planned | L |
| 2 | [Editable categories & attributes](./02-categories-attributes.md) | planned | M |
| 3 | [Stock basics + quantity visibility](./03-stock-quantity.md) | planned | M |
| 4 | [Import from sifatusafwa URL](./04-sifatusafwa-import.md) | planned | M |
| 5 | [Import by ISBN](./05-isbn-import.md) | planned | S–M |
| 6 | [Full responsiveness pass](./06-responsiveness.md) | planned | M |
| 7 | [Admin TOTP two-factor](./07-totp-2fa.md) | planned | M |

## Explicitly deferred (not in backlog)

Wishlist, product reviews, multi-language / multi-currency, newsletter,
Trustpilot-style widgets — none needed to sell books for cash on delivery.

## Conventions for every task

- Local-first testing per `TESTING.md` (hand-testing by the owner, no Netlify deploys without approval).
- Test data uses `TEST-` prefixes; wiped with `scripts/cleanup-test-data.sql`.
- R2 test uploads go to `covers/_test/` and are deleted after verification.
- No service-role key anywhere — server code verifies admins via anon key + RLS.
