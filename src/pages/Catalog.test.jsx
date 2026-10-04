import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Catalog, { getPaginationItems } from './Catalog';

const books = Array.from({ length: 50 }, (_, index) => ({
  id: `book-${index + 1}`,
  title_ar: `كتاب ${index + 1}`,
  price: index + 10,
  created_at: new Date(2026, 0, index + 1).toISOString(),
}));

vi.mock('../hooks/useCatalog', () => ({
  useBooks: () => ({ books, loading: false, error: '' }),
  useBundles: () => ({ bundles: [], loading: false, error: '' }),
  useCategories: () => ({ categories: [], loading: false, error: '' }),
}));
vi.mock('../hooks/useHead', () => ({ useHead: vi.fn() }));
vi.mock('../hooks/useSiteContact', () => ({ useSiteContact: () => ({ whatsapp: '212624182004' }) }));
vi.mock('../components/ProductCard', () => ({
  default: ({ book }) => <article data-testid="book-card">{book.title_ar}</article>,
}));

function LocationText() {
  const { search } = useLocation();
  return <output data-testid="url-search">{search}</output>;
}

afterEach(cleanup);

describe('Catalog pagination', () => {
  it('shows numbered pages, loads the selected page, and syncs it to the URL', async () => {
    render(<MemoryRouter initialEntries={['/catalog']}><LocationText /><Catalog /></MemoryRouter>);
    expect(screen.getAllByTestId('book-card')).toHaveLength(12);
    expect(screen.getByText('كتاب 50')).toBeTruthy();
    expect(screen.getByText('كتاب 39')).toBeTruthy();
    expect(screen.queryByText('كتاب 38')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة 2' }));
    expect(await screen.findByText('كتاب 38')).toBeTruthy();
    expect(screen.getAllByTestId('book-card')).toHaveLength(12);
    await waitFor(() => expect(screen.getByTestId('url-search').textContent).toBe('?page=2'));
  });

  it('can show all matching books and return to paged results', () => {
    render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'عرض الكل' }));
    expect(screen.getAllByTestId('book-card')).toHaveLength(50);
    fireEvent.click(screen.getByRole('button', { name: 'عرض الصفحات' }));
    expect(screen.getAllByTestId('book-card')).toHaveLength(12);
  });

  it('builds a compact page window with ellipses for long lists', () => {
    expect(getPaginationItems(1, 10)).toEqual([1, 2, 3, 'ellipsis', 10]);
    expect(getPaginationItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    expect(getPaginationItems(10, 10)).toEqual([1, 'ellipsis', 8, 9, 10]);
  });
});
