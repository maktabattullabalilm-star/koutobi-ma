/**
 * Pure import helpers shared by:
 * - the browser (BookForm prefill mapping)
 * - Netlify functions (server fetch + parse) via relative import
 *
 * No DOM, no fetch globals at module level — everything injectable/testable.
 */

// ---------------- ISBN ----------------

/** Strip hyphens/spaces, uppercase. Returns the cleaned string (may be invalid). */
export function normalizeIsbn(value) {
  return String(value || '')
    .replace(/[\s-]+/g, '')
    .toUpperCase();
}

export function isValidIsbn10(v) {
  if (!/^\d{9}[\dX]$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += (v[i] === 'X' ? 10 : Number(v[i])) * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(v) {
  if (!/^\d{13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(v[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isValidIsbn(value) {
  const v = normalizeIsbn(value);
  return isValidIsbn10(v) || isValidIsbn13(v);
}

// ---------------- HTML scraping ----------------

const ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return '';
      }
    })
    .replace(/&([a-zA-Z]+);/g, (_, name) => ENTITY_MAP[name] ?? `&${name};`);
}

/** Roughly convert HTML to plain text lines (scripts/styles removed). */
export function htmlToTextLines(html) {
  const noScripts = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|ul|ol)>/gi, '\n');
  const stripped = noScripts.replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped)
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean);
}

/** Read <meta property|name="..." content="..."> (either attribute order). */
export function metaContent(html, key) {
  const src = String(html || '');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) return decodeEntities(m[1].trim());
  }
  return '';
}

