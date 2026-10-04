import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBooks, useBundles, useCategories } from '../hooks/useCatalog';
import { useHead } from '../hooks/useHead';
import { formatPrice } from '../lib/format';
import { generalInquiryLink } from '../lib/whatsapp';
import { useSiteContact } from '../hooks/useSiteContact';
import ProductCard from '../components/ProductCard';
import { IconSearch } from '../components/icons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const SORTS = [
  { id: 'newest', label: 'الأحدث' },
  { id: 'price_asc', label: 'السعر من الأقل إلى الأعلى' },
  { id: 'price_desc', label: 'السعر من الأعلى إلى الأقل' },
  { id: 'title', label: 'الاسم أبجدياً' },
];
const PAGE_SIZE = 12;

export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const q = params.get('q') || '';
  const showAll = params.get('all') === '1';

  const { whatsapp } = useSiteContact();
  const { books, error: booksError, loading: booksLoading } = useBooks({ category, q });
  const { bundles, error: bundlesError, loading: bundlesLoading } = useBundles();
  useHead({
    title: q ? `نتائج البحث: ${q}` : category === 'all' ? 'جميع الكتب' : category,
    path: `/catalog${params.toString() ? `?${params.toString()}` : ''}`,
  });
  const { categories, error: catsError, loading: catsLoading } = useCategories();
  const loading = booksLoading || bundlesLoading || catsLoading;
  const [sort, setSort] = useState('newest');
  const error = booksError || bundlesError || catsError;

  const sorted = useMemo(() => {
    const list = [...books, ...(category === 'all' && !q ? bundles : [])];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'title') list.sort((a, b) => (a.title_ar || '').localeCompare(b.title_ar || '', 'ar'));
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [books, bundles, category, q, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const requestedPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const visibleBooks = showAll ? sorted : sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const paginationItems = getPaginationItems(currentPage, totalPages);

  const updateParams = (patch = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };

  const setPage = (page) => updateParams({ page: page <= 1 ? null : page, all: null });

  const changeCategory = (c) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    next.delete('all');
    if (c === 'all') next.delete('category');
    else next.set('category', c);
    setParams(next, { replace: true });
  };

  return (
    <div className="container-x py-8">
      {/* header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {category === 'all' ? 'جميع الكتب' : q ? 'نتائج البحث' : category}
        </h1>
        <p className="mt-1.5 text-sm text-soft">
          {q && <>نتائج البحث عن: «<bdi>{q}</bdi>» — </>}
          <bdi dir="ltr">{sorted.length}</bdi> منتج متاح · الدفع عند الاستلام
        </p>
      </div>

      {/* category chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => changeCategory('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            category === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-ink hover:bg-brand-pale'
          }`}
        >
          الكل (<bdi dir="ltr">{categories.reduce((s, c) => s + c.count, 0) || books.length}</bdi>)
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => changeCategory(c.name)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === c.name ? 'bg-brand text-white' : 'bg-gray-100 text-ink hover:bg-brand-pale'
            }`}
          >
            <bdi dir="auto">{c.name}</bdi> (<bdi dir="ltr">{c.count}</bdi>)
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        {q ? (
          <Button
            variant="link"
            onClick={() => setParams({}, { replace: true })}
            className="h-auto p-0 text-sm font-semibold"
          >
            ✕ إلغاء البحث
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="relative flex items-center gap-2">
          <span className="text-sm text-soft" id="sort-label">ترتيب حسب:</span>
            <Select value={sort} onValueChange={(value) => { setSort(value); updateParams({ page: null }); }}>
            <SelectTrigger className="w-auto" aria-labelledby="sort-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card aspect-4/5 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>
      ) : sorted.length === 0 ? (
        <Empty className="border border-line/70 bg-gray-50 px-6 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconSearch width={20} height={20} />
            </EmptyMedia>
            <EmptyTitle>لا توجد كتب مطابقة</EmptyTitle>
            <EmptyDescription>جرّب تصنيفاً آخر أو تواصل معنا عبر واتساب لطلب كتاب معيّن.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <a href={generalInquiryLink('search', whatsapp)} target="_blank" rel="noreferrer noopener">
                اطلب الكتاب عبر واتساب
              </a>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleBooks.map((b) => (
            <ProductCard key={b.id} book={b} />
          ))}
        </div>
      )}

      {!loading && !error && sorted.length > PAGE_SIZE && (
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-soft">
            عرض <bdi dir="ltr">{showAll ? sorted.length : Math.min((currentPage - 1) * PAGE_SIZE + 1, sorted.length)}–{showAll ? sorted.length : Math.min(currentPage * PAGE_SIZE, sorted.length)}</bdi> من <bdi dir="ltr">{sorted.length}</bdi> كتاباً
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5" dir="ltr" aria-label="التنقل بين صفحات الكتب">
            {!showAll && <>
              <Button type="button" variant="outline" size="sm" aria-label="الصفحة الأولى" onClick={() => setPage(1)} disabled={currentPage === 1}>|‹</Button>
              <Button type="button" variant="outline" size="sm" aria-label="الصفحة السابقة" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>‹</Button>
              {paginationItems.map((item, index) => typeof item === 'number' ? (
                <Button key={item} type="button" variant={currentPage === item ? 'default' : 'outline'} size="sm" aria-current={currentPage === item ? 'page' : undefined} aria-label={`الصفحة ${item}`} onClick={() => setPage(item)}>{item}</Button>
              ) : <span key={`${item}-${index}`} className="px-1 text-sm text-soft" aria-hidden="true">…</span>)}
              <Button type="button" variant="outline" size="sm" aria-label="الصفحة التالية" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>›</Button>
              <Button type="button" variant="outline" size="sm" aria-label="الصفحة الأخيرة" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>›|</Button>
            </>}
            <Button type="button" variant={showAll ? 'default' : 'outline'} size="sm" aria-pressed={showAll} onClick={() => updateParams({ all: showAll ? null : '1', page: null })}>
              {showAll ? 'عرض الصفحات' : 'عرض الكل'}
            </Button>
          </div>
        </div>
      )}

      {/* sample prices strip */}
      {sorted.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
          <span>الكتب تبدأ من</span>
          <span className="font-bold text-brand">{formatPrice(Math.min(...sorted.map((b) => b.price)))}</span>
        </div>
      )}
    </div>
  );
}
