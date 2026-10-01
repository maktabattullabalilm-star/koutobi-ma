import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { CART_MAX_QTY, CART_STORAGE_VERSION, STORAGE_KEYS } from '../lib/constants';

const CartCtx = createContext(null);
const STORAGE_KEY = STORAGE_KEYS.cart;

function sanitizeItems(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (i) =>
      i &&
      typeof i.id === 'string' &&
      typeof i.title === 'string' &&
      Number.isFinite(Number(i.price)) &&
      Number.isInteger(i.qty) &&
      i.qty >= 1 &&
      i.qty <= CART_MAX_QTY
  );
}

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === CART_STORAGE_VERSION) return sanitizeItems(parsed.items);
    }
    // One-time migration from the unversioned v1 shape (raw array).
    const legacy = localStorage.getItem(STORAGE_KEYS.cartLegacy);
    if (legacy) {
      const items = sanitizeItems(JSON.parse(legacy));
      localStorage.removeItem(STORAGE_KEYS.cartLegacy);
      return items;
    }
  } catch {
    /* corrupt → start empty */
  }
  return [];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CART_STORAGE_VERSION, items }));
    } catch {
      /* ignore (private mode quota) */
    }
  }, [items]);

  // Cross-tab sync: another tab's write replaces our items.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.version === CART_STORAGE_VERSION) setItems(sanitizeItems(parsed.items));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((book, qty = 1) => {
    const stock = book.stock_qty ?? CART_MAX_QTY;
    const maxQty = Math.min(Math.max(stock, 0), CART_MAX_QTY);
    if (maxQty < 1 || qty < 1) return false;
    setItems((prev) => {
      const found = prev.find((i) => i.id === book.id);
      if (found) {
        return prev.map((i) => (i.id === book.id ? { ...i, qty: Math.min(i.qty + qty, maxQty) } : i));
      }
      return [
        ...prev,
        {
          id: book.id,
          title: book.title_ar,
          author: book.author_ar,
          price: Number(book.price || 0),
          cover: book.cover_image,
          stock: stock,
          qty: Math.min(Math.max(qty, 1), maxQty),
        },
      ];
    });
    return true;
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);

  const setQty = useCallback((id, qty) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const maxQty = Math.min(i.stock ?? CART_MAX_QTY, CART_MAX_QTY);
        return { ...i, qty: Math.min(qty, maxQty) };
      })
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const value = useMemo(
    () => ({ items, add, remove, setQty, clear, count, total }),
    [items, add, remove, setQty, clear, count, total]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
