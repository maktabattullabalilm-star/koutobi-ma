import { describe, expect, it } from 'vitest';
import {
  coverSrcSet,
  extractImageFiles,
  fitDimensions,
  isDeletableR2Key,
  IMAGE_MAX_COUNT,
  IMAGE_MAX_KB,
} from './images';

describe('fitDimensions', () => {
  it('never upscales small images', () => {
    expect(fitDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest side down to maxDim', () => {
    expect(fitDimensions(3200, 2400)).toEqual({ width: 1600, height: 1200 });
    expect(fitDimensions(1000, 3000)).toEqual({ width: 533, height: 1600 });
  });

  it('respects a custom maxDim', () => {
    expect(fitDimensions(1000, 500, 200)).toEqual({ width: 200, height: 100 });
  });

  it('returns zeros for invalid input', () => {
    expect(fitDimensions(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitDimensions(-5, 100)).toEqual({ width: 0, height: 0 });
    expect(fitDimensions(NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('isDeletableR2Key', () => {
  it('accepts keys we create under covers/', () => {
    expect(isDeletableR2Key('covers/1690000000-cover.jpg')).toBe(true);
    expect(isDeletableR2Key('covers/hisn.webp')).toBe(true);
    expect(isDeletableR2Key('covers/imported-abc_123.PNG')).toBe(true);
  });

  it('rejects traversal, subfolders and other prefixes', () => {
    expect(isDeletableR2Key('covers/../secret.jpg')).toBe(false);
    expect(isDeletableR2Key('covers/sub/x.jpg')).toBe(false);
    expect(isDeletableR2Key('other/x.jpg')).toBe(false);
    expect(isDeletableR2Key('https://x.r2.dev/covers/x.jpg')).toBe(false);
    expect(isDeletableR2Key('')).toBe(false);
    expect(isDeletableR2Key(null)).toBe(false);
    expect(isDeletableR2Key(undefined)).toBe(false);
  });

  it('keeps the gallery limits as specced', () => {
    expect(IMAGE_MAX_COUNT).toBe(5);
    expect(IMAGE_MAX_KB).toBe(180);
  });
});

describe('extractImageFiles', () => {
  const file = (type) => ({ kind: 'file', type, getAsFile: () => ({ name: 'x', type }) });
  it('keeps image files, drops everything else', () => {
    const items = [
      file('image/jpeg'),
      file('image/png'),
      file('text/plain'),
      { kind: 'string', type: 'text/plain' },
      { kind: 'file', type: 'image/webp', getAsFile: () => null },
      null,
    ];
    const out = extractImageFiles(items);
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe('image/jpeg');
  });

  it('returns [] for empty/missing lists', () => {
    expect(extractImageFiles([])).toEqual([]);
    expect(extractImageFiles(null)).toEqual([]);
    expect(extractImageFiles(undefined)).toEqual([]);
  });
});

describe('coverSrcSet (docs/backlog/18)', () => {
  it('returns undefined without a CDN (single-file R2 origin)', () => {
    expect(coverSrcSet('https://pub-xxx.r2.dev/covers/a.webp')).toBeUndefined();
    expect(coverSrcSet('')).toBeUndefined();
  });
});
