import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Catalog from './Catalog';

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
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const bundles = [
  {
    id: 'p1',
    product_type: 'bundle',
    title_ar: 'باقة طالب العلم',
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

vi.mock('../hooks/useCatalog', () => ({
  useBooks: () => ({ books, loading: false, error: '' }),
  useBundles: () => ({ bundles, loading: false, error: '' }),
  useCategories: () => ({ categories: [], loading: false, error: '' }),
}));
vi.mock('../hooks/useHead', () => ({ useHead: vi.fn() }));
vi.mock('../hooks/useSiteContact', () => ({ useSiteContact: () => ({ whatsapp: '' }) }));
vi.mock('../components/ProductCard', () => ({
  default: ({ book }) => (
    <article data-testid="product-card" data-type={book.product_type || 'book'}>
      {book.title_ar}
    </article>
  ),
}));

function LocationText() {
  const { search } = useLocation();
  return <output data-testid="url-search">{search}</output>;
}

const renderCatalog = (url = '/catalog') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocationText />
      <Catalog />
    </MemoryRouter>
  );

afterEach(cleanup);

describe('Catalogue Arabic search', () => {
  it('matches alef/hamza variants', () => {
    renderCatalog('/catalog?q=%D8%A7%D9%84%D8%A7%D8%B3%D9%84%D8%A7%D9%85');
    expect(screen.getByText('الإسلام دين الفطرة')).toBeTruthy();
    expect(screen.queryByText('صفة صلاة النبي')).toBeNull();
  });

  it('matches the definite-article and taa-marbuta variant', () => {
    renderCatalog('/catalog?q=%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9');
    expect(screen.getByText('صفة صلاة النبي')).toBeTruthy();
    expect(screen.queryByText('الإسلام دين الفطرة')).toBeNull();
  });

  it('matches publishers with multi-word queries', () => {
    renderCatalog('/catalog?q=%D8%AF%D8%A7%D8%B1%20%D8%A7%D8%A8%D9%86%20%D8%AD%D8%B2%D9%85');
    expect(screen.getByText('عدة الصابرين وذخيرة الشاكرين')).toBeTruthy();
    expect(screen.queryByText('الإسلام دين الفطرة')).toBeNull();
  });

  it('ranks the matching book before a pack that contains it', () => {
    renderCatalog('/catalog?q=%D8%A7%D8%A8%D9%86%20%D9%82%D9%8A%D9%85');
    const cards = screen.getAllByTestId('product-card');
    expect(cards.map((card) => card.textContent)).toEqual([
      'عدة الصابرين وذخيرة الشاكرين',
      'باقة طالب العلم',
    ]);
  });

  it('includes packs in the mixed view and respects the packs tab', () => {
    renderCatalog('/catalog?q=%D8%A8%D8%A7%D9%82%D8%A9');
    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
    cleanup();

    renderCatalog('/catalog?q=%D8%A8%D8%A7%D9%82%D8%A9&type=books');
    expect(screen.queryAllByTestId('product-card')).toHaveLength(0);
    cleanup();

    renderCatalog('/catalog?q=%D8%A8%D8%A7%D9%82%D8%A9&type=packs');
    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
  });

  it('updates the URL from the catalogue search field and clears it', async () => {
    renderCatalog();
    const input = screen.getByLabelText('البحث في المكتبة');

    fireEvent.change(input, { target: { value: 'الصلاة' } });
    await waitFor(() =>
      expect(screen.getByTestId('url-search').textContent).toBe('?q=%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9')
    );
    expect(screen.getByText('صفة صلاة النبي')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    await waitFor(() => expect(screen.getByTestId('url-search').textContent).toBe(''));
    expect(screen.getAllByTestId('product-card').length).toBeGreaterThan(2);
  });
});
