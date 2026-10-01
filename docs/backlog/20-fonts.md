# 20. Font loading optimization (Arabic subsets)

- **Status:** **done**
- **Done 2026-09-22:** audited usage (`font-bold ×103`, `medium ×24`, `semibold ×37`, zero `font-light`) — dropped Plex 300 + Amiri 400 (all display uses are bold). 7 → 5 weights, one blocking stylesheet kept (preconnects retained).
- **Follow-up:** self-host via `@fontsource` for subset control + immutable caching (needs build + Netlify header work; marginal vs current savings).
- **Size:** S
- **Depends on:** 17
- **Severity:** perf low-medium

## Goal

Arabic text paints fast without 7-weight Google blocking.

## Findings

- `index.html:11-14` single blocking CSS: `IBM+Plex+Sans+Arabic 300;400;500;600;700 + Amiri 400;700`, `display=swap` but no `preload`, no `media=print` trick. `Amiri` loads even when unused; `index.css:23-26` fallback good.

## Spec / acceptance criteria

- [ ] Keep only `400;600;700` Plex + `700` Amiri (audit usage first); `preload` 600 (CTA/price LCP); self-host via `@fontsource/ibm-plex-sans-arabic` + Netlify `immutable` (or Google subset `text=` for display face).
- [ ] `font-display:swap` in CSS, no render-blocking chain; verify LCP text -200ms.

## Touches

- `index.html`, `src/index.css`, `package.json` if fontsource.

## Risks / notes

- Self-host increases bundle control but needs subset maintenance — document.
