# 2. Editable categories & attributes

- **Status:** **done**
- **Size:** M
- **Depends on:** nothing (after image system v2 by build order)

## Goal

The admin can create, rename, reorder, and delete **categories** and
attribute lists (**التجليد**, **المقاس**, **الورق**, extensible to new
types). BookForm dropdowns load from the database — no more hardcoded
arrays in code.

## Spec / acceptance criteria

- [x] New admin page (under `/admin`, e.g. `/admin/catalog-data`) with two
  managers: categories list + attribute lists grouped by type.
- [x] Categories: name_ar (unique), book count shown per row,
  delete blocked (or reassign prompt) when books still use it.
- [x] Attribute types ship seeded with current values:
  التجليد (فني/عادي)، المقاس (17×24، 14×20، 12×17، 24×17 سم)،
  الورق (شامواه/أبيض).
- [ ] New attribute *types* addable (e.g. اللغة) — NOT built; needs an
  Arabic-label registry for types. Honestly deferred, not done.
- [x] BookForm category/binding/size/paper selects read from DB with
  loading fallback to today's hardcoded values if the fetch fails.
- [x] Storefront category chips/nav read from the same source
  (cached, fallback to `config.js` list on error).
- [x] Deleting a category in use: admin must pick a replacement category
  for affected books first (no silent orphans).

## Librarian-task rework (added after first pass)

- Sort-number fields removed everywhere — new items append last, ↑↓
  buttons reorder. No librarian should ever type a sort order.
- Every row shows usage ("مستعمل في N كتب" / "غير مستعملة").
- Rename propagates to `books` text columns with a count confirmation.
- Page renamed to "التصنيفات والخيارات" (a librarian knows what that is).

## Sub-categories & per-type visibility (2026-10-25)

- [x] Categories support **unlimited depth** via `categories.parent_id`
  (self-parent check + `(parent_id, sort)` index). The admin page adds
  sub-categories, renames/moves them, and reorders each sibling group.
- [x] **Drag and drop** on the admin page: drop a category on another to make
  it a child, or on the root box to lift it back to the first level. Moves
  stay local (with an amber „غير محفوظ” marker) until «حفظ التغييرات» is
  pressed; «إلغاء» discards them. Cycle-creating drops are rejected.
- [x] Deleting a category **moves its direct children up** to the deleted
  category's parent before deleting, atomically through
  `admin_delete_category(uuid)` (admin-only, `security definer`). No subtree
  is orphaned or lost, and books are never touched.
- [x] Storefront: Home shows root categories only and caps the grid at **two
  rows**; Catalog adds a breadcrumb, direct-child chips, and filters by the
  whole selected subtree; Header shows a **hover dropdown** per root category
  (recursive sub-category list with counts); Footer renders the tree.
- [x] Admin book/stock category filters show indented DFS labels and match
  the selected subtree.
- [x] Edition specs (التجليد / المقاس / الورق) each have a **show/hide switch**
  stored per type in `app_settings.hidden_edition_specs` (JSON array). A
  hidden spec disappears **only from the public book page**; the admin book
  form still shows all three fields.

## Schema

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  parent_id uuid references public.categories(id) on delete restrict,
  sort int not null default 0,
  constraint categories_parent_not_self check (parent_id is null or parent_id <> id)
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
