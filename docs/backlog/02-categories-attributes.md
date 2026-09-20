# 2. Editable categories & attributes

- **Status:** planned
- **Size:** M
- **Depends on:** nothing (after image system v2 by build order)

## Goal

The admin can create, rename, reorder, and delete **categories** and
attribute lists (**التجليد**, **المقاس**, **الورق**, extensible to new
types). BookForm dropdowns load from the database — no more hardcoded
arrays in code.

## Spec / acceptance criteria

- [ ] New admin page (under `/admin`, e.g. `/admin/catalog-data`) with two
  managers: categories list + attribute lists grouped by type.
- [ ] Categories: name_ar (unique), sort order, book count shown,
  delete blocked (or reassign prompt) when books still use it.
- [ ] Attribute types ship seeded with current values:
  التجليد (فني/عادي)، المقاس (17×24، 14×20، 12×17، 24×17 سم)،
  الورق (شامواه/أبيض). New types addable (e.g. اللغة).
- [ ] BookForm category/binding/size/paper selects read from DB with
  loading fallback to today's hardcoded values if the fetch fails.
- [ ] Storefront category chips/nav read from the same source
  (cached, fallback to `config.js` list on error).
- [ ] Deleting a category in use: admin must pick a replacement category
  for affected books first (no silent orphans).

## Schema

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  sort int not null default 0
);
create table public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  type text not null,            -- binding | size | paper | ...
  value_ar text not null,
  sort int not null default 0,
  unique (type, value_ar)
);
-- RLS: public read; admin write. Seed with the 6 categories + current values.
```

> Deliberate: `books.category` stays a **text** column matched by name —
> avoids a risky FK backfill migration. Integrity is enforced in the admin
> UI (dropdowns + rename propagation + guarded delete).

## Touches

- `supabase/` migration (tables + RLS + seed).
- New `src/pages/admin/CatalogData.jsx` + route + sidebar link.
- `src/pages/admin/BookForm.jsx` (DB-driven selects).
- `src/components/Header.jsx`, `Footer.jsx`, `Home.jsx` (categories from DB).
- `src/lib/admin.js` (category/attribute CRUD helpers).
- Tests: fallback behavior when fetch fails.
