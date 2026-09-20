# 3. Stock basics + quantity visibility

- **Status:** **done**
- **Size:** M
- **Depends on:** nothing structural (build after catalog data)

## Goal

The admin manages real stock from the dashboard: quantity per book,
low-stock warnings, automatic out-of-stock flagging — plus control over
whether customers see quantities (per product, with a global default).

## Spec / acceptance criteria

- [x] `stock_qty` integer per book (default 0), editable in BookForm and
  quick-adjusted (+/−) from BooksAdmin rows.
- [x] Placing an order decrements stock (COD lead counts as reserved);
  admin can correct manually from OrdersAdmin.
- [x] `stock_qty = 0` automatically implies out-of-stock on the storefront
  (replaces/augments the manual `is_out_of_stock` checkbox).
- [x] Low-stock badge in admin (≤ 5) + dashboard "needs restock" hint.
- [x] Per-book `show_quantity` toggle: `show` | `hide` | `inherit`.
- [x] Global default in `app_settings` (`show_quantity_default` =
  `show`|`hide`), editable from the dashboard quick-actions area.
- [x] Storefront rules: `show` → exact count ("المتبقي: 3");
  effectively out → "نفدت الكمية"; `hide`/default-hide → today's
  behavior (in-stock with no count, or "كمية محدودة" عندما ≤ 5 —
  decided at build time with owner).
- [x] Checkout refuses quantities exceeding stock (clamp + message).

## Schema

```sql
alter table public.books add column stock_qty int not null default 0;
alter table public.books add column show_quantity text not null default 'inherit'
  check (show_quantity in ('show','hide','inherit'));
insert into public.app_settings (key, value) values
  ('show_quantity_default', 'hide')
on conflict (key) do nothing;
```

## Touches

- `supabase/` migration.
- `BookForm.jsx` (stock field + visibility select), `BooksAdmin.jsx`
  (qty stepper, low-stock badge), `OrdersAdmin.jsx` (manual adjust).
- `Dashboard.jsx` (restock hint + global default control).
- `ProductCard.jsx`, `BookDetail.jsx`, `Cart.jsx`/`Checkout.jsx`
  (visibility rules + stock clamp).
- `api.js createOrder` (decrement via RPC or read-modify-write;
  prefer a `SECURITY DEFINER decrement_stock()` to avoid race + RLS issues).
- Tests: clamp behavior, decrement math, visibility matrix.

## Open point (decided at build)

Auto-decrement on order placement (default yes, it's a reservation)
vs only on admin confirmation — default to decrement-on-order with
manual correction available.
