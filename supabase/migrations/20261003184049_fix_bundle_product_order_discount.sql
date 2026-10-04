create or replace function public.create_order_with_offers(p_name text, p_phone text, p_address text, p_city text, p_notes text, p_items jsonb, p_coupon_code text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_base json; v_order_id uuid; v_total numeric; v_bundle_discount numeric := 0; v_coupon_discount numeric := 0;
  v_offer record; v_sets integer; v_base_set numeric; v_coupon public.coupons%rowtype; v_uses integer; v_eligible numeric;
  v_item jsonb; v_bundle public.bundle_offers%rowtype; v_qty integer; v_expanded jsonb := '[]'::jsonb; v_direct_bundle_ids uuid[] := '{}';
begin
  if jsonb_typeof(p_items) <> 'array' then raise exception 'bad items'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 then raise exception 'bad qty'; end if;
    if v_item ? 'book_id' then v_expanded := v_expanded || jsonb_build_array(jsonb_build_object('book_id', v_item->>'book_id', 'qty', v_qty));
    elsif v_item ? 'bundle_id' then
      select * into v_bundle from public.bundle_offers where id = (v_item->>'bundle_id')::uuid for update;
      if not found or not v_bundle.is_active or (v_bundle.starts_at is not null and v_bundle.starts_at > now()) or (v_bundle.ends_at is not null and v_bundle.ends_at <= now()) then raise exception 'bundle unavailable'; end if;
      if not exists (select 1 from public.bundle_offer_books where offer_id = v_bundle.id) then raise exception 'bundle unavailable'; end if;
      select v_expanded || coalesce(jsonb_agg(jsonb_build_object('book_id', bob.book_id, 'qty', v_qty)), '[]'::jsonb) into v_expanded from public.bundle_offer_books bob where bob.offer_id = v_bundle.id;
      v_direct_bundle_ids := array_append(v_direct_bundle_ids, v_bundle.id);
    else raise exception 'bad items'; end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('book_id', book_id, 'qty', qty)), '[]'::jsonb) into v_expanded from (select (item->>'book_id')::uuid as book_id, sum((item->>'qty')::integer)::integer as qty from jsonb_array_elements(v_expanded) item group by 1) grouped;
  v_base := public.create_order(p_name, p_phone, p_address, p_city, p_notes, v_expanded);
  v_order_id := (v_base->>'id')::uuid; v_total := (v_base->>'total')::numeric;
  for v_offer in select bo.*, x.qty, array_agg(bob.book_id) as book_ids from jsonb_to_recordset(p_items) as x(bundle_id uuid, qty integer) join public.bundle_offers bo on bo.id = x.bundle_id join public.bundle_offer_books bob on bob.offer_id = bo.id group by bo.id, x.qty loop
    select sum(b.price) into v_base_set from public.books b where b.id = any(v_offer.book_ids);
    v_bundle_discount := v_bundle_discount + greatest(v_base_set - v_offer.bundle_price, 0) * v_offer.qty;
    insert into public.order_bundle_items(order_id, bundle_id, title_ar, price, quantity) values(v_order_id, v_offer.id, v_offer.name_ar, v_offer.bundle_price, v_offer.qty);
  end loop;
  if cardinality(v_direct_bundle_ids) = 0 then
    for v_offer in select bo.id, bo.bundle_price, array_agg(bob.book_id) as book_ids from public.bundle_offers bo join public.bundle_offer_books bob on bob.offer_id = bo.id where bo.is_active and (bo.starts_at is null or bo.starts_at <= now()) and (bo.ends_at is null or bo.ends_at > now()) group by bo.id loop
      select min(oi.quantity), sum(oi.price) into v_sets, v_base_set from public.order_items oi where oi.order_id = v_order_id and oi.book_id = any(v_offer.book_ids);
      if (select count(*) from public.order_items oi where oi.order_id = v_order_id and oi.book_id = any(v_offer.book_ids)) = array_length(v_offer.book_ids, 1) and v_sets > 0 and v_base_set > v_offer.bundle_price then v_bundle_discount := v_bundle_discount + (v_base_set - v_offer.bundle_price) * v_sets; end if;
    end loop;
  end if;
  if p_coupon_code is not null then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code)) for update;
    if not found or not v_coupon.is_active or (v_coupon.starts_at is not null and v_coupon.starts_at > now()) or (v_coupon.ends_at is not null and v_coupon.ends_at <= now()) then raise exception 'invalid coupon'; end if;
    select count(*) into v_uses from public.coupon_redemptions where coupon_id = v_coupon.id;
    if v_coupon.max_uses is not null and v_uses >= v_coupon.max_uses then raise exception 'coupon exhausted'; end if;
    select count(*) into v_uses from public.coupon_redemptions where coupon_id = v_coupon.id and phone = p_phone;
    if v_coupon.max_uses_per_phone is not null and v_uses >= v_coupon.max_uses_per_phone then raise exception 'coupon phone limit'; end if;
    v_eligible := v_total - v_bundle_discount;
    if v_eligible < v_coupon.minimum_subtotal then raise exception 'coupon minimum'; end if;
    if v_coupon.discount_type = 'percent' then v_coupon_discount := round(v_eligible * v_coupon.discount_value / 100, 2); else v_coupon_discount := v_coupon.discount_value; end if;
    if v_coupon.max_discount is not null then v_coupon_discount := least(v_coupon_discount, v_coupon.max_discount); end if;
    v_coupon_discount := least(v_coupon_discount, v_eligible);
    insert into public.coupon_redemptions(coupon_id, order_id, phone, discount_total) values(v_coupon.id, v_order_id, p_phone, v_coupon_discount);
  end if;
  update public.orders set bundle_discount_total = v_bundle_discount, discount_total = v_coupon_discount, coupon_code = case when p_coupon_code is null then null else upper(trim(p_coupon_code)) end, total = v_total - v_bundle_discount - v_coupon_discount where id = v_order_id;
  return json_build_object('id', v_order_id, 'total', v_total - v_bundle_discount - v_coupon_discount, 'bundle_discount_total', v_bundle_discount, 'discount_total', v_coupon_discount);
end; $$;

revoke all on function public.create_order_with_offers(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_order_with_offers(text, text, text, text, text, jsonb, text) to anon, authenticated;
