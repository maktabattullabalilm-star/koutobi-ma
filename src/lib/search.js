/**
 * Arabic-aware catalogue search.
 *
 * Matching is done on normalized text, while the original values are always
 * returned untouched. This keeps display data intact and makes searches such
 * as «الاسلام» match «الإسلام» and «الصلاة» match «صلاة».
 */

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const NON_WORD = /[^\p{L}\p{N}\s]/gu;

/** Normalize Arabic/Latin text for comparison only. */
export function normalizeArabic(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingAl(token) {
  // Keep short words such as «الله» intact; strip «ال» only where it is a
  // meaningful article prefix.
  return token.length >= 5 && token.startsWith('ال') ? token.slice(2) : token;
}

/** Split normalized text into searchable tokens. */
export function tokenize(value) {
  return normalizeArabic(value).split(' ').filter(Boolean).map(stripLeadingAl);
}

function normalizeForSearch(value) {
  return tokenize(value).join(' ');
}

function bundleBookText(bundle) {
  return (bundle?.books || [])
    .map((entry) => {
      const book = entry?.books || entry;
      return [book?.title_ar, book?.author_ar, book?.category].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(' ');
}

function searchFields(item, kind) {
  if (kind === 'bundle') {
    return [
      { key: 'title', weight: 5, value: item?.title_ar || item?.name_ar },
      { key: 'description', weight: 1, value: item?.description_ar },
      { key: 'books', weight: 3, value: bundleBookText(item) },
    ];
  }

  return [
    { key: 'title', weight: 5, value: item?.title_ar },
    { key: 'subtitle', weight: 4, value: item?.subtitle_ar },
    { key: 'author', weight: 4, value: item?.author_ar },
    { key: 'category', weight: 3, value: item?.category },
    { key: 'publisher', weight: 2, value: item?.publisher_ar },
    { key: 'isbn', weight: 5, value: item?.isbn },
    { key: 'description', weight: 1, value: item?.description_ar },
    { key: 'edition', weight: 1, value: item?.edition_ar },
  ];
}

function buildFields(item, kind) {
  return searchFields(item, kind)
    .map((field) => {
      const tokens = tokenize(field.value);
      return { ...field, tokens, normalized: tokens.join(' ') };
    })
    .filter((field) => field.tokens.length > 0);
}

/**
 * Score one book/bundle against a query. Zero means no match.
 * Every query token must match somewhere (AND semantics).
 */
export function scoreItem(item, query, kind = 'book') {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const fields = buildFields(item, kind);
  if (fields.length === 0) return 0;

  const allTokens = fields.flatMap((field) => field.tokens);
  const matchesEveryToken = queryTokens.every((queryToken) =>
    allTokens.some((token) => token.includes(queryToken))
  );
  if (!matchesEveryToken) return 0;

  const normalizedQuery = queryTokens.join(' ');
  let score = 0;

  const title = fields.find((field) => field.key === 'title');
  if (title) {
    if (title.normalized === normalizedQuery) score += 1200;
    else if (title.normalized.startsWith(normalizedQuery)) score += 500;
    else if (title.normalized.includes(normalizedQuery)) score += 300;
  }

  for (const field of fields) {
    if (field.key === 'title') continue;
    if (field.normalized.includes(normalizedQuery)) score += field.weight * 20;
  }

  for (const queryToken of queryTokens) {
    let best = 0;
    for (const field of fields) {
      for (const token of field.tokens) {
        if (token === queryToken) best = Math.max(best, field.weight * 10);
        else if (token.startsWith(queryToken)) best = Math.max(best, field.weight * 6);
        else if (token.includes(queryToken)) best = Math.max(best, field.weight * 3);
      }
    }
    score += best;
  }

  return score;
}

function newestFirst(a, b) {
  const aDate = Date.parse(a?.created_at || '') || 0;
  const bDate = Date.parse(b?.created_at || '') || 0;
  if (aDate !== bDate) return bDate - aDate;
  return String(a?.title_ar || '').localeCompare(String(b?.title_ar || ''), 'ar');
}

function sortScored(rows) {
  return rows.sort((a, b) => b.score - a.score || newestFirst(a.item, b.item)).map((row) => row.item);
}

/** Search books only. */
export function searchBooks(books, query) {
  return sortScored(
    (books || [])
      .map((item) => ({ item, score: scoreItem(item, query, 'book') }))
      .filter((row) => row.score > 0)
  );
}

/** Search bundles only, including their contained books. */
export function searchBundles(bundles, query) {
  return sortScored(
    (bundles || [])
      .map((item) => ({ item, score: scoreItem(item, query, 'bundle') * 0.85 }))
      .filter((row) => row.score > 0)
  );
}

/**
 * Search the visible catalogue. `type` follows the storefront tabs:
 * `all`, `books`, or `packs`.
 */
export function searchCatalog({ books = [], bundles = [], query = '', type = 'all' } = {}) {
  if (!String(query || '').trim()) return [];

  const rows = [];
  if (type !== 'packs') {
    for (const item of books) {
      const score = scoreItem(item, query, 'book');
      if (score > 0) rows.push({ item, score });
    }
  }
  if (type !== 'books') {
    for (const item of bundles) {
      const score = scoreItem(item, query, 'bundle') * 0.85;
      if (score > 0) rows.push({ item, score });
    }
  }
  return sortScored(rows);
}
