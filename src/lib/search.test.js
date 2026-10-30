import { describe, expect, it } from 'vitest';
import { normalizeArabic, searchBooks, searchBundles, searchCatalog, tokenize } from './search';

const books = [
  {
    id: 'b1',
    title_ar: 'الإسلام دين الفطرة',
    author_ar: 'مؤلف أول',
    publisher_ar: 'دار السلام',
    category: 'العقيدة',
    created_at: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'b2',
    title_ar: 'صفة صلاة النبي',
    author_ar: 'محمد ناصر الدين الألباني',
    publisher_ar: 'مكتبة المعارف',
    category: 'الفقه والأحكام',
    created_at: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'b3',
    title_ar: 'عدة الصابرين وذخيرة الشاكرين',
    author_ar: 'ابن قيم الجوزية',
    publisher_ar: 'دار ابن حزم',
    category: 'المواعظ والرقائق',
    description_ar: 'كتاب في الصبر والشكر',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const bundles = [
  {
    id: 'p1',
    product_type: 'bundle',
    title_ar: 'باقة طالب العلم',
    description_ar: 'مجموعة مختارة لطالب العلم',
    created_at: '2026-01-02T00:00:00.000Z',
    books: [
      {
        books: {
          title_ar: 'عدة الصابرين',
          author_ar: 'ابن قيم الجوزية',
          category: 'المواعظ والرقائق',
        },
      },
    ],
  },
  {
    id: 'p2',
    product_type: 'bundle',
    title_ar: 'باقة الصلاة',
    created_at: '2026-01-01T00:00:00.000Z',
    books: [
      {
        books: {
          title_ar: 'صفة صلاة النبي',
          author_ar: 'محمد ناصر الدين الألباني',
          category: 'الفقه والأحكام',
        },
      },
    ],
  },
];

describe('Arabic search normalization', () => {
  it('ignores diacritics, tatweel and alef variants', () => {
    expect(normalizeArabic('الإسْـلَامُ')).toBe('الاسلام');
    expect(tokenize('الإسْـلَامُ')).toEqual(['اسلام']);
  });

  it('normalizes taa marbuta, alef maqsura and Arabic-Indic digits', () => {
    expect(tokenize('الصَّلَاة')).toEqual(['صلاه']);
    expect(tokenize('مصطفى ١٢٣')).toEqual(['مصطفي', '123']);
  });
});

describe('book search', () => {
  it('finds alef/hamza variants', () => {
    expect(searchBooks(books, 'الاسلام').map((book) => book.id)).toEqual(['b1']);
  });

  it('finds the definite-article and taa-marbuta variant', () => {
    expect(searchBooks(books, 'الصلاة').map((book) => book.id)).toEqual(['b2']);
  });

  it('searches publishers with multi-word queries', () => {
    expect(searchBooks(books, 'دار ابن حزم').map((book) => book.id)).toEqual(['b3']);
  });

  it('searches authors with multi-word queries', () => {
    expect(searchBooks(books, 'ابن قيم').map((book) => book.id)).toEqual(['b3']);
  });

  it('searches descriptions', () => {
    expect(searchBooks(books, 'الصبر والشكر').map((book) => book.id)).toEqual(['b3']);
  });

  it('ranks title matches above publisher matches', () => {
    const rows = [
      { id: 'title', title_ar: 'الصلاة في الإسلام', created_at: '2026-01-01' },
      { id: 'publisher', title_ar: 'كتاب آخر', publisher_ar: 'دار الصلاة', created_at: '2026-01-02' },
    ];
    expect(searchBooks(rows, 'الصلاة').map((book) => book.id)).toEqual(['title', 'publisher']);
  });
});

describe('bundle search', () => {
  it('matches pack names', () => {
    expect(searchBundles(bundles, 'باقة').map((bundle) => bundle.id)).toEqual(['p1', 'p2']);
  });

  it('matches books contained in a pack', () => {
    expect(searchBundles(bundles, 'ابن قيم').map((bundle) => bundle.id)).toEqual(['p1']);
  });

  it('includes packs in the mixed catalogue view', () => {
    const ids = searchCatalog({ books, bundles, query: 'باقة', type: 'all' }).map((item) => item.id);
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('respects the books-only and packs-only tabs', () => {
    expect(searchCatalog({ books, bundles, query: 'باقة', type: 'books' })).toEqual([]);
    expect(searchCatalog({ books, bundles, query: 'باقة', type: 'packs' }).map((item) => item.id)).toEqual([
      'p1',
      'p2',
    ]);
  });
});
