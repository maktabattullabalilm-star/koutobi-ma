import { describe, expect, it } from 'vitest';
import { PHONE_DISPLAY, STORE_NAME, WHATSAPP_NUMBER, FALLBACK_CATEGORIES } from './site';
import { DELETE_IMAGE_ENDPOINT, UPLOAD_ENDPOINT, whatsappLink } from './config';

describe('site identity (docs/backlog/23)', () => {
  it('exposes the real WhatsApp number (no placeholder)', () => {
    expect(WHATSAPP_NUMBER).toBe('212624182004');
    expect(WHATSAPP_NUMBER).not.toContain('000000');
  });

  it('has a display phone number and store name', () => {
    expect(PHONE_DISPLAY).toBeTruthy();
    expect(STORE_NAME).toBeTruthy();
  });

  it('falls back to the six DB categories (DB table is canonical)', () => {
    expect(FALLBACK_CATEGORIES).toHaveLength(6);
    expect(FALLBACK_CATEGORIES).toContain('العقيدة والتوحيد');
  });
});

describe('config endpoints', () => {
  it('points at the /api function paths', () => {
    expect(UPLOAD_ENDPOINT).toBe('/api/upload-image');
    expect(DELETE_IMAGE_ENDPOINT).toBe('/api/delete-image');
  });
});

describe('whatsappLink', () => {
  it('builds a wa.me link without message', () => {
    expect(whatsappLink()).toBe('https://wa.me/212624182004');
  });

  it('URL-encodes an Arabic message', () => {
    const link = whatsappLink('السلام عليكم');
    expect(link.startsWith('https://wa.me/212624182004?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('السلام عليكم');
  });
});
