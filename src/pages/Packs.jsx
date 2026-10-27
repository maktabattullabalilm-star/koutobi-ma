import { useBundles } from '../hooks/useCatalog';
import { useHead } from '../hooks/useHead';
import { useBooksPerRow } from '../hooks/useBooksPerRow';
import { booksGridClass } from '../lib/booksGrid';
import ProductCard from '../components/ProductCard';
import { IconBook } from '../components/icons';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default function Packs() {
  useHead({ title: 'الباقات', path: '/packs' });
  const { bundles, error, loading } = useBundles();
  const booksPerRow = useBooksPerRow();

  return (
    <div className="container-x py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">الباقات</h1>
        <p className="mt-1.5 text-sm text-soft">
          <bdi dir="ltr">{bundles.length}</bdi> باقة متاحة · الدفع عند الاستلام
        </p>
      </div>

      {loading ? (
        <div className={booksGridClass(booksPerRow)}>
          {Array.from({ length: booksPerRow }).map((_, i) => (
            <div key={i} className="card aspect-4/5 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>
      ) : bundles.length === 0 ? (
        <Empty className="border border-line/70 bg-gray-50 px-6 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconBook width={20} height={20} />
            </EmptyMedia>
            <EmptyTitle>لا توجد باقات متاحة حالياً</EmptyTitle>
            <EmptyDescription>تفقّد الصفحة لاحقاً أو تصفّح الكتب.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={booksGridClass(booksPerRow)}>
          {bundles.map((bundle) => (
            <ProductCard key={bundle.id} book={bundle} />
          ))}
        </div>
      )}
    </div>
  );
}
