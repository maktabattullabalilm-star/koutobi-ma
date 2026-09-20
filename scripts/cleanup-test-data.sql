-- ============================================================
--  koutobi-ma — test data cleanup
--  Paste into Supabase Dashboard → SQL Editor → Run
--  after any local testing session.
--
--  Removes every order whose customer name starts with TEST-.
--  order_items go away automatically (ON DELETE CASCADE).
--  NOTE: auth users cannot be deleted via SQL — remove throwaway
--  test accounts in Dashboard → Authentication → Users.
-- ============================================================

delete from public.orders
where customer_name ilike 'TEST-%';

-- confirm the store is clean (expect 0 unless real orders exist)
select count(*) as remaining_orders from public.orders;
