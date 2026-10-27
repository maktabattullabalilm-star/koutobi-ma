import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  coverSrcSet,
  extractImageFiles,
  fitDimensions,
  isDeletableR2Key,
  resizeImageToLimit,
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

describe('resizeImageToLimit', () => {
  const jpegBlob = () => new Blob([new Uint8Array(2 * 1024)], { type: 'image/jpeg' });
  const file = (type = 'image/jpeg') => new File([new Uint8Array(16)], `x.${type.split('/')[1]}`, { type });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      cb(jpegBlob());
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('decodes via createImageBitmap, so no object URL / CSP img-src is involved', async () => {
    const drawImage = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ fillStyle: '', fillRect: vi.fn(), drawImage }));
    const bitmap = { width: 800, height: 600, close: vi.fn() };
    const decode = vi.fn().mockResolvedValue(bitmap);
    vi.stubGlobal('createImageBitmap', decode);

    const out = await resizeImageToLimit(file());

    expect(decode).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 800, 600);
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(out).toMatchObject({ contentType: 'image/jpeg', ext: 'jpg' });
    expect(out.blob.size).toBeLessThanOrEqual(IMAGE_MAX_KB * 1024);
  });

  it('falls back to <img> when createImageBitmap is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    class FakeImage {
      naturalWidth = 1000;
      naturalHeight = 500;
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const out = await resizeImageToLimit(file());

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(out.ext).toBe('jpg');
  });

  it('still reports a genuinely undecodable file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
    class BrokenImage {
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('Image', BrokenImage);

    await expect(resizeImageToLimit(file())).rejects.toThrow('ملف الصورة غير صالح');
  });

  it('rejects non-image files before touching the decoder', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);

    await expect(resizeImageToLimit(file('application/pdf'))).rejects.toThrow('اختر ملف صورة صالحاً');
    expect(decode).not.toHaveBeenCalled();
  });
});

describe('coverSrcSet (backlog 18)', () => {
  it('returns undefined without a CDN (single-file R2 origin)', () => {
    expect(coverSrcSet('https://pub-xxx.r2.dev/covers/a.webp')).toBeUndefined();
    expect(coverSrcSet('')).toBeUndefined();
  });
});
