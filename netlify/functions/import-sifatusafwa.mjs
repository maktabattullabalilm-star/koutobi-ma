import { getAlternateLocales, parseSifatusafwa, sifaToBookFields } from '../../src/lib/importers.js';
import { requireAdmin } from './_lib/auth.mjs';
import { r2Client } from './_lib/r2.mjs';
import { fetchSafe } from './_lib/fetch-safe.mjs';
import { downloadCoverToR2 } from './_lib/covers.mjs';

/**
 * POST /api/import-sifatusafwa
 * Body: { url } — fetch the product page server-side, OR
 *       { html, url? } — parse pasted page HTML (fallback when the
 *       server fetch is blocked by Cloudflare bot challenge).
 * Header: Authorization: Bearer <supabase-access-token> (admin only)
 *
 * Returns { fields, cover: { url, r2_key } | null, warnings }.
 * `fields` uses BookForm names; price is NEVER imported (MAD pricing is ours).
 * The cover is downloaded to OUR R2 (never hotlinked) when possible.
 */
export const config = {
  path: '/api/import-sifatusafwa',
};

const HTML_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20000;
const SIFA_HOSTS = ['sifatusafwa.com'];

/** Arabic first (richest Arabic data for our catalog), then English. */
function rankLocale(lang) {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('ar')) return 0;
  if (l.startsWith('en')) return 1;
  return 2;
}

function localeLabel(lang) {
  const l = String(lang || '').toLowerCase();
  if (l.startsWith('ar')) return 'العربية';
  if (l.startsWith('en')) return 'الإنجليزية';
  if (l.startsWith('fr')) return 'الفرنسية';
  return 'الأخرى';
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const auth = await requireAdmin(req);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    let html = body?.html || '';
    // Paste mode cap: sifa product pages run ~800KB (spec rows live past
    // byte 500K), so the cap must clear a full page. All parsing regexes
    // are linear (negated classes, lazy quantifiers — no nested loops),
    // and this stays far under the platform payload/function limits.
    if (html && html.length > HTML_MAX_BYTES) {
      return Response.json({ error: 'حجم HTML كبير جدًا (الحد 2MB)' }, { status: 413 });
    }
    const url = (body?.url || '').trim();

    if (!html) {
      // --- URL mode: fetch server-side (SSRF-guarded) ---
      if (!url) return Response.json({ error: 'الرابط مطلوب' }, { status: 400 });
      try {
        const res = await fetchSafe(url, {
          allowedHosts: SIFA_HOSTS,
          timeoutMs: FETCH_TIMEOUT_MS,
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
        if (html.length > HTML_MAX_BYTES) {
          return Response.json({ error: 'حجم الصفحة كبير جدًا' }, { status: 413 });
        }
      } catch (e) {
        return Response.json(
          {
            error:
              'تعذّر جلب الصفحة من الخادم (حماية Cloudflare) — الصق كود HTML الصفحة من متصفحك بدلاً من ذلك',
            code: 'FETCH_BLOCKED',
          },
          { status: 422 }
        );
      }
    }

    const parsed = parseSifatusafwa(html);
    const warnings = [];

    // --- Language fallback: the same product exists in /en /fr /ar with
    // per-locale slugs, so never guess URLs — follow the page's own
    // hreflang alternates (Arabic first) and fill only missing fields. ---
    const needsMore = !parsed.author || !parsed.publisher;
    if (!body?.html && needsMore) {
      const alternates = getAlternateLocales(html).filter((a) => a.url && a.url !== url);
      const ranked = [...alternates].sort((a, b) => rankLocale(a.lang) - rankLocale(b.lang));
      for (const alt of ranked) {
        try {
          const res = await fetchSafe(alt.url, {
            allowedHosts: SIFA_HOSTS,
            timeoutMs: FETCH_TIMEOUT_MS,
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            },
          });
          if (!res.ok) continue;
          const altHtml = await res.text();
          if (!altHtml || altHtml.length > HTML_MAX_BYTES) continue;
          const altParsed = parseSifatusafwa(altHtml);
          const before = JSON.stringify(parsed);
          for (const k of ['title', 'author', 'publisher', 'pages', 'size', 'binding', 'cover_url']) {
            if (!parsed[k] && altParsed[k]) parsed[k] = altParsed[k];
          }
          if (JSON.stringify(parsed) !== before) {
            warnings.push(
              `أُكملت البيانات الناقصة من النسخة ${localeLabel(alt.lang)} لنفس المنتج`
            );
            break;
          }
        } catch {
          // Alternate unreachable — the primary parse still stands.
        }
        if (parsed.author && parsed.publisher) break;
      }
    }

    if (!parsed.title && !parsed.author && !parsed.pages) {
      return Response.json(
        { error: 'لم يتم العثور على بيانات كتاب في هذه الصفحة — تأكد من أنها صفحة منتج' },
        { status: 422 }
      );
    }

    if (!parsed.title) warnings.push('لم يُعثر على العنوان');
    if (!parsed.author) warnings.push('لم يُعثر على المؤلف');
    if (!parsed.pages) warnings.push('لم يُعثر على عدد الصفحات');

    let cover = null;
    if (parsed.cover_url) {
      try {
        cover = await downloadCoverToR2(r2Client(), parsed.cover_url);
      } catch {
        cover = { url: parsed.cover_url, r2_key: null };
        warnings.push('تعذّر نسخ الغلاف إلى التخزين — سيُستخدم الرابط الأصلي');
      }
    } else {
      warnings.push('لم يُعثر على صورة الغلاف');
    }

    return Response.json({ fields: sifaToBookFields(parsed), cover, warnings });
  } catch (err) {
    console.error('import-sifatusafwa error:', err);
    return Response.json({ error: 'حدث خطأ أثناء الاستيراد — حاول مجددًا' }, { status: 500 });
  }
}
