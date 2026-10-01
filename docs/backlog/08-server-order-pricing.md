# 8. Server-side order pricing + anti-spam (price fraud fix)

- **Status:** **done**
- **Size:** L
- **Depends on:** 11 (schema/RLS completeness — CHECK constraints + RPC live there)
- **Severity:** critical (H1)

## Goal

Order `total`, `price`, `quantity` must never be trusted from the browser. Price is re-read from `books.price` server-side, stock re-checked atomically, spam rate-limited.

## Findings

- `src/lib/api.js:139` computes `total` from cart `it.price` (itself from `localStorage koutobi_cart_v1` — `CartContext.jsx:9,18`, `Checkout.jsx:48`).
- RLS `supabase/schema.sql:116-136` is `WITH CHECK (true)` on `orders` + `order_items` — direct `insert({total:0})` succeeds.
- `stockById` re-check `api.js:112-123` fails open (`catch → null`, `if(!snap) return it`).
- No `CHECK (total>0)`, no qty bounds, no captcha/rate-limit.

## Spec / acceptance criteria

- [ ] New `SECURITY DEFINER create_order(...)` RPC (single transaction):
  - args: `p_name, p_phone, p_address, p_city, p_notes, p_items jsonb [{book_id, qty}]`.
  - validates: `qty int 1..99`, name/phone/address lengths, phone E.164-MA pattern.
  - re-reads `books(id, price, stock_qty, is_active)` with `FOR UPDATE`, rejects inactive / out-of-stock / over-qty (returns `adjusted[]` like today).
  - computes `total` server-side, inserts `orders` + `order_items`, decrements stock, returns `{id, total, adjusted}`.
  - `REVOKE ALL ...; GRANT EXECUTE TO anon, authenticated`, `SET search_path=public`, validates `p_qty`.
- [ ] Revoke direct anon `INSERT` on `orders/order_items` (or keep insert but add `CHECK` + trigger re-price; preferred: RPC-only, RLS `WITH CHECK (false)` for anon direct).
- [ ] Add DB `CHECK`s: `total > 0`, `quantity BETWEEN 1 AND 99`, `price >= 0`, name/phone/address max lengths.
- [ ] Rate-limit: pgcrypto bucket per IP/phone (e.g. max 5 orders/hour) + Turnstile on `Checkout.jsx` (fail-closed server verify in RPC edge or Netlify function wrapper).
- [ ] Frontend `src/lib/api.js:createOrder` switched to `rpc('create_order')`; `localStorage` price never sent (only `id+qty`); error mapping preserved in Arabic.
- [ ] Tests: tampered-price (0 / negative), over-stock qty, inactive book, spam burst — all rejected server-side.

## Touches

- `supabase/` migration (RPC + CHECKs + RLS tightening + rate-limit table).
- `src/lib/api.js:102-174`, `src/pages/Checkout.jsx:26-66`, `src/context/CartContext.jsx`.
- New `src/lib/orders.test.js` + RPC integration test (service-role in CI only).

## Risks / notes

- Breaking: guests can no longer insert orders directly — intended. Old clients break until redeployed together.
- COD must keep flowing on stock-read failure — RPC fails closed on stock, open only on non-critical paths; document.