function firstLongParagraph(html, minLen = 80) {
  const paras = [...String(html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const [, inner] of paras) {
    const text = decodeEntities(
      inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (text.length >= minLen) return text.slice(0, 2000);
  }
  return '';
}

function firstH1Arabic(html) {
  const m = String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  const text = decodeEntities(
    m[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  const runs = text.match(/[\u0600-\u06FF][\u0600-\u06FF\s:؛،\-()]{3,}/g);
  if (!runs) return '';
  return runs
    .sort((a, b) => b.length - a.length)[0]
    .trim()
    .slice(0, 200);
}

const SPEC_KEYS = [
  'Title',
  'Author',
  'Pages',
  'Edition',
  'Format',
  'Cover',
  'Volumes',
  'Checking and preparation',
  'Reference',
  'Harakat',
  'Print Quality',
  // French locale pages (/fr/) use French labels for the same spec block.
  'Titre',
  'Auteur',
  'Édition',
  'Couverture',
  // Arabic locale pages (/ar/) use Arabic labels.
  'مؤلف',
  'الصفحات',
  'طبعة',
  'غلاف',
];

/**
 * Parse a sifatusafwa product page.
 * Real structure (observed): a spec block of "- KeyValue" rows, e.g.
 *   - Titleالصحيح المصفّى من سيرة النبي المصطفى ﷺ
 *   - Authorسليم بن عيد الهلالي
 *   - Pages 661 / Editionدار ابن عباس / Format 17x24cm / Cover Hard
 * plus og:* meta tags and an H1 "English title Arabic title".
 */
export function parseSifatusafwa(html) {
  const out = {
    title: '',
    author: '',
    publisher: '',
    pages: null,
    size: '',
    binding: '',
    volumes: '',
    checker: '',
    reference: '',
    description: '',
    cover_url: '',
  };

  // Latin/French keys: values may be glued ("- Titleالصحيح…"), but a trailing
  // Latin letter means a longer word ("AUTHORS", "Auteurs") — never a value.
  // Arabic keys always stand alone ("مؤلف …"), so a glued word ("مؤلفات …",
  // a breadcrumb) must never match — require space/colon/end after the key.
  const AR_KEYS = ['مؤلف', 'الصفحات', 'طبعة', 'غلاف'];
  const LATIN_KEYS = SPEC_KEYS.filter((k) => !AR_KEYS.includes(k));
  const latinRe = new RegExp(`^[-•\\s]*(${LATIN_KEYS.join('|')})(?![A-Za-z])\\s*:?\\s*(.+?)\\s*$`, 'i');
  const arRe = new RegExp(`^[-•\\s]*(${AR_KEYS.join('|')})(?=[\\s:]|$)\\s*:?\\s*(.+?)\\s*$`);
  for (const line of htmlToTextLines(html)) {
    const m = line.match(latinRe) || line.match(arRe);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    // Skip label-only rows ("Author:") and prefix hits ("AUTHORS" nav header):
    // a real value carries at least one letter or digit.
    if (!/[\p{L}\p{N}]/u.test(val)) continue;
    if ((key === 'title' || key === 'titre') && !out.title) out.title = val;
    else if ((key === 'author' || key === 'auteur' || key === 'مؤلف') && !out.author) out.author = val;
    else if ((key === 'edition' || key === 'édition' || key === 'طبعة') && !out.publisher) out.publisher = val;
    else if (key === 'pages' || key === 'الصفحات') {
      if (out.pages == null) {
        const n = parseInt(val.replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n) && n > 0) out.pages = n;
      }
    } else if (key === 'format' && !out.size) out.size = val;
    else if ((key === 'cover' || key === 'couverture' || key === 'غلاف') && !out.binding) out.binding = val;
    else if (key === 'volumes' && !out.volumes) out.volumes = val;
    else if (key === 'checking and preparation' && !out.checker) out.checker = val;
    else if (key === 'reference' && !out.reference) out.reference = val;
  }

  if (!out.title) {
    out.title = firstH1Arabic(html) || metaContent(html, 'og:title');
  }
  out.description = metaContent(html, 'og:description') || firstLongParagraph(html);
  out.cover_url = metaContent(html, 'og:image');
  return out;
}

/** "17x24cm" / "17X24 cm" → "17 × 24 سم". Unknown shapes pass through. */
export function formatSifaSize(v) {
  const m = String(v || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return String(v || '').trim();
  return `${m[1]} × ${m[2]} سم`;
}

/** "Hard" → مجلد فني, soft/paperback → غلاف ورقي, else ''. Arabic values included. */
export function mapSifaCover(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return '';
  if (/hard|rigid|cartonn|reli|مجلد|فني/i.test(s)) return 'مجلد فني';
  if (/soft|paperback|broch|souple|flexible|ورقي/i.test(s)) return 'غلاف ورقي';
  return '';
}

/** Neutral sifatusafwa parse → BookForm field names (price never imported). */
export function sifaToBookFields(p) {

  const editionBits = [];
  if (p.checker) editionBits.push(`تحقيق: ${p.checker}`);
  if (p.volumes) editionBits.push(`${p.volumes} مجلدات`);
  return {
    title_ar: p.title || '',
    author_ar: p.author || '',
    publisher_ar: p.publisher || '',
    pages: p.pages ?? '',
    size_ar: formatSifaSize(p.size),
    binding_ar: mapSifaCover(p.binding),
    paper_ar: '',
    edition_ar: editionBits.join('، '),
    isbn: '',
    description_ar: p.description || '',
  };
}

/**
 * Alternate-locale URLs declared by the page itself
 * (<link rel="alternate" hreflang=".." href="..">). The reliable way to
 * "switch language": slugs differ per locale, so guessing URLs 404s —
 * follow what the page advertises instead.
 */
export function getAlternateLocales(html) {
  const src = String(html || '');
  const out = [];
  const seen = new Set();
  const patterns = [
    /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]+hreflang=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+hreflang=["']([^"']+)["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      // patterns 0/2 capture (lang, url); pattern 1 captures (url, lang).
      const lang = re === patterns[1] ? m[2] : m[1];
      const url = re === patterns[1] ? m[1] : m[2];
      const key = `${lang}|${url}`;
      if (url && !seen.has(key)) {
        seen.add(key);
        out.push({ lang: String(lang).toLowerCase(), url });
      }
    }
  }
  return out;
}

/** Fill empty string/null fields of `base` from `extra`. Never overwrites. */
export function mergeMissingFields(base, extra) {
  const merged = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if ((merged[k] === '' || merged[k] == null) && v !== '' && v != null) merged[k] = v;
  }
  return merged;
}

// ---------------- ISBN lookup chain ----------------

export function openLibraryToFields(j, authorName = '') {
  const desc = typeof j.description === 'string' ? j.description : j.description?.value || '';
  return {
    title: j.title || '',
    subtitle: j.subtitle || '',
    author: authorName || '',
    publisher: Array.isArray(j.publishers) ? j.publishers[0] || '' : j.publishers || '',
    pages: j.number_of_pages || '',
    published: j.publish_date || '',
    description: String(desc).slice(0, 2000),
  };
}

export function googleBooksToFields(vi) {
  const ids = vi.industryIdentifiers || [];
  const isbn13 = ids.find((x) => x.type === 'ISBN_13')?.identifier || '';
  const isbn10 = ids.find((x) => x.type === 'ISBN_10')?.identifier || '';
  return {
    title: vi.title || '',
    subtitle: vi.subtitle || '',
    author: vi.authors?.[0] || '',
    publisher: vi.publisher || '',
    pages: vi.pageCount || '',
    published: vi.publishedDate || '',
    isbn: isbn13 || isbn10,
    description: String(vi.description || '').slice(0, 2000),
  };
}

/**
 * ISBN metadata: Open Library first, Google Books fallback.
 * fetchFn injectable for tests. Throws Arabic errors for the UI.
 */
export async function lookupIsbn(rawIsbn, fetchFn) {
  const fetchImpl = fetchFn || globalThis.fetch;
  if (!fetchImpl) throw new Error('البحث غير متاح في هذه البيئة');
  const isbn = normalizeIsbn(rawIsbn);
  if (!isValidIsbn(isbn)) throw new Error('رقم ISBN غير صالح — تحقق من الرقم');

  // 1. Open Library
  try {
    const r = await fetchImpl(`https://openlibrary.org/isbn/${isbn}.json`);
    if (r.ok) {
      const j = await r.json();
      let authorName = '';
      const aKey = j.authors?.[0]?.key;
      if (aKey) {
        try {
          const ar = await fetchImpl(`https://openlibrary.org${aKey}.json`);
          if (ar.ok) authorName = (await ar.json()).name || '';
        } catch {
          /* author is optional */
        }
      }
      const coverId = Array.isArray(j.covers) ? j.covers[0] : null;
      return {
        source: 'openlibrary',
        fields: { ...openLibraryToFields(j, authorName), isbn },
        cover_url: coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : j.cover?.large || j.cover?.medium || '',
      };
    }
  } catch (e) {
    if (e?.message?.startsWith('رقم ISBN')) throw e;
    /* fall through to Google Books */
  }

  // 2. Google Books
  let gj;
  try {
    const gr = await fetchImpl(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (!gr.ok) throw new Error('لم يتم العثور على هذا ISBN — أكمل الإدخال يدوياً');
    gj = await gr.json();
  } catch (e) {
    if (e?.message?.includes('لم يتم العثور')) throw e;
    throw new Error('تعذّر الاتصال بخدمة البحث');
  }
  const item = gj.items?.[0];
  if (!item) throw new Error('لم يتم العثور على هذا ISBN — أكمل الإدخال يدوياً');
  const fields = googleBooksToFields(item.volumeInfo || {});
  return {
    source: 'googlebooks',
    fields: { ...fields, isbn: fields.isbn || isbn },
    cover_url: (item.volumeInfo?.imageLinks?.thumbnail || '').replace(/^http:\/\//, 'https://'),
  };
}

/** Neutral ISBN fields → BookForm field names (price never imported). */
export function isbnToBookFields(f) {
  let description = f.description || '';
  if (f.published && !description.includes(f.published)) {
    description = `${description}${description ? '\n\n' : ''}سنة النشر: ${f.published}`.slice(0, 2000);
  }
  return {
    title_ar: f.title || '',
    subtitle_ar: f.subtitle || '',
    author_ar: f.author || '',
    publisher_ar: f.publisher || '',
    pages: f.pages ?? '',
    size_ar: '',
    binding_ar: '',
    paper_ar: '',
    edition_ar: '',
    isbn: f.isbn || '',
    description_ar: description,
  };
}
