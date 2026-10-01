import { useCallback, useEffect, useRef, useState } from 'react';
import { getBook, getBooks, getCategories } from '../lib/api';

/**
 * Shared storefront data hooks (docs/backlog/21). One loading/error shape
 * everywhere — replaces the per-page useEffect+useState+Promise.all copies.
 */

function useAsync(fetchFn, args) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // `key` is the serialized args: the effect re-fetches only when the request
  // VALUE changes, while the callback always reads the latest args via ref.
  const key = JSON.stringify(args);
  const argsRef = useRef(args);
  argsRef.current = args;

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    fetchFn(...argsRef.current)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || 'تعذّر تحميل البيانات'))
      .finally(() => setLoading(false));
  }, [fetchFn]);

  useEffect(() => {
    reload();
  }, [reload, key]);

  return { data, error, loading, reload };
}

export function useBooks({ category, q } = {}) {
  const { data, error, loading, reload } = useAsync(getBooks, [{ category, q }]);
  return { books: data || [], error, loading, reload };
}

export function useBook(id) {
  const { data, error, loading, reload } = useAsync(getBook, [id]);
  return { book: data, error, loading, reload };
}

export function useCategories() {
  const { data, error, loading, reload } = useAsync(getCategories, []);
  return { categories: data || [], error, loading, reload };
}
