-- ============================================================
--  كُتُبِي.ما — Supabase schema
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- Books ----------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  subtitle_ar text,
  author_ar text,
  publisher_ar text,
  category text,
  price numeric(10,2) not null default 0,
  old_price numeric(10,2),
  description_ar text,
  pages integer,
  size_ar text,
  binding_ar text,
  paper_ar text,
  edition_ar text,
  isbn text,
  cover_image text,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_out_of_stock boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Orders (Cash on Delivery leads) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  city text,
  address text not null,
  notes text,
  total numeric(10,2) not null default 0,
  status text not null default 'new', -- new | contacted | delivered | cancelled
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  title_ar text,
  price numeric(10,2),
  quantity integer not null default 1
);

-- ---------- Profiles (auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user', -- user | admin
  created_at timestamptz not null default now()
);

-- ---------- Helper: is the current user an admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Auto-create a profile row on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.books enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

-- Books: anyone reads active books; only admins write.
drop policy if exists "books_public_read" on public.books;
create policy "books_public_read"
  on public.books for select
  using (is_active = true);

drop policy if exists "books_admin_write" on public.books;
create policy "books_admin_write"
  on public.books for all
  using (public.is_admin())
  with check (public.is_admin());

-- Orders: anyone can place one (no login for customers).
--  Only admins can read / update them.
drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert"
  on public.orders for insert
  with check (true);

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "order_items_public_insert" on public.order_items;
create policy "order_items_public_insert"
  on public.order_items for insert
  with check (true);

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Profiles: a user can read their own profile; admins read everyone.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- ============================================================
--  Grant default privileges to authenticated + anon roles
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.order_items to anon, authenticated;
grant select on public.profiles to authenticated;

-- ============================================================
--  IMPORTANT (one-time, manual):
--  After creating your admin account in the dashboard, promote it:
--    update public.profiles set role = 'admin' where email = 'you@email.com';
-- ============================================================