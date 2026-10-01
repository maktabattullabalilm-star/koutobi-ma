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
    select(...a) {
      return b._push('select', a);
    },
    eq(...a) {
      return b._push('eq', a);
    },
    order(...a) {
      return b._push('order', a);
    },
    ilike(...a) {
      return b._push('ilike', a);
    },
    or(...a) {
      return b._push('or', a);
    },
    in(...a) {
      return b._push('in', a);
    },
    insert(...a) {
      return b._push('insert', a);
    },
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
  rpc: (...a) => {
    state.calls.push(['rpc', 'rpc', a]);
    return Promise.resolve({ data: 0, error: null });
  },
};

vi.mock('./supabase', () => ({
  supabase: mockClient,
  SUPABASE_ENABLED: true,
}));

const { createOrder, getBook, getBooks, getCategories, getRelatedBooks } = await import('./api');

const ROWS = [
  {
    id: '1',
    title_ar: 'الداء والدواء',
    category: 'الرقائق والأخلاق',
    price: '70.00',
    old_price: '85.00',
    stock_qty: 10,
    is_active: true,
    created_at: '2026-01-02',
  },
  {
    id: '2',
    title_ar: 'حصن المسلم',
    category: 'الأذكار والأدعية',
    price: '15.00',
    old_price: null,
    stock_qty: 10,
    is_active: true,
    created_at: '2026-01-03',
  },
];

beforeEach(() => {
  state.tables = {
    books: [...ROWS],
    orders: [],
    order_items: [],
    categories: [{ name_ar: 'الرقائق والأخلاق' }, { name_ar: 'الأذكار والأدعية' }],
    book_images: [],
  };
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

  it('searches title OR author with a trimmed needle', async () => {
    await getBooks({ q: '  حصن  ' });
    expect(callsFor('books', 'or')).toContainEqual(['title_ar.ilike.%حصن%,author_ar.ilike.%حصن%']);
    expect(callsFor('books', 'ilike')).toHaveLength(0);
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
  it('returns categories from the categories table with live book counts', async () => {
    const cats = await getCategories();
    expect(cats).toContainEqual({ name: 'الرقائق والأخلاق', count: 1 });
    expect(cats).toContainEqual({ name: 'الأذكار والأدعية', count: 1 });
  });

  it('returns [] on error instead of throwing', async () => {
    state.tables.categories = new Error('db down');
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

describe('createOrder (live, server-priced RPC)', () => {
  const payload = {
    name: 'اختبار',
    phone: '0600000000',
    address: 'شارع الاختبار رقم 1',
    city: 'الرباط',
    notes: '',
    items: [{ id: '1', title: 'الداء والدواء', price: 70, qty: 2 }],
  };

  beforeEach(() => {
    mockClient.__rpcImpl = null;
  });

  function mockRpc(data, error = null) {
    mockClient.rpc = (...a) => {
      state.calls.push(['rpc', 'rpc', a]);
      return Promise.resolve({ data, error });
    };
  }

  it('sends only id+qty and returns the server total (never trusts cart price)', async () => {
    mockRpc({ id: 'order-1', total: '140.00' });
    const res = await createOrder({ ...payload, items: [{ id: '1', title: 'X', price: 1, qty: 2 }] });
    expect(res).toEqual({ id: 'order-1', total: 140, adjusted: [] });

    const rpcCalls = state.calls.filter(([t]) => t === 'rpc');
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0][2]).toEqual([
      'create_order',
      {
        p_name: 'اختبار',
        p_phone: '0600000000',
        p_address: 'شارع الاختبار رقم 1',
        p_city: 'الرباط',
        p_notes: null,
        p_items: [{ book_id: '1', qty: 2 }],
      },
    ]);
    // Privacy + integrity: no direct table inserts/reads from the browser.
    expect(callsFor('orders', 'insert')).toHaveLength(0);
    expect(callsFor('order_items', 'insert')).toHaveLength(0);
    expect(callsFor('orders', 'select')).toHaveLength(0);
  });

  it('maps server errors to Arabic (rate limit)', async () => {
    mockRpc(null, { message: 'rate limited' });
    await expect(createOrder(payload)).rejects.toThrow('عدد المحاولات');
  });

  it('maps out-of-stock with the book name', async () => {
    mockRpc(null, { message: 'out of stock: الداء والدواء' });
    await expect(createOrder(payload)).rejects.toThrow('نفدت كمية «الداء والدواء»');
  });

  it('maps over-stock with available quantity', async () => {
    mockRpc(null, { message: 'over stock: الداء والدواء asked 2 have 1' });
    await expect(createOrder(payload)).rejects.toThrow('هي 1 فقط');
  });

  it('maps bad phone to the MA hint', async () => {
    mockRpc(null, { message: 'bad phone' });
    await expect(createOrder(payload)).rejects.toThrow('مغربي');
  });
});
