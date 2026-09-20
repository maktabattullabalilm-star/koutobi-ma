# 1. Image system v2 — multi-image, client resize, R2 delete, better UX

- **Status:** **done**
- **Size:** L
- **Depends on:** nothing (build first)

## Goal

Each book holds up to **5 images**. Uploads are resized **in the browser**
to **≤ 180 KB** before leaving the machine, keeping visual quality.
The form shows every image with its URL, and deleting an image anywhere
also deletes it from R2 — no orphaned files, no wasted space.

## Spec / acceptance criteria

- [x] BookForm cover section rebuilt as a thumbnail grid (max 5 slots):
  drag-to-reorder, per-image delete button, primary-image picker
  (primary = storefront card + detail main image).
- [x] Every thumbnail shows its full R2 URL with click-to-copy.
- [x] Client-side resize before upload: max dimension 1600px, JPEG quality
  step-down 0.90 → 0.60 until ≤ 180 KB (floor 0.60, then accept whatever
  size results); original format preserved when sensible (JPEG/PNG/WebP).
- [x] Upload still goes through `POST /api/upload-image` (admin JWT + RLS
  check unchanged); function accepts the pre-resized file as today.
- [x] New endpoint `DELETE /api/delete-image` `{ key }`: verifies admin
  (same RLS check), rejects any key not starting with `covers/`,
  deletes the R2 object, returns ok.
- [x] Removing an image in the form calls the delete endpoint.
- [x] Deleting a book deletes **all** its R2 images first, then the row.
- [x] Replacing the primary cover deletes the old object (no orphans).
- [x] Storefront: detail page gallery with thumbnails; cards keep using
  the primary image.
- [x] Old single `cover_image` column: migrated — primary image URL is
  mirrored into `cover_image` so existing queries keep working.

## Schema

```sql
create table public.book_images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  url text not null,
  r2_key text not null,          -- e.g. covers/169...-cover.jpg
  position int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
-- RLS: public read; admin write (same is_admin() pattern as books).
```

## Touches

- `supabase/` migration (table + RLS + backfill `book_images` from
  existing `cover_image` rows, marked primary).
- `netlify/functions/upload-image.mjs` (document size contract),
  new `netlify/functions/delete-image.mjs`.
- `src/pages/admin/BookForm.jsx` (gallery editor + `lib/resizeImage.js`).
- `src/pages/BookDetail.jsx` (gallery), `ProductCard.jsx` (unchanged —
  still reads primary/`cover_image`).
- `src/lib/admin.js` (image CRUD helpers).

## Risks / notes

- Orphan sweep procedure documented: list R2 keys under `covers/`
  vs `r2_key` values in DB; anything unreferenced gets deleted manually.
- Animated GIF/WebP edge cases: resize converts to static frame —
  acceptable, documented in the form hint.
