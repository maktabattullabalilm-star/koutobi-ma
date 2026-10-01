import { describe, expect, it, vi } from 'vitest';
import {
  formatPhoneDisplay,
  normalizeContactDigits,
  telHref,
  toPhoneDigits,
  toWhatsAppDigits,
} from './siteSettings';
import { whatsappLink } from './config';
import { generalInquiryLink } from './whatsapp';

describe('site contact numbers', () => {
  it('normalizes 06… / +212… / 212… to wa.me digits', () => {
    expect(toWhatsAppDigits('0624182004')).toBe('212624182004');
    expect(toWhatsAppDigits('+212 624-182004')).toBe('212624182004');
    expect(toWhatsAppDigits('212624182004')).toBe('212624182004');
  });

  it('falls back to the bundled default on garbage', () => {
    expect(toWhatsAppDigits('abc')).toBe('212624182004');
    expect(toPhoneDigits('')).toBe('212624182004');
    expect(normalizeContactDigits('+212 624-182004')).toBe('212624182004');
  });

  it('builds a correct tel: href (single +, full digits)', () => {
    expect(telHref('0624182004')).toBe('tel:+212624182004');
    expect(telHref('212624182004')).toBe('tel:+212624182004');
    expect(telHref('abc')).toBe('tel:+212624182004');
  });

  it('formats LTR-safe display strings', () => {
    expect(formatPhoneDisplay('212624182004')).toBe('+212 624-182004');
    expect(formatPhoneDisplay('0624182004')).toBe('0624-182004');
  });

  it('routes wa.me links through the override number', () => {
    expect(whatsappLink('سلام', '212600000000')).toBe(
      `https://wa.me/212600000000?text=${encodeURIComponent('سلام')}`
    );
    expect(generalInquiryLink('book', '212600000000').startsWith('https://wa.me/212600000000')).toBe(true);
    // default unchanged when no override
    expect(whatsappLink()).toBe('https://wa.me/212624182004');
  });
});

describe('admin settings upsert', () => {
  it('upserts contact keys (works for new keys, not just update)', async () => {
    const calls = [];
    vi.resetModules();
    vi.doMock('./supabase', () => ({
      supabase: {
        from: () => ({
          upsert: (row, opts) => {
            calls.push([row, opts]);
            return Promise.resolve({ error: null });
          },
        }),
      },
      SUPABASE_ENABLED: true,
    }));
    const stock = await import('./admin/stock');
    await stock.adminUpdateAppSetting('whatsapp_number', '212600000000');
    expect(calls).toEqual([[{ key: 'whatsapp_number', value: '212600000000' }, { onConflict: 'key' }]]);
    vi.doUnmock('./supabase');
  });
});
