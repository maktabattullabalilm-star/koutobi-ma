import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { tables: {}, calls: [] };

function builder(table) {
  const b = {
    table,
    _calls: [],
    _push(op, args) {
      b._calls.push(op);
      state.calls.push([table, op, args]);
      return b;
    },
    select(...a) { return b._push('select', a); },
    eq(...a) { return b._push('eq', a); },
    order(...a) { return b._push('order', a); },
    ilike(...a) { return b._push('ilike', a); },
    insert(...a) { return b._push('insert', a); },
    maybeSingle() {
      const rows = state.tables[table] || [];
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then(resolve, reject) {
      const t = state.tables[table];
      const result = t instanceof Error ? { data: null, error: t } : { data: t ?? [], error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return b;
}

const mockClient = {
  from: (table) => builder(table),
};

vi.mock('./supabase', () => ({
  supabase: mockClient,
  SUPABASE_ENABLED: true,
}));

const { createOrder, getBook, getBooks, getCategories, getRelatedBooks } = await import('./api');

const ROWS = [
  { id: '1', title_ar: 'الداء والدواء', category: 'الرقائق والأخلاق', price: '70.00', old_price: '85.00', is_active: true, created_at: '2026-01-02' },
  { id: '2', title_ar: 'حصن المسلم', category: 'الأذكار والأدعية', price: '15.00', old_price: null, is_active: true, created_at: '2026-01-03' },
];

beforeEach(() => {
  state.tables = { books: [...ROWS], orders: [], order_items: [] };
  state.calls = [];
});

function callsFor(table, op) {
  return state.calls.filter(([t, o]) => t === table && o === op).map(([, , a]) => a);
}

describe('getBooks (live)', () => {
  it('returns normalized books and always filters active', async () => {
    const books = await getBooks();
    expect(books).toHaveLength(2);
    expect(books[0].price).toBe(70);
    expect(books[0].old_price).toBe(85);
    expect(callsFor('books', 'eq')).toContainEqual(['is_active', true]);
  });

  it('applies category filter except for "all"', async () => {
    await getBooks({ category: 'الرقائق والأخلاق' });
    expect(callsFor('books', 'eq')).toContainEqual(['category', 'الرقائق والأخلاق']);
    state.calls = [];
    await getBooks({ category: 'all' });
    expect(callsFor('books', 'eq')).not.toContainEqual(['category', 'all']);
  });

  it('applies trimmed title search', async () => {
    await getBooks({ q: '  حصن  ' });
    expect(callsFor('books', 'ilike')).toContainEqual(['title_ar', '%حصن%']);
  });

  it('throws when Supabase errors', async () => {
    state.tables.books = new Error('db down');
    await expect(getBooks()).rejects.toThrow('db down');
  });
});

describe('getBook (live)', () => {
  it('returns the normalized row', async () => {
    state.tables.books = [ROWS[0]];
    const b = await getBook('1');
    expect(b.title_ar).toBe('الداء والدواء');
    expect(b.price).toBe(70);
  });

  it('returns null when missing', async () => {
    state.tables.books = [];
    expect(await getBook('nope')).toBeNull();
  });
});

describe('getCategories (live)', () => {
  it('aggregates counts per category', async () => {
    const cats = await getCategories();
    expect(cats).toContainEqual({ name: 'الرقائق والأخلاق', count: 1 });
    expect(cats).toContainEqual({ name: 'الأذكار والأدعية', count: 1 });
  });

  it('returns [] on error instead of throwing', async () => {
    state.tables.books = new Error('db down');
    await expect(getCategories()).resolves.toEqual([]);
  });
});

describe('getRelatedBooks (live)', () => {
  it('excludes the current book and respects the limit', async () => {
    const rel = await getRelatedBooks({ id: '1', category: 'x' }, 1);
    expect(rel.map((b) => b.id)).not.toContain('1');
    expect(rel.length).toBeLessThanOrEqual(1);
  });
});

describe('createOrder (live)', () => {
  const payload = {
    name: 'اختبار',
    phone: '0600000000',
    address: 'شارع الاختبار رقم 1',
    city: 'الرباط',
    notes: '',
    items: [{ id: '1', title: 'الداء والدواء', price: 70, qty: 2 }],
  };

  it('computes the total and inserts order + items without any SELECT', async () => {
    const res = await createOrder(payload);
    expect(res.total).toBe(140);
    expect(res.id).toBeTruthy();

    const orderInserts = callsFor('orders', 'insert');
    expect(orderInserts).toHaveLength(1);
    expect(orderInserts[0][0]).toMatchObject({
      id: res.id,
      customer_name: 'اختبار',
      city: 'الرباط',
      total: 140,
    });
    // Privacy: guests must never SELECT orders (RLS allows INSERT only).
    expect(callsFor('orders', 'select')).toHaveLength(0);

    const itemInserts = callsFor('order_items', 'insert');
    expect(itemInserts).toHaveLength(1);
    expect(itemInserts[0][0]).toEqual([
      { order_id: res.id, book_id: '1', title_ar: 'الداء والدواء', price: 70, quantity: 2 },
    ]);
  });

  it('throws when the order insert fails', async () => {
    state.tables.orders = new Error('rls denied');
    await expect(createOrder(payload)).rejects.toThrow('rls denied');
  });

  it('throws when the items insert fails', async () => {
    state.tables.order_items = new Error('fk violation');
    await expect(createOrder(payload)).rejects.toThrow('fk violation');
  });
});
