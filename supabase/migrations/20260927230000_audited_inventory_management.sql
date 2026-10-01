-- Inventory movement audit trail, atomic adjustments and order-confirmation stock.
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) on delete set null,
  book_title text not null,
  quantity_delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (reason in ('opening_balance', 'restock', 'correction', 'damaged', 'customer_return', 'other', 'order_confirmed', 'order_cancelled')),
  note text check (note is null or char_length(note) <= 500),
  admin_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  check (quantity_delta <> 0 or reason = 'opening_balance')
);
create index stock_movements_book_created_idx on public.stock_movements (book_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements (created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id) where order_id is not null;
create index stock_movements_admin_created_idx on public.stock_movements (admin_id, created_at desc);
alter table public.stock_movements enable row level security;
create policy "stock_movements_admin_read" on public.stock_movements
  for select to authenticated using ((select public.is_admin()));
revoke all on public.stock_movements from anon, authenticated;
grant select on public.stock_movements to authenticated;

alter table public.orders add column stock_committed_at timestamptz;
alter table public.orders add column stock_released_at timestamptz;
update public.orders set stock_committed_at = created_at where stock_committed_at is null;
update public.orders set stock_released_at = created_at where status = 'cancelled' and stock_released_at is null;

update public.books set is_out_of_stock = (stock_qty <= 0);
create or replace function public.sync_book_out_of_stock()
returns trigger language plpgsql set search_path = public as $$
begin
  new.is_out_of_stock := (new.stock_qty <= 0);
  return new;
end;
$$;
create trigger books_sync_out_of_stock
before insert or update of stock_qty, is_out_of_stock on public.books
for each row execute function public.sync_book_out_of_stock();

revoke update on public.books from anon, authenticated;
grant update (
  title_ar, subtitle_ar, author_ar, publisher_ar, category, price, old_price,
  description_ar, pages, size_ar, binding_ar, paper_ar, edition_ar, isbn,
  cover_image, is_new, is_featured, is_active, show_quantity, updated_at
) on public.books to authenticated;
revoke insert on public.books from anon, authenticated;
grant insert (
  title_ar, subtitle_ar, author_ar, publisher_ar, category, price, old_price,
  description_ar, pages, size_ar, binding_ar, paper_ar, edition_ar, isbn,
  cover_image, is_new, is_featured, is_active, show_quantity, created_at, updated_at
) on public.books to authenticated;

insert into public.stock_movements (book_id, book_title, quantity_delta, balance_after, reason, note)
select id, title_ar, stock_qty, stock_qty, 'opening_balance', 'رصيد افتتاحي عند تفعيل سجل حركة المخزون'
from public.books;

create or replace function public.record_book_opening_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.stock_movements(book_id, book_title, quantity_delta, balance_after, reason, note, admin_id)
  values(new.id, new.title_ar, new.stock_qty, new.stock_qty, 'opening_balance', 'رصيد عند إضافة الكتاب', auth.uid());
  return new;
end;
$$;
revoke all on function public.record_book_opening_balance() from public, anon, authenticated;
create trigger books_record_opening_balance
after insert on public.books
for each row execute function public.record_book_opening_balance();

create or replace function public.admin_adjust_stock(
  p_book_id uuid, p_delta integer, p_target_qty integer, p_reason text, p_note text default null
)
returns public.stock_movements language plpgsql security definer set search_path = public as $$
declare
  v_book public.books%rowtype;
  v_new_qty integer;
  v_movement public.stock_movements%rowtype;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admin required'; end if;
  if p_book_id is null then raise exception 'bad book id'; end if;
  if p_reason not in ('restock', 'correction', 'damaged', 'customer_return', 'other') then raise exception 'bad stock reason'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'note too long'; end if;
  select * into v_book from public.books where id = p_book_id for update;
  if not found then raise exception 'book not found'; end if;
  if p_target_qty is not null and p_reason <> 'correction' then raise exception 'exact count adjustments require correction reason'; end if;
  if p_target_qty is null and p_reason in ('restock', 'customer_return') and p_delta <= 0 then raise exception 'inbound stock reason requires positive quantity'; end if;
  if p_target_qty is null and p_reason = 'damaged' and p_delta >= 0 then raise exception 'damaged stock reason requires negative quantity'; end if;
  if p_target_qty is not null then
    if p_target_qty < 0 or p_target_qty > 1000000 then raise exception 'bad target quantity'; end if;
    v_new_qty := p_target_qty;
  else
    if p_delta is null or p_delta = 0 or p_delta < -1000000 or p_delta > 1000000 then raise exception 'bad quantity change'; end if;
    v_new_qty := v_book.stock_qty + p_delta;
  end if;
  if v_new_qty < 0 or v_new_qty > 1000000 then raise exception 'stock out of range'; end if;
  if v_new_qty = v_book.stock_qty then return null; end if;
  update public.books set stock_qty = v_new_qty, updated_at = now() where id = p_book_id;
  insert into public.stock_movements(book_id, book_title, quantity_delta, balance_after, reason, note, admin_id)
  values(p_book_id, v_book.title_ar, v_new_qty - v_book.stock_qty, v_new_qty, p_reason, nullif(trim(p_note), ''), auth.uid())
  returning * into v_movement;
  return v_movement;
end;
$$;
revoke all on function public.admin_adjust_stock(uuid, integer, integer, text, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, integer, integer, text, text) to authenticated;

create or replace function public.admin_bulk_stock_in(p_items jsonb, p_reason text, p_note text default null)
returns setof public.stock_movements language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_book_id uuid;
  v_qty integer;
  v_book public.books%rowtype;
  v_movement public.stock_movements%rowtype;
  v_count integer;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admin required'; end if;
  if p_reason not in ('restock', 'customer_return') then raise exception 'bad stock reason'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'note too long'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'bad items'; end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 100 then raise exception 'bad item count'; end if;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'book_id' loop
    begin v_book_id := (v_item->>'book_id')::uuid; v_qty := (v_item->>'qty')::integer;
    exception when others then raise exception 'bad item'; end;
    if v_qty is null or v_qty < 1 or v_qty > 1000000 then raise exception 'bad quantity'; end if;
    select * into v_book from public.books where id = v_book_id for update;
    if not found then raise exception 'book not found: %', v_book_id; end if;
    if v_book.stock_qty + v_qty > 1000000 then raise exception 'stock out of range: %', v_book.title_ar; end if;
    update public.books set stock_qty = stock_qty + v_qty, updated_at = now() where id = v_book_id returning * into v_book;
    insert into public.stock_movements(book_id, book_title, quantity_delta, balance_after, reason, note, admin_id)
    values(v_book_id, v_book.title_ar, v_qty, v_book.stock_qty, p_reason, nullif(trim(p_note), ''), auth.uid())
    returning * into v_movement;
    return next v_movement;
  end loop;
  return;
end;
$$;
revoke all on function public.admin_bulk_stock_in(jsonb, text, text) from public, anon;
grant execute on function public.admin_bulk_stock_in(jsonb, text, text) to authenticated;

create or replace function public.create_order(p_name text, p_phone text, p_address text, p_city text, p_notes text, p_items jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_phone_digits text; v_count integer; v_item jsonb; v_book_id uuid; v_qty integer;
  v_price numeric; v_stock integer; v_title text; v_active boolean;
  v_total numeric := 0; v_order_id uuid; v_n integer; v_previous uuid;
begin
  if p_name is null or char_length(p_name) < 3 or char_length(p_name) > 100 then raise exception 'bad name'; end if;
  if p_phone is null or char_length(p_phone) < 9 or char_length(p_phone) > 20 or p_phone !~ '^[0-9+[:space:]-]+$' then raise exception 'bad phone'; end if;
  v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if v_phone_digits !~ '^((212|0)[5-7][0-9]{8})$' then raise exception 'bad phone'; end if;
  if p_address is null or char_length(p_address) < 8 or char_length(p_address) > 500 then raise exception 'bad address'; end if;
  if p_city is not null and p_city <> '' and (char_length(p_city) < 2 or char_length(p_city) > 100) then raise exception 'bad city'; end if;
  if p_notes is not null and char_length(p_notes) > 1000 then raise exception 'bad notes'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'bad items'; end if;
  v_n := jsonb_array_length(p_items);
  if v_n < 1 or v_n > 20 then raise exception 'bad items'; end if;
  select count(*) into v_count from public.orders where phone = p_phone and created_at > now() - interval '1 hour';
  if v_count >= 5 then raise exception 'rate limited'; end if;
  v_previous := null;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'book_id' loop
    begin v_book_id := (v_item->>'book_id')::uuid; v_qty := (v_item->>'qty')::integer;
    exception when others then raise exception 'bad items'; end;
    if v_book_id = v_previous then raise exception 'bad items'; end if;
    v_previous := v_book_id;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'bad qty'; end if;
    select price, stock_qty, title_ar, is_active into v_price, v_stock, v_title, v_active from public.books where id = v_book_id for update;
    if not found then raise exception 'book not found'; end if;
    if not coalesce(v_active, false) then raise exception 'book inactive: %', v_title; end if;
    if coalesce(v_stock, 0) <= 0 then raise exception 'out of stock: %', v_title; end if;
    if v_qty > v_stock then raise exception 'over stock: % asked % have %', v_title, v_qty, v_stock; end if;
    v_total := v_total + coalesce(v_price, 0) * v_qty;
  end loop;
  if v_total <= 0 then raise exception 'bad total'; end if;
  insert into public.orders(customer_name, phone, address, city, notes, total, status)
  values(p_name, p_phone, p_address, nullif(p_city, ''), nullif(p_notes, ''), v_total, 'new') returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_book_id := (v_item->>'book_id')::uuid; v_qty := (v_item->>'qty')::integer;
    select price, title_ar into v_price, v_title from public.books where id = v_book_id;
    insert into public.order_items(order_id, book_id, title_ar, price, quantity) values(v_order_id, v_book_id, v_title, v_price, v_qty);
  end loop;
  return json_build_object('id', v_order_id, 'total', v_total);
end;
$$;
revoke all on function public.create_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb) to anon, authenticated;

create or replace function public.admin_set_order_status(p_order_id uuid, p_status text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype; v_item record; v_book public.books%rowtype; v_new_qty integer;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admin required'; end if;
  if p_status not in ('new', 'contacted', 'delivered', 'cancelled') then raise exception 'bad status'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.status = p_status then return p_status; end if;
  if (v_order.status = 'new' and p_status not in ('contacted', 'cancelled'))
     or (v_order.status = 'contacted' and p_status not in ('delivered', 'cancelled')) then
    raise exception 'invalid status transition: % -> %', v_order.status, p_status;
  end if;
  if v_order.status = 'new' and p_status = 'contacted' and v_order.stock_committed_at is null then
    for v_item in select book_id, title_ar, quantity from public.order_items where order_id = p_order_id order by book_id loop
      if v_item.book_id is null then raise exception 'book missing from order: %', v_item.title_ar; end if;
      select * into v_book from public.books where id = v_item.book_id for update;
      if not found then raise exception 'book missing from order: %', v_item.title_ar; end if;
      if v_book.stock_qty < v_item.quantity then raise exception 'insufficient stock: % available % needed %', v_book.title_ar, v_book.stock_qty, v_item.quantity; end if;
      v_new_qty := v_book.stock_qty - v_item.quantity;
      update public.books set stock_qty = v_new_qty, updated_at = now() where id = v_item.book_id;
      insert into public.stock_movements(book_id, book_title, quantity_delta, balance_after, reason, note, admin_id, order_id)
      values(v_item.book_id, v_book.title_ar, -v_item.quantity, v_new_qty, 'order_confirmed', 'خصم عند تأكيد الطلب هاتفياً', auth.uid(), p_order_id);
    end loop;
    update public.orders set stock_committed_at = now() where id = p_order_id;
  elsif p_status = 'cancelled' and v_order.stock_committed_at is not null and v_order.stock_released_at is null then
    for v_item in select book_id, title_ar, quantity from public.order_items where order_id = p_order_id order by book_id loop
      if v_item.book_id is null then raise exception 'book missing from order: %', v_item.title_ar; end if;
      select * into v_book from public.books where id = v_item.book_id for update;
      if not found then raise exception 'book missing from order: %', v_item.title_ar; end if;
      v_new_qty := v_book.stock_qty + v_item.quantity;
      update public.books set stock_qty = v_new_qty, updated_at = now() where id = v_item.book_id;
      insert into public.stock_movements(book_id, book_title, quantity_delta, balance_after, reason, note, admin_id, order_id)
      values(v_item.book_id, v_book.title_ar, v_item.quantity, v_new_qty, 'order_cancelled', 'إرجاع تلقائي بعد إلغاء الطلب', auth.uid(), p_order_id);
    end loop;
    update public.orders set stock_released_at = now() where id = p_order_id;
  elsif v_order.status = 'new' and p_status = 'cancelled' then
    update public.orders set stock_released_at = now() where id = p_order_id;
  end if;
  update public.orders set status = p_status where id = p_order_id;
  return p_status;
end;
$$;
revoke all on function public.admin_set_order_status(uuid, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated;
do $$ begin
  if to_regprocedure('public.decrement_stock(uuid,integer)') is not null then
    execute 'revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated';
  end if;
end; $$;
revoke update on public.orders from anon, authenticated;
