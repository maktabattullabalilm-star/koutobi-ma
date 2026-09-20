import { describe, expect, it, vi } from 'vitest';
import {
  formatSifaSize,
  googleBooksToFields,
  htmlToTextLines,
  isbnToBookFields,
  isValidIsbn,
  lookupIsbn,
  mapSifaCover,
  metaContent,
  normalizeIsbn,
  openLibraryToFields,
  parseSifatusafwa,
  sifaToBookFields,
} from './importers';

describe('ISBN normalize + validate', () => {
  it('strips hyphens/spaces and uppercases', () => {
    expect(normalizeIsbn('978-0-13-110362-7')).toBe('9780131103627');
    expect(normalizeIsbn('0-306-40615-2 ')).toBe('0306406152');
  });

  it('accepts known-valid ISBN-13 and ISBN-10', () => {
    expect(isValidIsbn('9780131103627')).toBe(true);
    expect(isValidIsbn('978-0-13-110362-7')).toBe(true);
    expect(isValidIsbn('0306406152')).toBe(true);
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
  });

  it('rejects bad checksums and garbage', () => {
    expect(isValidIsbn('9780131103628')).toBe(false);
    expect(isValidIsbn('0306406153')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
    expect(isValidIsbn('')).toBe(false);
    expect(isValidIsbn(null)).toBe(false);
  });
});

const SIFA_FIXTURE = `<!doctype html><html><head>
<meta property="og:title" content="Al-Sahih al-Musaffa - Salim al-Hilali" />
<meta property="og:description" content="This remarkable book serves as both a biography and an account of character." />
<meta property="og:image" content="https://www.sifatusafwa.com/1234-large/sahih-musaffa.jpg" />
<title>Al-Sahih al-Musaffa - SifatuSafwa</title>
</head><body>
<script>var x = 1;</script>
<h1 class="product-title">Al-Sahih al-Musaffa min Sirah al-Nabi al-Mustafa ﷺ - Salim al-Hilali الصحيح المصفّى من سيرة النبي المصطفى ﷺ - سليم بن عيد الهلالي</h1>
<ul class="specs">
<li>- Titleالصحيح المصفّى من سيرة النبي المصطفى ﷺ</li>
<li>- Authorسليم بن عيد الهلالي</li>
<li>- Pages 661</li>
<li>- Editionدار ابن عباس</li>
<li>- Format 17x24cm</li>
<li>- Cover Hard</li>
<li>- Harakat In Part</li>
<li>- Print Quality Premium Quality ++</li>
</ul>
<p>Short.</p>
<p>This remarkable and innovative book serves as both a biography of the Messenger of Allah and a detailed account of his character, qualities, and manners, with authentic narratives throughout the chapters.</p>
</body></html>`;

describe('parseSifatusafwa', () => {
  it('extracts the spec block, meta cover and description', () => {
    const p = parseSifatusafwa(SIFA_FIXTURE);
    expect(p.title).toBe('الصحيح المصفّى من سيرة النبي المصطفى ﷺ');
    expect(p.author).toBe('سليم بن عيد الهلالي');
    expect(p.publisher).toBe('دار ابن عباس');
    expect(p.pages).toBe(661);
    expect(p.size).toBe('17x24cm');
    expect(p.binding).toBe('Hard');
    expect(p.cover_url).toBe('https://www.sifatusafwa.com/1234-large/sahih-musaffa.jpg');
    expect(p.description).toContain('remarkable book');
  });

  it('falls back to H1 Arabic runs when the spec block is missing', () => {
    const p = parseSifatusafwa('<html><head></head><body><h1>Some Book عنوان الكتاب هنا</h1></body></html>');
    expect(p.title).toContain('عنوان الكتاب هنا');
  });

  it('falls back to the first long paragraph without og:description', () => {
    const html = `<html><body><p>Short.</p><p>${'word '.repeat(30)}</p></body></html>`;
    const p = parseSifatusafwa(html);
    expect(p.description).toContain('word word');
  });

  it('returns empty fields for garbage input instead of throwing', () => {
    expect(() => parseSifatusafwa('not html at all {{{')).not.toThrow();
    const p = parseSifatusafwa('');
    expect(p.title).toBe('');
    expect(p.cover_url).toBe('');
  });
});

describe('htmlToTextLines + metaContent', () => {
  it('removes scripts and splits blocks into lines', () => {
    const lines = htmlToTextLines('<script>evil()</script><p>a</p><p>b</p>');
    expect(lines).toEqual(['a', 'b']);
  });

  it('reads meta content regardless of attribute order', () => {
    const html = '<meta content="X" property="og:title"><meta name="y" content="Z">';
    expect(metaContent(html, 'og:title')).toBe('X');
    expect(metaContent(html, 'missing')).toBe('');
  });
});

describe('sifa size/cover mapping', () => {
  it('normalizes dimensions to Arabic form', () => {
    expect(formatSifaSize('17x24cm')).toBe('17 × 24 سم');
    expect(formatSifaSize('17X24 cm')).toBe('17 × 24 سم');
    expect(formatSifaSize('24 × 17')).toBe('24 × 17 سم');
    expect(formatSifaSize('كبير')).toBe('كبير');
  });

  it('maps cover types to our binding list', () => {
    expect(mapSifaCover('Hard')).toBe('مجلد فني');
    expect(mapSifaCover('hardcover')).toBe('مجلد فني');
    expect(mapSifaCover('Soft')).toBe('غلاف ورقي');
    expect(mapSifaCover('Paperback')).toBe('غلاف ورقي');
    expect(mapSifaCover('')).toBe('');
    expect(mapSifaCover('Deluxe')).toBe('');
  });

  it('sifaToBookFields maps to form names and never includes price', () => {
    const f = sifaToBookFields({
      title: 'ت', author: 'م', publisher: 'د', pages: 100,
      size: '17x24cm', binding: 'Hard', volumes: '2', checker: 'فلان',
      description: 'وصف',
    });
    expect(f).toMatchObject({
      title_ar: 'ت', author_ar: 'م', publisher_ar: 'د', pages: 100,
      size_ar: '17 × 24 سم', binding_ar: 'مجلد فني',
      edition_ar: 'تحقيق: فلان، 2 مجلدات', description_ar: 'وصف',
    });
    expect(f).not.toHaveProperty('price');
  });
});

describe('lookupIsbn chain', () => {
  const OL_BOOK = {
    title: 'Ryad As-Salihin', publishers: ['Dar Ibn Kathir'],
    number_of_pages: 1200, publish_date: '2020', covers: [111],
    authors: [{ key: '/authors/OL1A' }],
  };

  it('uses Open Library first, with author + cover', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.includes('/authors/')) return { ok: true, json: async () => ({ name: 'An-Nawawi' }) };
      return { ok: true, json: async () => OL_BOOK };
    });
    const res = await lookupIsbn('9780131103627', fetchFn);
    expect(res.source).toBe('openlibrary');
    expect(res.fields.author).toBe('An-Nawawi');
    expect(res.cover_url).toBe('https://covers.openlibrary.org/b/id/111-L.jpg');
    expect(fetchFn.mock.calls[0][0]).toContain('openlibrary.org/isbn/9780131103627.json');
  });

  it('falls back to Google Books when Open Library misses', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.includes('openlibrary')) return { ok: false };
      return {
        ok: true,
        json: async () => ({
          items: [{
            volumeInfo: {
              title: 'T', authors: ['A'], publisher: 'P', pageCount: 50,
              industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780131103627' }],
              imageLinks: { thumbnail: 'http://img/x.jpg' },
            },
          }],
        }),
      };
    });
    const res = await lookupIsbn('9780131103627', fetchFn);
    expect(res.source).toBe('googlebooks');
    expect(res.fields.author).toBe('A');
    expect(res.cover_url).toBe('https://img/x.jpg');
  });

  it('throws a friendly Arabic error when nothing is found', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    await expect(lookupIsbn('9780131103627', fetchFn)).rejects.toThrow('لم يتم العثور');
  });

  it('rejects invalid ISBN before any network call', async () => {
    const fetchFn = vi.fn();
    await expect(lookupIsbn('123', fetchFn)).rejects.toThrow('غير صالح');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('field mappers', () => {
  it('openLibraryToFields picks first publisher and handles object descriptions', () => {
    const f = openLibraryToFields(
      { title: 'T', publishers: ['P1', 'P2'], description: { value: 'D' } },
      'Auth'
    );
    expect(f).toMatchObject({ title: 'T', author: 'Auth', publisher: 'P1', description: 'D' });
  });

  it('googleBooksToFields prefers ISBN-13 and reads pageCount', () => {
    const f = googleBooksToFields({
      title: 'T', authors: ['A'], pageCount: 9,
      industryIdentifiers: [{ type: 'ISBN_10', identifier: '0306406152' }, { type: 'ISBN_13', identifier: '9780131103627' }],
    });
    expect(f).toMatchObject({ isbn: '9780131103627', pages: 9 });
  });

  it('isbnToBookFields appends publish year without price', () => {
    const f = isbnToBookFields({ title: 'T', published: '2021', description: 'D' });
    expect(f.title_ar).toBe('T');
    expect(f.description_ar).toContain('2021');
    expect(f).not.toHaveProperty('price');
  });
});
