-- Canonical author and publisher directories for book form suggestions.
create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 160),
  normalized_name text not null unique check (char_length(normalized_name) between 2 and 160),
  created_at timestamptz not null default now()
);

create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 160),
  normalized_name text not null unique check (char_length(normalized_name) between 2 and 160),
  created_at timestamptz not null default now()
);

alter table public.authors enable row level security;
alter table public.publishers enable row level security;

create policy "authors_public_read" on public.authors for select to anon, authenticated using (true);
create policy "authors_admin_write" on public.authors for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "publishers_public_read" on public.publishers for select to anon, authenticated using (true);
create policy "publishers_admin_write" on public.publishers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.authors, public.publishers to anon, authenticated;
grant insert, update, delete on public.authors, public.publishers to authenticated;

-- Strip honorifics from the existing catalog before seeding its canonical directory.
update public.books
set author_ar = case author_ar
  when 'الإمام أحمد بن علي الرازي الجصاص' then 'أحمد بن علي الرازي الجصاص'
  when 'الإمام ابن قيم الجوزية' then 'ابن قيم الجوزية'
  when 'الشيخ صالح بن فوزان الفوزان' then 'صالح بن فوزان الفوزان'
  when 'الشيخ عبد الرحمن بن ناصر السعدي' then 'عبد الرحمن بن ناصر السعدي'
  else author_ar
end
where author_ar in ('الإمام أحمد بن علي الرازي الجصاص', 'الإمام ابن قيم الجوزية', 'الشيخ صالح بن فوزان الفوزان', 'الشيخ عبد الرحمن بن ناصر السعدي');

insert into public.authors (name_ar, normalized_name) values
  ('ابن الفرس الأندلسي', 'ابن الفرس الاندلسي'),
  ('ابن رجب الحنبلي', 'ابن رجب الحنبلي'),
  ('أحمد بن علي الرازي الجصاص', 'احمد بن علي الرازي الجصاص'),
  ('ابن قيم الجوزية', 'ابن قيم الجوزيه'),
  ('صالح بن فوزان الفوزان', 'صالح بن فوزان الفوزان'),
  ('عبد الرحمن بن ناصر السعدي', 'عبد الرحمن بن ناصر السعدي'),
  ('سعيد بن علي القحطاني', 'سعيد بن علي القحطاني'),
  ('مالك بن أنس', 'مالك بن انس'),
  ('يوسف بن عبد الله بن عبد البر', 'يوسف بن عبد الله بن عبد البر')
on conflict (normalized_name) do nothing;

insert into public.publishers (name_ar, normalized_name) values
  ('الرسالة ناشرون', 'الرساله ناشرون'),
  ('دار ابن حزم', 'دار ابن حزم'),
  ('مكتبة كُتُبِي', 'مكتبه كتبي'),
  ('دار ابن الجوزي', 'دار ابن الجوزي'),
  ('دار المعارف', 'دار المعارف'),
  ('عطاءات العلم', 'عطاءات العلم')
on conflict (normalized_name) do nothing;
