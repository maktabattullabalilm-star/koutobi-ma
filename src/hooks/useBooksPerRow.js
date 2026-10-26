import { useEffect, useState } from 'react';
import { DEFAULT_BOOKS_PER_ROW, getBooksPerRow, parseBooksPerRow } from '../lib/siteSettings';

const STORAGE_KEY = 'koutobi:books_per_row';

/** Read the last value synchronously so the first paint uses the right grid. */
function cachedBooksPerRow() {
  if (typeof window === 'undefined') return DEFAULT_BOOKS_PER_ROW;
  try {
    return parseBooksPerRow(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_BOOKS_PER_ROW;
  }
}

export function useBooksPerRow() {
  const [booksPerRow, setBooksPerRow] = useState(cachedBooksPerRow);

  useEffect(() => {
    let alive = true;
    getBooksPerRow().then((value) => {
      if (!alive) return;
      setBooksPerRow(value);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        // private mode / storage disabled — the DB value still applies
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return booksPerRow;
}
