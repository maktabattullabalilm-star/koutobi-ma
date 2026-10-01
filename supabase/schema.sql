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
  stock_qty integer not null default 0 check (stock_qty >= 0),
  show_quantity text not null default 'inherit'
    check (show_quantity in ('show', 'hide', 'inherit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Orders (Cash on Delivery leads) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 3 and 100),
  phone text not null check (char_length(phone) between 9 and 20),
  city text check (city is null or char_length(city) between 2 and 100),
  address text not null check (char_length(address) between 8 and 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'new', -- new | contacted | delivered | cancelled
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  title_ar text,
  price numeric(10,2) check (price is null or price >= 0),
  quantity integer not null default 1 check (quantity between 1 and 99)
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
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Helpers are for RLS/triggers, NOT direct RPC: keep them uncallable by anon/authenticated.
revoke all on function public.is_admin() from anon, authenticated;
revoke all on function public.handle_new_user() from anon, authenticated;
-- is_admin() is a boolean policy helper referenced by admin-write RLS policies.
-- It reveals no profile data, so callers need EXECUTE for those policies to run.
grant execute on function public.is_admin() to anon, authenticated;

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

-- ============================================================
--  Migration 2026-09: book_images (multi-image gallery, backlog 01)
--  Applied live via migration; kept here for fresh installs.
-- ============================================================
create table if not exists public.book_images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  url text not null,
  r2_key text,
  position int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists book_images_book_id_idx on public.book_images (book_id, position);

alter table public.book_images enable row level security;

drop policy if exists "book_images_public_read" on public.book_images;
create policy "book_images_public_read"
  on public.book_images for select
  using (exists (
    select 1 from public.books b
    where b.id = book_images.book_id and b.is_active = true
  ));

drop policy if exists "book_images_admin_write" on public.book_images;
create policy "book_images_admin_write"
  on public.book_images for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.book_images to anon, authenticated;

-- ============================================================
--  Backlog 02/03/07: categories, attribute_options, app_settings,
--  claim_first_admin, decrement_stock — versioned here so the repo
--  is the single source of truth (live DB already has them).
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  slug text unique, -- ASCII canonical slug (backlog 27); name_ar stays display truth
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  type text not null,            -- binding | size | paper | ...
  value_ar text not null,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (type, value_ar)
);
create index if not exists attribute_options_type_idx
  on public.attribute_options (type, sort);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.attribute_options enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "attribute_options_public_read" on public.attribute_options;
create policy "attribute_options_public_read" on public.attribute_options for select using (true);
drop policy if exists "attribute_options_admin_write" on public.attribute_options;
create policy "attribute_options_admin_write" on public.attribute_options for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read" on public.app_settings for select using (true);
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.categories, public.attribute_options, public.app_settings
  to anon, authenticated;

-- Canonical names used by the book form suggestions. Books retain text values
-- so existing catalogue records and storefront reads remain uncomplicated.
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 160),
  normalized_name text not null unique check (char_length(normalized_name) between 2 and 160),
  created_at timestamptz not null default now()
);
create table if not exists public.publishers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 160),
  normalized_name text not null unique check (char_length(normalized_name) between 2 and 160),
  created_at timestamptz not null default now()
);
alter table public.authors enable row level security;
alter table public.publishers enable row level security;
drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read" on public.authors for select to anon, authenticated using (true);
drop policy if exists "authors_admin_write" on public.authors;
create policy "authors_admin_write" on public.authors for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "publishers_public_read" on public.publishers;
create policy "publishers_public_read" on public.publishers for select to anon, authenticated using (true);
drop policy if exists "publishers_admin_write" on public.publishers;
create policy "publishers_admin_write" on public.publishers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.authors, public.publishers to anon, authenticated;
grant insert, update, delete on public.authors, public.publishers to authenticated;

-- Store contact numbers (editable from Admin → Settings, public read).
-- `phone_number` drives tel: links + display; `whatsapp_number` drives wa.me links.
insert into public.app_settings (key, value) values
  ('phone_number', '212624182004'),
  ('whatsapp_number', '212624182004')
on conflict (key) do nothing;

