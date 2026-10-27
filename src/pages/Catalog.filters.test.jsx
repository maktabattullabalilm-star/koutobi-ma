import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Catalog from './Catalog';

const { state } = vi.hoisted(() => ({
  state: {
    books: [
      {
        id: 'book-1',
        title_ar: 'كتاب الفقه',
        price: 50,
        category: 'الفقه',
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'book-2',
        title_ar: 'كتاب الحديث',
        price: 60,
        category: 'الحديث',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    bundles: [
      {
        id: 'pack-1',
        product_type: 'bundle',
        title_ar: 'باقة الفقه',
        price: 100,
        created_at: '2026-01-04T00:00:00.000Z',
        books: [{ books: { category: 'الفقه' } }],
      },
      {
        id: 'pack-2',
        product_type: 'bundle',
        title_ar: 'باقة الحديث',
        price: 120,
        created_at: '2026-01-03T00:00:00.000Z',
        books: [{ books: { category: 'الحديث' } }],
      },
    ],
    categories: [
      { id: 'c1', name: 'الفقه', parentId: null, depth: 0, count: 1, totalCount: 1 },
      { id: 'c2', name: 'الحديث', parentId: null, depth: 0, count: 1, totalCount: 1 },
    ],
  },
}));

vi.mock('../hooks/useCatalog', () => ({
  useBooks: () => ({ books: state.books, loading: false, error: '' }),
  useBundles: () => ({ bundles: state.bundles, loading: false, error: '' }),
  useCategories: () => ({ categories: state.categories, loading: false, error: '' }),
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

describe('Catalog product types', () => {
  it('shows only bundles on the packs view', () => {
    renderCatalog('/catalog?type=packs');
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.dataset.type === 'bundle')).toBe(true);
    expect(screen.queryByText('كتاب الفقه')).toBeNull();
  });

  it('shows only books on the books view', () => {
    renderCatalog('/catalog?type=books');
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.dataset.type === 'book')).toBe(true);
  });

  it('switches to packs from the type tabs and syncs the URL', async () => {
    renderCatalog('/catalog');
    expect(screen.getAllByTestId('product-card')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'الباقات' }));

    await waitFor(() => expect(screen.getByTestId('url-search').textContent).toBe('?type=packs'));
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.dataset.type === 'bundle')).toBe(true);
  });

  it('shows bundles whose books belong to the selected category', () => {
    renderCatalog('/catalog?category=%D8%A7%D9%84%D9%81%D9%82%D9%87');
    expect(screen.getByText('باقة الفقه')).toBeTruthy();
    expect(screen.queryByText('باقة الحديث')).toBeNull();
  });

  it('keeps search results books-only in the mixed view', () => {
    renderCatalog('/catalog?q=%D8%A8%D8%A7%D9%82%D8%A9');
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.dataset.type === 'book')).toBe(true);
  });
});
