# 22. Dedupe domain logic + single constants source

- **Status:** **done**
- **Done 2026-09-22:** `lib/constants.js` is the single home (`PASSWORD_MIN`, `CART_MAX_QTY`, `LOW_STOCK_AT`, `R2_PREFIX`, `STORAGE_KEYS`, `ORDER_STATUS`); Dashboard + OrdersAdmin derive status labels/tones from it (labels unified); `isSoldOut()` is the only availability check (Dashboard/BooksAdmin/BookDetail); cart cap + storage keys centralized (values unchanged — no cart wipe); `lib/whatsapp.js` owns all 7 templates (+tests, exact text preserved); `catalog.swapAdjacent` backs both admin reorder and gallery moves (+tests); R2 key regex single-sourced (`R2_KEY_RE` in `_lib/media.mjs`, `R2_PREFIX` client-side); auth header only in `apiClient`; swept all `rel="noreferrer"` → `noopener`.
- **Size:** M
- **Depends on:** 21 (new homes for constants/hooks)
- **Severity:** arch medium

## Goal

One definition per business rule. Today the same rule lives in 2-5 places.

## Findings

- Order status: `Dashboard.jsx:21-26 STATUS_LABEL` vs `OrdersAdmin.jsx:20-25 STATUS+tone`.
- `LOW_STOCK_AT=5` in `Dashboard.jsx:28` + `BooksAdmin.jsx:48` + inline `<=5` in `BookDetail.jsx:175,177`.
- Sold-out: `format.js:30-35 isSoldOut()` correct, but re-implemented in `Dashboard.jsx:43,63`, `BooksAdmin.jsx:115-118,191-192`.
- Auth header `Bearer ${session?.access_token||''}` in `admin.js:47,60`, `BookForm.jsx:331`; R2 key `covers/${Date.now()}-` ×3 variants (upload vs book vs import).
- WhatsApp templates ×5 (`Home.jsx:264`, `Catalog.jsx:148`, `Checkout.jsx:171`, `ThankYou.jsx:58`, `OrdersAdmin.jsx:150`); reorder ×3 (`CatalogData.jsx:36-43`, `BookForm.jsx:193-201`, `catalog.js:19-26 reorderList`); cart cap `99` ×3; storage keys `koutobi_cart_v1` / `koutobi_last_order` scattered; routes/query strings inline; fallbacks `'—'/'ar-MA'/' درهم'` in `format.js`.

## Spec / acceptance criteria

- [ ] `src/lib/constants.js`: `LOW_STOCK_AT`, `ORDER_STATUS->{label,tone}`, `R2_PREFIX`, `CART_MAX_QTY=99`, `STORAGE_KEYS`, `ROUTES`, `IMAGE_*` (already in `images.js:7-9`, import don't duplicate).
- [ ] `src/lib/whatsapp.js`: single `orderMessage()` + `bookMessage()` builders; all 5 call sites use it.
- [ ] `src/lib/catalog.js:reorderList` sole reorder impl; `format.js:isSoldOut` sole availability check; `apiClient` sole auth-header + key-gen.
- [ ] `knip`/`jscpd` in CI to prevent re-duplication; tests for constants consumers.

## Touches

- `src/lib/*`, `src/pages/*`, `src/context/CartContext.jsx`, `src/components/*`.

## Risks / notes

- Pure refactor — no behavior change; snapshot tests guard WhatsApp text.
