import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const CartCtx = createContext(null);
const STORAGE_KEY = 'koutobi_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = useCallback((book, qty = 1) => {
    const stock = book.stock_qty ?? 99;
    const maxQty = Math.min(Math.max(stock, 0), 99);
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
        const maxQty = Math.min(i.stock ?? 99, 99);
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