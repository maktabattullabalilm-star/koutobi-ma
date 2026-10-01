# 11. Supabase schema + RLS single source of truth

- **Status:** **done**
- **Size:** L
- **Depends on:** nothing (blocks 08, 09)
- **Severity:** high (H4)

## Goal

`supabase/` becomes the complete, deployable contract. No table/policy/RPC referenced by code may live only in dashboard or docs.

## Findings

- `supabase/schema.sql:1-187` monolith, missing vs code: `categories`, `attribute_options`, `app_settings` (+ policies `public read; admin write` claimed in `docs/backlog/02-categories-attributes.md:43-55` but no SQL), `books.stock_qty/show_quantity` (`BookForm.jsx:60-61`, `api.js:114`), `decrement_stock()`, `claim_first_admin(p_user_id,p_token)` (`AdminSetup.jsx:60-67`).
- `book_images_public_read using(true):177-179` leaks galleries for `is_active=false` books (`api.js:17-35` fetches by `book_id` without active check).

## Spec / acceptance criteria

- [ ] One migration per object, all versioned: `categories`, `attribute_options`, `app_settings` tables + `public read / admin write` RLS via `is_admin()`; `books.stock_qty int default 0 CHECK >=0`, `books.show_quantity bool default false`; `decrement_stock()`; `claim_first_admin()` (one-time, hashed token, 24h expiry, audit row).
- [ ] Fix `book_images` read: join `books WHERE is_active=true` or replace policy with view `public_book_images`; hidden-book images not enumerable by UUID.
- [ ] Split `schema.sql` monolith into `supabase/migrations/*.sql` + `seed.sql` kept; `sampleData.js` generated or removed (see 23).
- [ ] `supabase_list_tables verbose` + advisors clean (no RLS-disabled, no overly-permissive `using(true)` except intentional public reads).
- [ ] Docs: ER diagram + RLS matrix (table × anon/authenticated/admin × select/insert/update/delete).

## Touches

- `supabase/` only (+ docs). No frontend logic change except `book_images` query if view renamed.

## Risks / notes

- Must diff prod DB before applying — dashboard drift may exist. `supabase db diff` first.
