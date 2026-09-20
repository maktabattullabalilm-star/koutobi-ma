# 6. Full responsiveness pass (mobile + all devices)

- **Status:** planned
- **Size:** M
- **Depends on:** image system v2 + stock badges (new UI must be responsive too)

## Goal

Verified usable layout at **360 / 768 / 1024 / 1440px** on storefront and
admin: no horizontal scroll, tappable controls, readable tables.

## Spec / acceptance criteria

- [ ] Audit checklist executed per breakpoint with real screenshots
  (added to `TESTING.md` when done):
  Home, Catalog, BookDetail (+ gallery), Cart, Checkout, ThankYou,
  AdminLogin/Setup, Dashboard, BooksAdmin, BookForm, OrdersAdmin.
- [ ] Touch targets ≥ 44px on all interactive elements (mobile).
- [ ] Admin tables (BooksAdmin, OrdersAdmin) collapse to **cards** below
  `md` — these are the worst offenders today.
- [ ] Sticky mobile affordances verified: header, cart badge, WhatsApp
  float (no overlap with checkout CTA).
- [ ] Forms usable with mobile keyboards (correct `inputmode`/`type`,
  no zoom-on-focus iOS issues — min 16px font on inputs).
- [ ] RTL verified at every breakpoint (no mirrored-layout regressions).

## Touches

- CSS/Tailwind only — **no schema changes**.
- Likely files: `BooksAdmin.jsx`, `OrdersAdmin.jsx`, `BookDetail.jsx`,
  `Checkout.jsx`, `Header.jsx`, `index.css` utilities.

## Notes

- Owner hand-tests on a real phone per `TESTING.md`; screenshots attached
  to the completion report.
- New UI from items 1–3 is built responsive-first so this pass is
  verification + fixes, not a rewrite.
