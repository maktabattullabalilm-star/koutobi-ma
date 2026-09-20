import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: null,
  SUPABASE_ENABLED: false,
}));

vi.mock('./sampleData', () => ({
  SAMPLE_BOOKS: [
    { id: 's1', title_ar: 'كتاب أ', category: 'الفقه وأصوله', price: 60, old_price: null },
    { id: 's2', title_ar: 'كتاب ب', category: 'الفقه وأصوله', price: '40', old_price: '50' },
  ],
}));

const { DEMO_MODE, createOrder, getBook, getBooks, getCategories, getRelatedBooks } = await import('./api');

describe('demo mode (no Supabase configured)', () => {
  it('reports DEMO_MODE', () => {
    expect(DEMO_MODE).toBe(true);
  });

  it('getBooks returns the normalized sample catalog', async () => {
    const books = await getBooks();
    expect(books).toHaveLength(2);
    expect(books[1].price).toBe(40);
  });

  it('getBook finds by id and returns null otherwise', async () => {
    expect((await getBook('s1')).title_ar).toBe('كتاب أ');
    expect(await getBook('missing')).toBeNull();
  });

  it('getCategories counts the sample catalog', async () => {
    await expect(getCategories()).resolves.toEqual([{ name: 'الفقه وأصوله', count: 2 }]);
  });

  it('getRelatedBooks excludes the current book', async () => {
    const rel = await getRelatedBooks({ id: 's1', category: 'x' });
    expect(rel.map((b) => b.id)).toEqual(['s2']);
  });

  it('createOrder simulates success with a local id', async () => {
    const res = await createOrder({
      name: 'ت',
      phone: '06',
      address: 'addr 12345',
      city: '',
      notes: '',
      items: [{ id: 's1', title: 'كتاب أ', price: 60, qty: 1 }],
    });
    expect(res.demo).toBe(true);
    expect(res.total).toBe(60);
    expect(res.id.startsWith('local-')).toBe(true);
  });
});
