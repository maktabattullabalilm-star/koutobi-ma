# 9. Harden `decrement_stock` RPC (anon abuse fix)

- **Status:** **done**
- **Size:** S
- **Depends on:** 11 (versioned alongside missing RPCs)
- **Severity:** high (H2)

## Goal

`decrement_stock(p_book_id, p_qty)` becomes auditable, validated, and abuse-resistant. Today it is anon-callable but its definition is missing from `supabase/schema.sql` (only callers in `src/lib/api.js:163-167`, `src/lib/admin.js:262-266`).

## Spec / acceptance criteria

- [ ] Version RPC in `supabase/migrations/`:
  ```sql
  create or replace function public.decrement_stock(p_book_id uuid, p_qty int)
  returns void language plpgsql security definer set search_path = public as $$
  begin
    if p_qty is null or p_qty < 1 or p_qty > 99 then raise exception 'bad qty'; end if;
    update public.books set stock_qty = greatest(0, stock_qty - p_qty)
    where id = p_book_id;
  end $$;
  revoke all on function public.decrement_stock(uuid,int) from public;
  grant execute on function public.decrement_stock(uuid,int) to anon, authenticated;
  ```
- [ ] Uses row lock (`SELECT ... FOR UPDATE` or atomic `UPDATE ... WHERE`) — no oversell race.
- [ ] Negative `p_qty` can never inflate stock (covered by guard + `GREATEST`).
- [ ] After 08 lands, `decrement_stock` called only inside `create_order()` transaction — remove direct frontend calls; keep RPC for admin manual adjust with auth check.
- [ ] Test: loop `rpc(p_qty:999)` rejected, `p_qty:-5` rejected, concurrent decrements never go negative.

## Touches

- `supabase/` migration (sole source of truth).
- `src/lib/api.js:163-171`, `src/lib/admin.js:262-266` (remove direct calls post-08).

## Risks / notes

- If current prod RPC lacks guards, it is exploitable today — deploy this before or with 08.
