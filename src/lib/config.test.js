import { describe, expect, it } from 'vitest';
import { DELETE_IMAGE_ENDPOINT, UPLOAD_ENDPOINT, whatsappLink } from './config';

describe('config endpoints', () => {
  it('points at the /api function paths', () => {
    expect(UPLOAD_ENDPOINT).toBe('/api/upload-image');
    expect(DELETE_IMAGE_ENDPOINT).toBe('/api/delete-image');
  });
});

describe('whatsappLink', () => {
  it('returns null when no store number is configured', () => {
    expect(whatsappLink()).toBeNull();
    expect(whatsappLink('السلام عليكم')).toBeNull();
  });

  it('builds a wa.me link from an explicit DB number', () => {
    expect(whatsappLink('', '212600000000')).toBe('https://wa.me/212600000000');
    const link = whatsappLink('السلام عليكم', '212600000000');
    expect(link.startsWith('https://wa.me/212600000000?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('السلام عليكم');
  });
});
