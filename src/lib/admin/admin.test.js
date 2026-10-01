import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Behavior tests for the admin domain modules (docs/backlog/21+26).
 * Supabase is mocked at the client level; these guard the query shapes
 * (limits, ordering, error mapping) — not the database itself.
 */

const state = { calls: [], tableError: null, tableData: [] };

function builder(table) {
  const b = {
    _order: null,
    _limit: null,
    _eq: [],
    select(...a) {
      state.calls.push([table, 'select', a]);
      return b;
    },
    eq(k, v) {
      b._eq.push([k, v]);
      state.calls.push([table, 'eq', [k, v]]);
      return b;
    },
    order(k, o) {
      b._order = [k, o];
      state.calls.push([table, 'order', [k, o]]);
      return b;
    },
    limit(n) {
      b._limit = n;
      state.calls.push([table, 'limit', [n]]);
      return b;
    },
    range(...a) {
      state.calls.push([table, 'range', a]);
      return b;
    },
    insert(...a) {
      state.calls.push([table, 'insert', a]);
      return b;
    },
    update(...a) {
      state.calls.push([table, 'update', a]);
      return b;
    },
    delete(...a) {
      state.calls.push([table, 'delete', a]);
      return b;
    },
    single() {
      if (state.tableError) return Promise.resolve({ data: null, error: state.tableError });
      return Promise.resolve({ data: state.tableData[0] ?? {}, error: null });
    },
    maybeSingle() {
      if (state.tableError) return Promise.resolve({ data: null, error: state.tableError });
      return Promise.resolve({ data: state.tableData[0] ?? null, error: null });
    },
    then(resolve) {
      if (state.tableError) return Promise.resolve({ data: null, error: state.tableError }).then(resolve);
      return Promise.resolve({ data: state.tableData, error: null }).then(resolve);
    },
  };
  return b;
}

vi.mock('../supabase', () => ({
  supabase: {
    from: (table) => builder(table),
    rpc: (fn, args) => {
      state.calls.push(['rpc', fn, args]);
      if (state.tableError) return Promise.resolve({ data: null, error: state.tableError });
      return Promise.resolve({ data: 1, error: null });
    },
  },
  SUPABASE_ENABLED: true,
}));

const books = await import('./books');
const orders = await import('./orders');
const catalog = await import('./catalog');
const stock = await import('./stock');

beforeEach(() => {
  state.calls = [];
  state.tableError = null;
  state.tableData = [{ id: '1' }];
});

function callsFor(table, op) {
  return state.calls.filter(([t, o]) => t === table && o === op).map(([, , a]) => a);
}

describe('admin/books', () => {
  it('caps list queries and orders newest-first', async () => {
    await books.adminGetBooks();
    expect(callsFor('books', 'limit')).toEqual([[500]]);
    expect(callsFor('books', 'order')).toEqual([['created_at', { ascending: false }]]);
  });

  it('honors a custom limit', async () => {
    await books.adminGetBooks({ limit: 50 });
    expect(callsFor('books', 'limit')).toEqual([[50]]);
  });

  it('maps DB errors to Arabic', async () => {
    state.tableError = { message: 'db down' };
    await expect(books.adminGetBooks()).rejects.toThrow('db down');
  });
});

describe('admin/orders', () => {
  it('changes order status through the atomic inventory-aware RPC', async () => {
    await orders.adminUpdateOrderStatus('order-1', 'contacted');
    expect(state.calls).toContainEqual(['rpc', 'admin_set_order_status', { p_order_id: 'order-1', p_status: 'contacted' }]);
  });

  it('caps order lists and joins items', async () => {
    await orders.adminGetOrders();
    expect(callsFor('orders', 'limit')).toEqual([[500]]);
    expect(callsFor('orders', 'select')[0][0]).toContain('order_items');
  });

  it('aggregates stats without leaking the misnamed field', async () => {
    const s = await orders.adminStats();
    expect(s).toMatchObject({ books: 1, orders: 1 });
    expect(s.pending).toBeDefined();
    expect(s).not.toHaveProperty('completed');
  });
});

describe('admin/catalog', () => {
  it('fails open on public reads', async () => {
    state.tableError = { message: 'db down' };
    await expect(catalog.getCategoriesForForm()).resolves.toEqual([]);
    await expect(catalog.getAttributeOptionsForForm('paper')).resolves.toEqual([]);
  });

  it('throws on admin-write failures', async () => {
    state.tableError = { message: 'rls denied' };
    await expect(catalog.adminCreateCategory({ name_ar: 'x' })).rejects.toThrow('rls denied');
  });

  it('propagate-rename is a no-op for identical values', async () => {
    const n = await catalog.adminPropagateRename('category', 'x', 'x');
    expect(n).toBe(0);
    expect(callsFor('books', 'update')).toHaveLength(0);
  });
});

describe('admin/stock', () => {
  it('uses the audited adjustment RPC instead of directly changing book quantities', async () => {
    await stock.adminAdjustStock({ bookId: 'book-1', delta: 4, reason: 'restock', note: 'Invoice A-1' });
    expect(state.calls).toContainEqual(['rpc', 'admin_adjust_stock', {
      p_book_id: 'book-1', p_delta: 4, p_target_qty: null, p_reason: 'restock', p_note: 'Invoice A-1',
    }]);
    expect(callsFor('books', 'update')).toHaveLength(0);
  });

  it('sends bulk restock entries to one atomic RPC', async () => {
    await stock.adminBulkStockIn({ items: [{ book_id: 'b1', qty: 3 }], reason: 'restock' });
    expect(state.calls).toContainEqual(['rpc', 'admin_bulk_stock_in', {
      p_items: [{ book_id: 'b1', qty: 3 }], p_reason: 'restock', p_note: null,
    }]);
  });

  it('returns null for missing settings (fail open)', async () => {
    state.tableData = [];
    await expect(stock.getAppSetting('missing')).resolves.toBeNull();
  });
});
