import { describe, expect, it } from 'vitest';
import { booksGridClass } from './booksGrid';
import { DEFAULT_BOOKS_PER_ROW, parseBooksPerRow } from './siteSettings';

describe('books per row', () => {
  it('parses the supported widths', () => {
    expect(parseBooksPerRow('4')).toBe(4);
    expect(parseBooksPerRow('6')).toBe(6);
    expect(parseBooksPerRow('8')).toBe(8);
    expect(parseBooksPerRow(6)).toBe(6);
  });

  it('falls back to 4 for anything else', () => {
    expect(parseBooksPerRow('5')).toBe(DEFAULT_BOOKS_PER_ROW);
    expect(parseBooksPerRow('')).toBe(4);
    expect(parseBooksPerRow(null)).toBe(4);
    expect(parseBooksPerRow(undefined)).toBe(4);
    expect(parseBooksPerRow('abc')).toBe(4);
    expect(parseBooksPerRow('hide')).toBe(4);
  });

  it('keeps phones at two columns for every setting', () => {
    for (const value of [4, 6, 8]) {
      expect(booksGridClass(value)).toContain('grid-cols-2');
    }
  });

  it('adds the wider desktop columns for 6 and 8', () => {
    expect(booksGridClass(4)).not.toContain('xl:grid-cols-6');
    expect(booksGridClass(6)).toContain('xl:grid-cols-6');
    expect(booksGridClass(8)).toContain('xl:grid-cols-8');
    // 8 also gets the tablet/laptop step-up and a tighter gap
    expect(booksGridClass(8)).toContain('sm:grid-cols-4');
    expect(booksGridClass(8)).toContain('gap-2.5');
  });

  it('treats invalid values as 4', () => {
    expect(booksGridClass('12')).toBe(booksGridClass(4));
    expect(booksGridClass(undefined)).toBe(booksGridClass(4));
  });
});
