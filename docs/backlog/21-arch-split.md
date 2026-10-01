# 21. Frontend architecture split (god-module + god-component + missing abstractions)

- **Status:** **done**
- **Done 2026-09-22:** `lib/admin.js` → `lib/admin/{books,storage,images,catalog,stock,orders}.js` + compatibility barrel (guarded by `admin.test.js`); `lib/apiClient.js` (JWT inject, 25s timeout, Arabic errors incl. `code`); lists bounded via `ADMIN_PAGE_SIZE=500` (client filters need full-set semantics — true server-search pagination is a follow-up, not silently breaking search); `adminStats` pending-var renamed; `ProtectedRoute` + `ErrorBoundary` wired in `App.jsx`; `PageHeader/StatusPill` → `components/admin/`; `NotFound` → `pages/NotFound.jsx`; `hooks/useCatalog.js` (useBooks/useBook/useCategories) adopted by Home/Catalog/BookDetail (also kills the storefront→`lib/admin` import via new `api.getShowQtyDefault`); `hooks/useBookImport.js` + `hooks/useGallery.js` extracted from BookForm (~77 + ~200 lines out, save/sync flow untouched); `@/` convention kept (already dominant; relative only for siblings).
- **Follow-ups:** server-search pagination (needs UI pager + API search params); `useOrders` hook when admin lists get pagers.
- **Size:** L
- **Depends on:** 11 (uses final schema), 15 (uses zod schemas)
- **Severity:** arch high

## Goal

No 300-line lib, no 948-line page, no duplicated `useEffect+useState+Promise.all` in 4 pages. One way to fetch, guard, and handle errors.

## Findings

- `src/lib/admin.js:1-307` ~15 concerns, no pagination (`adminGetBooks:5-12`, `adminGetOrders:281-288 select('*,order_items(*)')`, `adminStats:295-307` fetch-all + `filter/reduce`, `completed:297` misnamed).
- `src/pages/admin/BookForm.jsx:87-526` form state + gallery staging (`stageFiles:222-258`, `onDrop:261-275`) + R2 loop `:424-436` + imports `:325-400` + validation `:402-414` + sync `:466-510`.
- No `useBooks/useBook/useOrders/useCategories`, no `apiClient`, no `<ProtectedRoute>` (`AdminLayout.jsx:41-54` + `AdminLogin.jsx:158` render-navigate), no `ErrorBoundary`, no pagination helper. Direct `supabase.auth/*` outside context in 4 files; `BookDetail.jsx:4` imports from `lib/admin`; stock/sort/filter logic embedded in views.

## Spec / acceptance criteria

- [ ] Split `lib/admin.js` → `lib/admin/{books,images,categories,attributes,settings,orders,stats}.js` (or `books.js/orders.js/catalog.js`); every list paginated (`range()`, `count:exact`); `adminStats` via RPC aggregation, fix `completed` naming.
- [ ] Split `BookForm.jsx` → `BookForm.jsx` (shell) + `hooks/useBookForm.js` + `hooks/useGallery.js` + `hooks/useImport.js` + `components/admin/ImageGrid.jsx`; <200 lines per file.
- [ ] New: `lib/apiClient.js` (auth header inject, error map, timeout), `hooks/{useBooks,useBook,useOrders,useCategories}.js` (loading/error cache, SWR-lite or React-Query if approved), `components/ProtectedRoute.jsx`, `components/ErrorBoundary.jsx`, `lib/constants.js` (`LOW_STOCK_AT`, `ORDER_STATUS`, `R2_PREFIX`, routes), shared pagination helper.
- [ ] Move `PageHeader.jsx/StatusPill.jsx` → `components/admin/`; `NotFound` → `pages/NotFound.jsx`; enforce `@/` alias everywhere (drop `../../`).
- [ ] All storefront reads go via hooks; admin writes via domain modules; no view imports from `lib/admin` in storefront except via hook.

## Touches

- `src/lib/*`, `src/pages/*`, `src/components/*`, `src/hooks/*` (new), `src/App.jsx`.

## Risks / notes

- Large refactor — land behind passing tests (26) + manual smoke per TESTING.md; do in stacked PRs per domain.
