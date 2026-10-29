/**
 * Hero slide helpers — pure and unit-tested.
 *
 * A hero section is stored in `storefront_content.home_hero` as
 * `{ slides: [...] }`. Older rows contain the single-hero fields at the top
 * level; `normalizeHeroSlides` upgrades those rows on read so no content is
 * lost. Each slide can feature up to MAX_HERO_BOOKS selected books.
 */

export const MAX_HERO_BOOKS = 9;
export const DEFAULT_HERO_BACKGROUND = '#35724e';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function text(value) {
  if (value == null) return '';
  return String(value);
}

/** Normalize a #rgb/#rrggbb colour, or return null when it is invalid. */
export function validateHexColor(value) {
  const candidate = text(value).trim();
  if (!HEX_COLOR.test(candidate)) return null;
  if (candidate.length === 4) {
    const [, r, g, b] = candidate;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return candidate.toLowerCase();
}

/** Stable-enough id for a newly created slide. */
export function newHeroSlideId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return `hero-${cryptoObj.randomUUID()}`;
  return `hero-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStats(stats, keepEmpty = false) {
  return (Array.isArray(stats) ? stats : [])
    .map((item) => ({ value: text(item?.value), label: text(item?.label) }))
    .filter((item) => keepEmpty || item.value || item.label);
}

function normalizeBookIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    const id = text(raw).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_HERO_BOOKS) break;
  }
  return out;
}

function hasLegacyContent(content) {
  if (!content || typeof content !== 'object') return false;
  return Boolean(
    content.badge ||
    content.title ||
    content.description ||
    content.shop_label ||
    content.how_label ||
    (Array.isArray(content.stats) && content.stats.length > 0)
  );
}

/** Normalize one slide without changing the stored field names. */
export function normalizeHeroSlide(raw, index = 0, options = {}) {
  const slide = raw && typeof raw === 'object' ? raw : {};
  return {
    id: text(slide.id).trim() || `hero-${index + 1}`,
    active: slide.active !== false,
    badge: text(slide.badge),
    title: text(slide.title),
    description: text(slide.description),
    shop_label: text(slide.shop_label),
    how_label: text(slide.how_label),
    stats: normalizeStats(slide.stats, options.keepEmptyStats === true),
    book_ids: normalizeBookIds(slide.book_ids),
    background_color: options.keepInvalidColor
      ? text(slide.background_color) || DEFAULT_HERO_BACKGROUND
      : validateHexColor(slide.background_color) || DEFAULT_HERO_BACKGROUND,
    // Legacy rows have no explicit book selection yet. The storefront shows
    // the newest three books for them, matching the old hero behaviour.
    legacy: slide.legacy === true,
  };
}

/** Turn either a new `{ slides }` row or a legacy single hero into slides. */
export function normalizeHeroSlides(content, options = {}) {
  const source = content && typeof content === 'object' ? content : {};
  if (Array.isArray(source.slides) && source.slides.length > 0) {
    return source.slides.map((slide, index) => normalizeHeroSlide(slide, index, options));
  }
  if (hasLegacyContent(source)) {
    return [normalizeHeroSlide({ ...source, id: source.id || 'hero-legacy', legacy: true }, 0, options)];
  }
  return [];
}

/** Slides that should be visible on the storefront. */
export function visibleHeroSlides(slides = []) {
  return (slides || []).filter(
    (slide) => slide?.active !== false && (text(slide?.title).trim() || text(slide?.badge).trim())
  );
}

/** Resolve selected book ids to real book rows, preserving the admin order. */
export function resolveHeroBooks(slide, books = []) {
  const list = Array.isArray(books) ? books : [];
  const ids = normalizeBookIds(slide?.book_ids);
  if (!ids.length && slide?.legacy) return list.slice(0, 3);
  const byId = new Map(list.map((book) => [book.id, book]));
  return ids
    .map((id) => byId.get(id))
    .filter((book) => book && book.is_active !== false)
    .slice(0, MAX_HERO_BOOKS);
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex) {
  const value = validateHexColor(hex) || DEFAULT_HERO_BACKGROUND;
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

/** True when the background needs dark text. */
export function isLightBackground(color) {
  const { r, g, b } = hexToRgb(color);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.5;
}

/**
 * Per-slide theme. The background is the only editable colour; text, muted
 * copy, stats and badge surfaces are derived so every slide stays readable.
 */
export function heroTheme(slide) {
  const background = validateHexColor(slide?.background_color) || DEFAULT_HERO_BACKGROUND;
  const light = isLightBackground(background);
  return {
    background,
    light,
    text: light ? '#1f2937' : '#ffffff',
    muted: light ? 'rgba(31,41,55,0.78)' : 'rgba(255,255,255,0.85)',
    accent: light ? '#92400e' : '#fcd34d',
    button: '#fbbf24',
    buttonText: '#234b35',
    badgeBg: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)',
    border: light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)',
  };
}

/** Fresh slide for the admin “add slide” action. */
export function emptyHeroSlide() {
  return normalizeHeroSlide({
    id: newHeroSlideId(),
    active: true,
    background_color: DEFAULT_HERO_BACKGROUND,
  });
}

/** Copy a slide while keeping its books, colours and stats. */
export function duplicateHeroSlide(slide) {
  const copy = normalizeHeroSlide({
    ...slide,
    id: newHeroSlideId(),
    title: slide?.title ? `${slide.title} (نسخة)` : '',
    legacy: false,
  });
  return copy;
}

/**
 * Validate the raw content before saving. Normalization fixes invalid values,
 * but the admin should see an explicit error instead of a silent fallback.
 */
export function validateHeroContent(content) {
  const source = content && typeof content === 'object' ? content : {};
  const rawSlides =
    Array.isArray(source.slides) && source.slides.length > 0
      ? source.slides
      : hasLegacyContent(source)
        ? [source]
        : [];
  for (let index = 0; index < rawSlides.length; index += 1) {
    const slide = rawSlides[index] || {};
    if (!text(slide.title).trim() && !text(slide.badge).trim()) {
      return `الشريحة ${index + 1}: أضف عنواناً أو شارة.`;
    }
    const color = text(slide.background_color).trim();
    if (color && !validateHexColor(color)) {
      return `الشريحة ${index + 1}: لون الخلفية غير صالح.`;
    }
    if (Array.isArray(slide.book_ids) && slide.book_ids.length > MAX_HERO_BOOKS) {
      return `الشريحة ${index + 1}: الحد الأقصى ${MAX_HERO_BOOKS} كتب.`;
    }
  }
  return '';
}
