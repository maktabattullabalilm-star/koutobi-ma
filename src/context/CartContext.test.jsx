import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const BOOK_A = {
  id: 'book-a',
  title_ar: 'الداء والدواء',
  author_ar: 'ابن القيم',
  price: 70,
  cover_image: 'https://example.com/a.jpg',
};
const BOOK_B = { id: 'book-b', title_ar: 'حصن المسلم', author_ar: 'القحطاني', price: '15', cover_image: '/b.svg' };

let api;
function Probe() {
  api = useCart();
  return null;
}

function renderCart() {
  api = undefined;
  render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );
  if (!api) throw new Error('cart api not captured');
  return api;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('CartProvider', () => {
  it('starts empty', () => {
    const cart = renderCart();
    expect(cart.items).toEqual([]);
    expect(cart.count).toBe(0);
    expect(cart.total).toBe(0);
  });

  it('adds a book and computes count/total', () => {
    renderCart();
    act(() => api.add(BOOK_A));
    expect(api.items).toHaveLength(1);
    expect(api.items[0]).toMatchObject({ id: 'book-a', title: 'الداء والدواء', qty: 1, price: 70 });
    expect(api.count).toBe(1);
    expect(api.total).toBe(70);
  });

  it('merges quantities when adding the same book twice', () => {
    renderCart();
    act(() => {
      api.add(BOOK_A);
      api.add(BOOK_A, 2);
    });
    expect(api.items).toHaveLength(1);
    expect(api.items[0].qty).toBe(3);
    expect(api.count).toBe(3);
  });

  it('caps quantity at 99', () => {
    renderCart();
    act(() => api.add(BOOK_A, 150));
    expect(api.items[0].qty).toBe(99);
    act(() => api.setQty('book-a', 500));
    expect(api.items[0].qty).toBe(99);
  });

  it('casts string prices to numbers', () => {
    renderCart();
    act(() => api.add(BOOK_B, 2));
    expect(api.items[0].price).toBe(15);
    expect(api.total).toBe(30);
  });

  it('removes items and clears the cart', () => {
    renderCart();
    act(() => {
      api.add(BOOK_A);
      api.add(BOOK_B);
    });
    expect(api.count).toBe(2);
    act(() => api.remove('book-a'));
    expect(api.items.map((i) => i.id)).toEqual(['book-b']);
    act(() => api.clear());
    expect(api.items).toEqual([]);
    expect(api.count).toBe(0);
  });

  it('ignores setQty below 1', () => {
    renderCart();
    act(() => api.add(BOOK_A, 2));
    act(() => api.setQty('book-a', 0));
    expect(api.items[0].qty).toBe(2);
  });

  it('persists to localStorage and restores on mount', () => {
    renderCart();
    act(() => api.add(BOOK_A, 2));
    const stored = JSON.parse(localStorage.getItem('koutobi_cart_v1'));
    expect(stored).toHaveLength(1);
    expect(stored[0].qty).toBe(2);

    // Remount reads the persisted cart back.
    const cart2 = renderCart();
    expect(cart2.items).toHaveLength(1);
    expect(cart2.count).toBe(2);
  });

  it('recovers from corrupt localStorage', () => {
    localStorage.setItem('koutobi_cart_v1', '{not-json');
    const cart = renderCart();
    expect(cart.items).toEqual([]);
  });

  it('throws outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useCart must be used within <CartProvider>');
    spy.mockRestore();
  });

  it('renders children', () => {
    render(
      <CartProvider>
        <span>hello-store</span>
      </CartProvider>
    );
    expect(screen.getByText('hello-store')).toBeTruthy();
  });
});
