create table public.bundle_offers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 160),
  bundle_price numeric(10,2) not null check (bundle_price > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create table public.bundle_offer_books (
  offer_id uuid not null references public.bundle_offers(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  primary key (offer_id, book_id)
);
create index bundle_offer_books_book_id_idx on public.bundle_offer_books(book_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,32}$'),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  minimum_subtotal numeric(10,2) not null default 0 check (minimum_subtotal >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  max_uses_per_phone integer check (max_uses_per_phone is null or max_uses_per_phone > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  stack_with_offers boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((discount_type <> 'percent' or discount_value <= 100) and (ends_at is null or starts_at is null or ends_at > starts_at))
);
create table public.coupon_books (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  primary key (coupon_id, book_id)
);
create table public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category text not null,
  primary key (coupon_id, category)
);
create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  phone text not null,
  discount_total numeric(10,2) not null check (discount_total > 0),
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_phone_idx on public.coupon_redemptions(coupon_id, phone);

alter table public.orders add column discount_total numeric(10,2) not null default 0 check (discount_total >= 0);
alter table public.orders add column coupon_code text;
alter table public.orders add column bundle_discount_total numeric(10,2) not null default 0 check (bundle_discount_total >= 0);

alter table public.bundle_offers enable row level security;
alter table public.bundle_offer_books enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_books enable row level security;
alter table public.coupon_categories enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "bundle_offers_public_read" on public.bundle_offers for select to anon, authenticated using (true);
create policy "bundle_offer_books_public_read" on public.bundle_offer_books for select to anon, authenticated using (true);
create policy "offers_admin_write" on public.bundle_offers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "offer_books_admin_write" on public.bundle_offer_books for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "coupons_admin_all" on public.coupons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "coupon_books_admin_all" on public.coupon_books for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "coupon_categories_admin_all" on public.coupon_categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "coupon_redemptions_admin_read" on public.coupon_redemptions for select to authenticated using ((select public.is_admin()));
grant select on public.bundle_offers, public.bundle_offer_books to anon, authenticated;
grant select, insert, update, delete on public.bundle_offers, public.bundle_offer_books, public.coupons, public.coupon_books, public.coupon_categories to authenticated;
grant select on public.coupon_redemptions to authenticated;
