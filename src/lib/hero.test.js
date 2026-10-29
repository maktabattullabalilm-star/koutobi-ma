import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HERO_BACKGROUND,
  MAX_HERO_BOOKS,
  duplicateHeroSlide,
  emptyHeroSlide,
  heroTheme,
  isLightBackground,
  normalizeHeroSlide,
  normalizeHeroSlides,
  resolveHeroBooks,
  validateHexColor,
  validateHeroContent,
  visibleHeroSlides,
} from './hero';

const BOOKS = Array.from({ length: 12 }, (_, index) => ({
  id: `book-${index + 1}`,
  title_ar: `كتاب ${index + 1}`,
  is_active: true,
}));

describe('hero colour helpers', () => {
  it('accepts and expands valid hex colours', () => {
    expect(validateHexColor('#35724e')).toBe('#35724e');
    expect(validateHexColor('#ABC')).toBe('#aabbcc');
    expect(validateHexColor(' #ffffff ')).toBe('#ffffff');
  });

  it('rejects invalid colours', () => {
    expect(validateHexColor('green')).toBeNull();
    expect(validateHexColor('#12345')).toBeNull();
    expect(validateHexColor('')).toBeNull();
  });

  it('derives readable text for dark and light backgrounds', () => {
    const dark = heroTheme({ background_color: '#234b35' });
    expect(dark.light).toBe(false);
    expect(dark.text).toBe('#ffffff');

    const light = heroTheme({ background_color: '#fef3c7' });
    expect(light.light).toBe(true);
    expect(light.text).toBe('#1f2937');
    expect(isLightBackground('#fef3c7')).toBe(true);
  });

  it('falls back to the default background', () => {
    expect(heroTheme({ background_color: 'nope' }).background).toBe(DEFAULT_HERO_BACKGROUND);
  });
});

describe('normalizeHeroSlides', () => {
  it('upgrades a legacy single hero into slide 1 without losing copy', () => {
    const slides = normalizeHeroSlides({
      badge: 'شارة',
      title: 'عنوان\nثانٍ',
      description: 'وصف',
      shop_label: 'تسوق',
      how_label: 'كيف أطلب',
      stats: [{ value: '+2000', label: 'عميل' }],
    });

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      id: 'hero-legacy',
      badge: 'شارة',
      title: 'عنوان\nثانٍ',
      description: 'وصف',
      shop_label: 'تسوق',
      how_label: 'كيف أطلب',
      stats: [{ value: '+2000', label: 'عميل' }],
      legacy: true,
      book_ids: [],
      background_color: DEFAULT_HERO_BACKGROUND,
      active: true,
    });
  });

  it('returns an empty list for empty content', () => {
    expect(normalizeHeroSlides({ slides: [] })).toEqual([]);
    expect(normalizeHeroSlides(null)).toEqual([]);
  });

  it('keeps new slides in order and normalizes their fields', () => {
    const slides = normalizeHeroSlides({
      slides: [
        { id: 'a', title: 'أ', active: false, background_color: '#ABC' },
        {
          id: 'b',
          badge: 'ب',
          stats: [
            { value: '', label: '' },
            { value: '3', label: '' },
          ],
        },
      ],
    });

    expect(slides.map((slide) => slide.id)).toEqual(['a', 'b']);
    expect(slides[0].active).toBe(false);
    expect(slides[0].background_color).toBe('#aabbcc');
    expect(slides[1].stats).toEqual([{ value: '3', label: '' }]);
  });

  it('deduplicates book ids and clamps to the maximum', () => {
    const slide = normalizeHeroSlide({
      title: 'شريحة',
      book_ids: ['a', 'a', '', 'b', ...BOOKS.map((book) => book.id)],
    });

    expect(slide.book_ids).toHaveLength(MAX_HERO_BOOKS);
    expect(slide.book_ids.slice(0, 2)).toEqual(['a', 'b']);
    expect(new Set(slide.book_ids).size).toBe(slide.book_ids.length);
  });
});

describe('visibleHeroSlides', () => {
  it('drops hidden and empty slides', () => {
    const slides = [
      { id: 'a', title: 'ظاهرة', active: true },
      { id: 'b', title: 'مخفية', active: false },
      { id: 'c', title: '  ', badge: '', active: true },
      { id: 'd', badge: 'شارة', active: true },
    ];

    expect(visibleHeroSlides(slides).map((slide) => slide.id)).toEqual(['a', 'd']);
  });
});

describe('resolveHeroBooks', () => {
  it('preserves the admin order and skips missing or unpublished books', () => {
    const books = [
      { id: 'one', title_ar: '1', is_active: true },
      { id: 'two', title_ar: '2', is_active: false },
      { id: 'three', title_ar: '3', is_active: true },
    ];
    const resolved = resolveHeroBooks({ book_ids: ['three', 'two', 'gone', 'one'] }, books);
    expect(resolved.map((book) => book.id)).toEqual(['three', 'one']);
  });

  it('shows the newest three books for an unsaved legacy hero', () => {
    const resolved = resolveHeroBooks({ legacy: true, book_ids: [] }, BOOKS);
    expect(resolved.map((book) => book.id)).toEqual(['book-1', 'book-2', 'book-3']);
  });

  it('returns nothing for a new slide with no selection', () => {
    expect(resolveHeroBooks({ legacy: false, book_ids: [] }, BOOKS)).toEqual([]);
  });
});

describe('hero slide lifecycle helpers', () => {
  it('creates an empty active slide with a unique id', () => {
    const first = emptyHeroSlide();
    const second = emptyHeroSlide();
    expect(first.active).toBe(true);
    expect(first.id).not.toBe(second.id);
    expect(first.background_color).toBe(DEFAULT_HERO_BACKGROUND);
  });

  it('duplicates a slide with a new id and its books', () => {
    const copy = duplicateHeroSlide({
      id: 'original',
      title: 'عنوان',
      book_ids: ['a', 'b'],
      stats: [{ value: '1', label: 'واحد' }],
    });
    expect(copy.id).not.toBe('original');
    expect(copy.title).toBe('عنوان (نسخة)');
    expect(copy.book_ids).toEqual(['a', 'b']);
    expect(copy.stats).toEqual([{ value: '1', label: 'واحد' }]);
  });
});

describe('validateHeroContent', () => {
  it('requires a title or badge for every slide', () => {
    expect(validateHeroContent({ slides: [{ title: 'عنوان' }] })).toBe('');
    expect(validateHeroContent({ slides: [{ badge: 'شارة' }] })).toBe('');
    expect(validateHeroContent({ slides: [{ title: '' }] })).toContain('أضف عنواناً');
  });

  it('rejects invalid colours and more than nine books', () => {
    expect(validateHeroContent({ slides: [{ title: 'أ', background_color: 'red' }] })).toContain(
      'لون الخلفية غير صالح'
    );
    expect(
      validateHeroContent({
        slides: [{ title: 'أ', book_ids: Array.from({ length: 10 }, (_, i) => `b${i}`) }],
      })
    ).toContain('الحد الأقصى');
  });

  it('validates legacy content before it has been converted to slides', () => {
    expect(validateHeroContent({ title: 'قديم', background_color: '#123456' })).toBe('');
  });
});
