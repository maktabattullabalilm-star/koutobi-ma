import { describe, expect, it } from 'vitest';
import { CATEGORIES, PHONE_DISPLAY, STORE_NAME, WHATSAPP_NUMBER, whatsappLink } from './config';

describe('store config', () => {
  it('exposes the real WhatsApp number (no placeholder)', () => {
    expect(WHATSAPP_NUMBER).toBe('212624182004');
    expect(WHATSAPP_NUMBER).not.toContain('000000');
  });

  it('has a display phone number and store name', () => {
    expect(PHONE_DISPLAY).toBeTruthy();
    expect(STORE_NAME).toBeTruthy();
  });

  it('defines the six catalog categories', () => {
    expect(CATEGORIES).toHaveLength(6);
    for (const c of CATEGORIES) {
      expect(c.name).toBeTruthy();
      expect(c.slug).toBeTruthy();
    }
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
