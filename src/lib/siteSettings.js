import { supabase } from './supabase';

export const PHONE_SETTING_KEY = 'phone_number';
export const WHATSAPP_SETTING_KEY = 'whatsapp_number';
export const BOOKS_PER_ROW_KEY = 'books_per_row';

export const DEFAULT_BOOKS_PER_ROW = 4;
export const BOOKS_PER_ROW_OPTIONS = [4, 6, 8];

/** Accepts only the supported grid widths (4/6/8); anything else falls back to 4. */
export function parseBooksPerRow(value) {
  const n = Number(value);
  return BOOKS_PER_ROW_OPTIONS.includes(n) ? n : DEFAULT_BOOKS_PER_ROW;
}

/** Digits only, e.g. "+212 624-182004" → "212624182004". */
export function normalizeContactDigits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

/**
 * Normalize any MA input (0624…, +212624…, 212624…) to wa.me form (212…).
 * Returns the explicit fallback (empty by default) when empty/invalid — there
 * is no bundled phone number.
 */
export function toWhatsAppDigits(value, fallback = '') {
  let d = normalizeContactDigits(value);
  if (!d) return normalizeContactDigits(fallback);
  if (d.startsWith('00212')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = `212${d.slice(1)}`;
  if (d.length < 11 || d.length > 13) return normalizeContactDigits(fallback);
  return d;
}

/** Normalize to E.164 digits for tel: links (212…). */
export function toPhoneDigits(value, fallback = '') {
  return toWhatsAppDigits(value, fallback);
}

/** tel: href, or null when the store has not configured a number. */
export function telHref(value, fallback = '') {
  const digits = toPhoneDigits(value, fallback);
  return digits ? `tel:+${digits}` : null;
}

/**
 * Human display, LTR-safe. 212624182004 → "+212 624-182004",
 * 0624182004 → "0624-182004". Returns '' when no valid number exists.
 */
export function formatPhoneDisplay(value, fallbackDisplay = '') {
  const d = normalizeContactDigits(value);
  if (/^212[5-7][0-9]{8}$/.test(d)) {
    return `+212 ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (/^0[5-7][0-9]{8}$/.test(d)) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (d) return `+${d}`;
  return fallbackDisplay;
}

/**
 * Public storefront read of both contact numbers. Returns empty strings when
 * the store has not configured them — callers must hide the related links.
 */
export async function getSiteContacts() {
  const empty = { phone: '', whatsapp: '' };
  if (!supabase) return empty;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', [PHONE_SETTING_KEY, WHATSAPP_SETTING_KEY]);
    if (error || !data) return empty;
    const byKey = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const phoneRaw = normalizeContactDigits(byKey[PHONE_SETTING_KEY]);
    const whatsappRaw = normalizeContactDigits(byKey[WHATSAPP_SETTING_KEY]);
    return {
      phone: phoneRaw ? toPhoneDigits(phoneRaw) : '',
      whatsapp: whatsappRaw ? toWhatsAppDigits(whatsappRaw) : '',
    };
  } catch {
    return empty;
  }
}

/**
 * Public storefront read of the books-per-row setting. Falls back to 4 so a
 * missing row or a DB hiccup never breaks the layout.
 */
export async function getBooksPerRow() {
  if (!supabase) return DEFAULT_BOOKS_PER_ROW;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', BOOKS_PER_ROW_KEY)
      .maybeSingle();
    if (error) return DEFAULT_BOOKS_PER_ROW;
    return parseBooksPerRow(data?.value);
  } catch {
    return DEFAULT_BOOKS_PER_ROW;
  }
}
