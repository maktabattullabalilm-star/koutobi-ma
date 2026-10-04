alter table public.bundle_offers
  add column cover_image text,
  add column description_ar text,
  add column is_featured boolean not null default false;

create index bundle_offers_storefront_idx
  on public.bundle_offers (is_featured desc, created_at desc)
  where is_active;
