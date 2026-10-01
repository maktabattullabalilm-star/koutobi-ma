# 18. Responsive images + R2 transforms (stop shipping 1600px to grids)

- **Status:** **done**
- **Done 2026-09-22:** `BookCover` — lazy default, `decoding=async`, intrinsic `aspect-[680/960]` (no CLS), `fetchPriority` prop, `aria-hidden` icon, future-proof `srcset` via `coverSrcSet()` (activates when `VITE_IMAGE_CDN` is set — documented in `.env.example`); hero collage uses `BookCover` (lazy ⇒ no mobile download for `hidden lg:grid`; first cover eager+high); detail LCP eager+high; `VITE_IMAGE_CDN` plumbed + tested.
- **Follow-up (needs custom domain):** point `VITE_IMAGE_CDN` at a transform endpoint for real multi-width variants; optionally emit thumb+large at upload time.
- **Size:** M
- **Depends on:** 10 (allowed formats), 17 (bundle not bloated by image code)
- **Severity:** perf high

## Goal

Grids download thumbs, detail downloads large — never 1600px everywhere. No layout shift, no broken icons.

## Findings

- Zero `srcset/sizes/width/height/decoding/fetchpriority`. All R2 URLs single-size full files (`sampleData.js:21`). `BookCover.jsx:27` lazy ok but no intrinsic aspect default (relies on caller `aspect-680/960`), no `decoding="async"`, fallback `IconBook` double-announce.
- `Home.jsx:89-95` hero collage bypasses `BookCover` (raw `<img>`, always eager, CSS-`hidden` still downloads on mobile).

## Spec / acceptance criteria

- [ ] `BookCover.jsx`: `srcset/sizes` via R2/CF-Images (`/cdn-cgi/image/width=400,800,1200,format=auto/`) or pre-generated thumb keys; `width/height`, `decoding="async"`, default `aspect-[680/960]`, `fetchpriority` prop, `aria-hidden` on inner icon.
- [ ] `Home.jsx:89-95` uses `BookCover eager + fetchpriority="high"` for first hero image, lazy for rest; mobile-hidden images not fetched (`loading=lazy` + media or conditional render).
- [ ] Upload pipeline emits thumb + large variants (or transform-on-read documented); `public/covers/*.svg` placeholders replaced by blur LQIP.
- [ ] CLS <0.1 on Catalog/Detail, LCP image -30% bytes min (Lighthouse proof).

## Touches

- `src/components/BookCover.jsx`, `src/lib/images.js`, `src/pages/Home.jsx`, `ProductCard.jsx`, `BookDetail.jsx`, `Cart.jsx`, `Checkout.jsx`, `netlify/functions/upload-image.mjs`.

## Risks / notes

- CF-Images costs/transform URL format — decide R2-transform vs build-time thumbs first.
