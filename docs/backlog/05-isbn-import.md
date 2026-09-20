# 5. Import book by ISBN

- **Status:** **done**
- **Size:** S–M
- **Depends on:** image system v2 (imported covers flow through it);
  pairs naturally with the sifatusafwa importer review screen.

## Goal

Enter an ISBN → metadata lookup prefills the form (title, author,
publisher, pages, cover) → admin reviews/edits → creates the book.
Cover downloaded to our R2, never hotlinked.

## Spec / acceptance criteria

- [x] ISBN input (10/13 digits, hyphens/spaces tolerated, checksum
  validated client-side) with lookup button in BookForm.
- [x] New endpoint `POST /api/import-isbn` `{ isbn }` (admin JWT + RLS
  check): lookup chain **Open Library → Google Books**, first hit wins.
- [x] Cover (when present) downloaded to R2 under `covers/imported-*`.
- [x] Same mandatory review screen as the sifatusafwa importer
  (shared component); price is never imported (MAD pricing is ours).

## Touches

- `netlify/functions/import-isbn.mjs`.
- `BookForm.jsx` (ISBN panel, shared review/prefill logic with item 4).
- Tests: lookup-chain unit tests with mocked fetch (hit, miss, fallback).

## Known limit (stated upfront, not hidden)

Arabic titles are **frequently absent** from both Open Library and Google
Books. The UX must degrade gracefully: "not found → continue manually
with ISBN kept", not a dead end. The sifatusafwa importer (item 4) is the
primary path for Arabic editions; ISBN is the secondary path.
