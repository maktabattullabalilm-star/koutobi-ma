/**
 * Shared media validation for the Cloudflare Worker (upload-image + importers).
 * No dependencies — magic-byte sniffing only (never trust client MIME).
 *
 * NOTE: kept in sync with netlify/functions/_lib/media.mjs (same logic, other runtime).
 */

const ALLOWED = new Map([
  ['png', 'image/png'],
  ['jpeg', 'image/jpeg'],
  ['jpg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['avif', 'image/avif'],
]);

export const ALLOWED_EXTS = [...ALLOWED.keys()].filter((e) => e !== 'jpg');

/** R2 keys we create: exactly `covers/<filename>` — single source (docs/backlog/22). */
export const R2_KEY_RE = /^covers\/[A-Za-z0-9._-]+$/;

export function isR2Key(s) {
  return typeof s === 'string' && R2_KEY_RE.test(s);
}

function ascii(buf, start, len) {
  return String.fromCharCode(...buf.subarray(start, start + len));
}

/** Sniff image type from magic bytes. Returns {ext, mime} or null. */
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpeg', mime: 'image/jpeg' };
  }
  if (ascii(buf, 0, 4) === 'GIF8' && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 4) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (ascii(buf, 4, 4) === 'ftyp') {
    const brand = ascii(buf, 8, 4);
    if (['avif', 'avis', 'mif1', 'heic', 'heix'].includes(brand)) {
      return { ext: 'avif', mime: 'image/avif' };
    }
  }
  return null;
}

/**
 * Validate claimed MIME against sniffed bytes.
 * Returns {ext, mime} with server-truth values, or null when rejected.
 * SVG is intentionally unsupported (stored-XSS risk — client rasterizes).
 */
export function validateImageUpload(buf, claimedType) {
  const sniffed = sniffImage(buf);
  if (!sniffed) return null;
  const claimed = String(claimedType || '').toLowerCase();
  const expected = ALLOWED.get(claimed.split('/')[1] || '');
  if (!expected) return null;
  // jpg/jpeg alias + strict match otherwise
  if (expected !== sniffed.mime) return null;
  return sniffed;
}

/** Unpredictable R2 key (timestamp + random suffix, safe chars only). */
export function buildR2Key(cleanName, ext) {
  const rand =
    globalThis.crypto?.randomUUID?.().slice(0, 8).replace(/-/g, '') ||
    Math.random().toString(36).slice(2, 10);
  return `covers/${Date.now()}-${cleanName}-${rand}.${ext}`;
}

/** base64 (without a `data:` prefix) → Uint8Array. Edge-safe (no Node Buffer). */
export function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
