import { supabase } from './supabase';
import { PHONE_DISPLAY, WHATSAPP_NUMBER } from './site';

export const PHONE_SETTING_KEY = 'phone_number';
export const WHATSAPP_SETTING_KEY = 'whatsapp_number';

export const DEFAULT_PHONE_NUMBER = WHATSAPP_NUMBER;
export const DEFAULT_WHATSAPP_NUMBER = WHATSAPP_NUMBER;
export const DEFAULT_PHONE_DISPLAY = PHONE_DISPLAY;

/** Digits only, e.g. "+212 624-182004" → "212624182004". */
export function normalizeContactDigits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

/**
 * Normalize any MA input (0624…, +212624…, 212624…) to wa.me form (212…).
 * Falls back to the bundled default when empty/invalid.
 */
export function toWhatsAppDigits(value, fallback = DEFAULT_WHATSAPP_NUMBER) {
  let d = normalizeContactDigits(value);
  if (!d) return normalizeContactDigits(fallback);
  if (d.startsWith('00212')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = `212${d.slice(1)}`;
  if (d.length < 11 || d.length > 13) return normalizeContactDigits(fallback);
  return d;
}

/**
 * Normalize to E.164 digits for tel: links (212…).
 * Accepts 06… / 212… / +212… and falls back to the bundled default.
 */
export function toPhoneDigits(value, fallback = DEFAULT_PHONE_NUMBER) {
  return toWhatsAppDigits(value, fallback);
}

/** tel: href that always dials correctly regardless of display formatting. */
export function telHref(value, fallback = DEFAULT_PHONE_NUMBER) {
  return `tel:+${toPhoneDigits(value, fallback)}`;
}

/**
 * Human display, LTR-safe. 212624182004 → "+212 624-182004",
 * 0624182004 → "0624-182004". Never returns "" (falls back).
 */
export function formatPhoneDisplay(value, fallbackDisplay = DEFAULT_PHONE_DISPLAY) {
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

/** Public storefront read of both contact numbers. Fails open to defaults. */
export async function getSiteContacts() {
  const fallback = {
    phone: DEFAULT_PHONE_NUMBER,
    whatsapp: DEFAULT_WHATSAPP_NUMBER,
  };
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', [PHONE_SETTING_KEY, WHATSAPP_SETTING_KEY]);
    if (error || !data) return fallback;
    const byKey = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const phoneRaw = normalizeContactDigits(byKey[PHONE_SETTING_KEY]);
    const whatsappRaw = normalizeContactDigits(byKey[WHATSAPP_SETTING_KEY]);
    return {
      phone: phoneRaw ? toPhoneDigits(phoneRaw, fallback.phone) : fallback.phone,
      whatsapp: whatsappRaw ? toWhatsAppDigits(whatsappRaw, fallback.whatsapp) : fallback.whatsapp,
    };
  } catch {
    return fallback;
  }
}