-- Owner-editable visible storefront sections. Each row is a stable UI section
-- whose copy lives in `content`; `visible` lets the admin hide it safely.
create table if not exists public.storefront_content (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  content jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.storefront_content enable row level security;
drop policy if exists "storefront_content_public_read" on public.storefront_content;
create policy "storefront_content_public_read" on public.storefront_content
  for select to anon, authenticated using (true);
drop policy if exists "storefront_content_admin_write" on public.storefront_content;
create policy "storefront_content_admin_write" on public.storefront_content for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.storefront_content to anon, authenticated;

-- Markdown content pages (shipping, returns, FAQ, about, privacy, sale terms).
create table if not exists public.store_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  meta_description text not null default '' check (char_length(meta_description) <= 300),
  content_markdown text not null default '',
  is_visible boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_pages_visible_slug_idx
  on public.store_pages (slug) where is_visible;
alter table public.store_pages enable row level security;
drop policy if exists "store_pages_public_read_visible" on public.store_pages;
create policy "store_pages_public_read_visible" on public.store_pages
  for select to anon, authenticated using (is_visible or (select public.is_admin()));
drop policy if exists "store_pages_admin_insert" on public.store_pages;
create policy "store_pages_admin_insert" on public.store_pages
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "store_pages_admin_update" on public.store_pages;
create policy "store_pages_admin_update" on public.store_pages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "store_pages_admin_delete" on public.store_pages;
create policy "store_pages_admin_delete" on public.store_pages
  for delete to authenticated using ((select public.is_admin()));
grant select on public.store_pages to anon, authenticated;
grant insert, update, delete on public.store_pages to authenticated;

insert into public.store_pages (slug, title, meta_description, content_markdown, is_visible, is_system) values
  ('shipping-information', 'معلومات الشحن', 'معلومات الشحن والتوصيل من مكتبة كُتُبِي.ما.', E'## معلومات الشحن والتوصيل\n\nنوصل الكتب إلى جميع المدن المغربية. بعد إرسال طلبك، يتواصل معك فريقنا هاتفياً لتأكيد الكتب والعنوان والتأكد من توفرها قبل تجهيز الشحنة.\n\nتختلف مدة التوصيل بحسب المدينة وتوفر الكتب. نوضح لك المدة المتوقعة وتكلفة التوصيل عند التواصل لتأكيد الطلب، حتى تعرف التفاصيل قبل إرسال الشحنة.\n\nالدفع نقداً عند الاستلام؛ لا تحتاج إلى بطاقة بنكية لإتمام طلبك. يرجى التأكد من إدخال رقم هاتف صحيح وعنوان واضح مع اسم المدينة، فذلك يساعدنا على تأكيد الطلب وتسهيل وصوله إليك.\n\nإذا رغبت في الاستفسار عن طلبك أو تحديث بيانات التوصيل، تواصل معنا عبر واتساب من أزرار الموقع، واذكر اسم صاحب الطلب أو رقمه إن توفر.', false, true),
  ('returns-refunds', 'الإرجاع واسترداد الأموال', 'سياسة الإرجاع واسترداد الأموال لمتجر كُتُبِي.ما.', E'## الإرجاع واسترداد الأموال\n\nنحرص على أن يصلك الكتاب الذي طلبته بحالة جيدة. إذا وصلك كتاب مختلف عن طلبك أو لاحظت تلفاً عند الاستلام، يرجى التواصل معنا في أقرب وقت عبر واتساب أو الهاتف قبل استخدام الكتاب.\n\nلتسريع المراجعة، أرسل رقم الطلب أو اسم صاحبه، واسم الكتاب، ووصفاً واضحاً للمشكلة. ويمكنك إرفاق صور للكتاب والغلاف والتغليف إذا كان ذلك يساعد على توضيح الحالة.\n\nيراجع فريقنا تفاصيل كل حالة ويتواصل معك لتوضيح الإجراء المناسب قبل إعادة أي منتج. لا ترسل كتاباً إلينا قبل التواصل والحصول على تعليمات الإرجاع، حتى نتمكن من إرشادك إلى الخطوة الصحيحة.\n\nتتم معالجة أي استرداد، عند استحقاقه، بعد الاتفاق معك على الحل المناسب ومراجعة حالة الطلب. وبما أن الدفع يتم نقداً عند الاستلام، سيشرح لك فريقنا طريقة التسوية المناسبة لحالتك.', false, true),
  ('faq', 'الأسئلة الشائعة', 'إجابات عن الأسئلة الشائعة حول الطلب والشحن والدفع.', E'## الأسئلة الشائعة\n\n### كيف أطلب كتاباً؟\n\nافتح صفحة الكتاب واضغط «أضف للسلة»، ثم انتقل إلى إتمام الطلب وأدخل اسمك ورقم هاتفك وعنوان التوصيل. يمكنك أيضاً مراسلتنا عبر واتساب للاستفسار عن كتاب أو طلب المساعدة في إتمام الطلب.\n\n### هل أحتاج إلى بطاقة بنكية؟\n\nلا. الدفع نقداً عند استلام الطلب، ولا تحتاج إلى بطاقة بنكية لإرسال طلبك.\n\n### هل توصلون إلى مدينتي؟\n\nالتوصيل متاح لجميع المدن المغربية. نتواصل معك هاتفياً لتأكيد عنوانك وإبلاغك بتكلفة التوصيل والمدة المتوقعة بحسب مدينتك وتوفر الكتب.\n\n### متى يتم تأكيد طلبي؟\n\nبعد إرسال الطلب، يتواصل معك فريقنا هاتفياً لمراجعته وتأكيد الكتب والعنوان وتفاصيل التوصيل. يرجى إبقاء هاتفك متاحاً والرد على مكالمتنا حتى نتمكن من متابعة الطلب.\n\n### كيف أستفسر عن كتاب أو أتابع طلبي؟\n\nاستخدم زر واتساب الظاهر في الموقع، واكتب اسم الكتاب أو رقم الطلب إن توفر. سنساعدك في معرفة التفاصيل ومتابعة طلبك.', false, true),
  ('about-us', 'من نحن', 'تعرّف على مكتبة كُتُبِي.ما.', E'## من نحن\n\nكُتُبِي.ما مكتبة إسلامية متخصصة في الكتب العربية، تجمع عناوين نافعة في مجالات العلم والمعرفة الشرعية، وتقرّبها إلى القراء في مختلف مدن المغرب.\n\nنؤمن أن الكتاب الجيد رفيق في التعلم والعمل، لذلك نعمل على تقديم عناوين واضحة المعلومات مع تفاصيل تساعد القارئ على اختيار ما يناسبه، مثل اسم المؤلف والناشر وبيانات الطبعة عند توفرها.\n\nنجعل تجربة الشراء بسيطة: اختر كتبك من المتجر، أرسل بيانات التوصيل، وسنتواصل معك لتأكيد الطلب. نوصل إلى جميع المدن المغربية، والدفع نقداً عند الاستلام.\n\nيسعدنا استقبال أسئلتكم حول الكتب وتوفرها. تواصلوا معنا عبر واتساب، وسنساعدكم في الوصول إلى الكتاب الذي تبحثون عنه.', false, true),
  ('privacy-policy', 'سياسة الخصوصية', 'سياسة الخصوصية وحماية البيانات في متجر كُتُبِي.ما.', E'## سياسة الخصوصية\n\nنحترم خصوصية زوار كُتُبِي.ما، ونجمع المعلومات التي تدخلها عند إرسال طلب، مثل الاسم ورقم الهاتف والمدينة والعنوان وملاحظات التوصيل، إضافة إلى الكتب والكميات المطلوبة.\n\nنستخدم هذه البيانات للتواصل معك بشأن طلبك، وتأكيد تفاصيله وعنوانه، وترتيب توصيله والإجابة عن استفساراتك المتعلقة به. يرجى إدخال معلومات صحيحة ومشاركة البيانات اللازمة لإتمام الطلب فقط.\n\nلا يطلب المتجر بيانات بطاقة بنكية؛ الدفع نقداً عند الاستلام. وقد تُعرض على المتصفح بيانات تقنية لازمة لتشغيل الموقع وحفظ تجربة التسوق، مثل محتويات السلة.\n\nللاستفسار عن بياناتك أو طلب تصحيح معلومات التواصل المرتبطة بطلبك، راسلنا عبر واتساب واذكر اسم صاحب الطلب أو رقمه إن توفر. سنراجع طلبك ونوضح ما يمكن اتخاذه وفق متطلبات معالجة الطلب.', false, true),
  ('terms-of-sale', 'شروط البيع', 'شروط وأحكام البيع والطلب من مكتبة كُتُبِي.ما.', E'## شروط البيع\n\nيمكنك إرسال طلبك من خلال المتجر باختيار الكتب وإدخال بيانات التواصل والتوصيل. بعد الإرسال، يتواصل معك فريقنا هاتفياً لتأكيد محتويات الطلب وتوفر الكتب وصحة العنوان قبل تجهيز الشحنة.\n\nتظهر أسعار الكتب في صفحاتها، ويُتفق معك على تكلفة التوصيل والمدة المتوقعة عند تأكيد الطلب، بحسب المدينة وتوفر الكتب. إذا لم نتمكن من تأكيد التفاصيل معك، فقد يتأخر تجهيز الطلب إلى أن نتواصل بشأنه.\n\nالدفع نقداً عند استلام الطلب. لا تُطلب منك بيانات بطاقة بنكية لإتمام عملية الشراء. يرجى التأكد من أن رقم هاتفك وعنوانك صحيحان، وإبلاغنا سريعاً إذا احتجت إلى تعديل الطلب قبل تجهيزه.\n\nإذا وصلتك كتب غير مطابقة لما تم تأكيده أو لاحظت مشكلة في حالة أحدها، تواصل معنا قبل استخدامه. سنراجع الحالة ونوضح لك الإجراء المناسب وفق سياسة الإرجاع والاسترداد.', false, true)
on conflict (slug) do nothing;

-- One-time admin claim (hashed token, single-use, admin-count guard).
-- See live migration history for the canonical body; revoked from anon
-- direct misuse via auth.uid() check inside the function.
-- decrement_stock() canonical hardened body lives in docs/backlog/09;
-- applied live via migration (qty-validated, SECURITY DEFINER, anon+authenticated EXECUTE).
