import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { generalInquiryLink } from '../lib/whatsapp';
import { useSiteContact } from '../hooks/useSiteContact';
import BookCover from '../components/BookCover';
import PackCover from '../components/PackCover';
import { IconCart, IconClose, IconTruck } from '../components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Cart() {
  const { items, remove, setQty, count, total } = useCart();
  const { whatsapp } = useSiteContact();
  const productPath = (item) => item.product_type === 'bundle' ? `/pack/${item.id}` : `/book/${item.id}`;

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-pale text-brand">
          <IconCart width={28} height={28} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">سلتك فارغة</h1>
        <p className="mt-1 text-sm text-soft">تصفّح المكتبة وأضف بعض الكتب الرائعة.</p>
        <Button asChild className="mt-6">
          <Link to="/catalog">تصفّح الكتب</Link>
        </Button>
        <div className="mt-6 text-sm text-soft">
          أو اطلب مباشرة عبر{' '}
          <a
            href={generalInquiryLink('book', whatsapp)}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-brand hover:text-brand-dark"
          >
            واتساب
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink sm:text-3xl">سلة التسوق</h1>
      <p className="mb-6 text-sm text-soft">لديك <bdi dir="ltr">{count}</bdi> منتج في السلة · الدفع عند الاستلام</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((it) => (
            <Card key={it.id} className="flex-row gap-4 border-line/60 p-3.5">
              <Link
                to={productPath(it)}
                className="shrink-0 overflow-hidden rounded-md border border-line/50 bg-gray-100"
              >
                {it.product_type === 'bundle' ? <PackCover pack={it} alt={it.title} className="h-28 w-20 sm:h-32 sm:w-24" /> : <BookCover src={it.cover} alt={it.title} className="h-28 w-20 sm:h-32 sm:w-24" imgClassName="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={productPath(it)}
                      dir="auto"
                      className="text-sm font-bold leading-6 text-ink hover:text-brand"
                    >
                      {it.title}
                    </Link>
                    {it.product_type === 'bundle' ? <div className="text-xs text-soft">باقة كتب</div> : it.author && <div dir="auto" className="text-xs text-soft">{it.author}</div>}
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    className="rounded-md p-2.5 text-gray-500 transition hover:bg-rose-50 hover:text-danger"
                    aria-label={`إزالة ${it.title} من السلة`}
                  >
                    <IconClose width={16} height={16} />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-md border border-line">
                    <button
                      onClick={() => setQty(it.id, it.qty + 1)}
                      className="min-h-11 min-w-11 px-3 py-1.5 text-sm font-bold text-brand hover:bg-brand-pale"
                      aria-label={`زيادة كمية ${it.title}`}
                    >
                      ＋
                    </button>
                    <span
                      className="min-w-8 border-x border-line px-2 py-1.5 text-center text-sm font-semibold text-ink"
                      aria-live="polite"
                      aria-label={`الكمية: ${it.qty}`}
                    >
                      <bdi dir="ltr">{it.qty}</bdi>
                    </span>
                    <button
                      onClick={() => setQty(it.id, it.qty - 1)}
                      className="min-h-11 min-w-11 px-3 py-1.5 text-sm font-bold text-brand hover:bg-brand-pale"
                      aria-label={`إنقاص كمية ${it.title}`}
                    >
                      −
                    </button>
                  </div>
                  <span className="text-base font-bold text-brand">{formatPrice(it.price * it.qty)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-line/60 bg-white p-5">
            <h2 className="text-lg font-bold text-ink">ملخص الطلب</h2>
            <dl className="mt-4 space-y-2 border-b border-line pb-4 text-sm">
              <div className="flex justify-between">
                  <dt className="text-soft">عدد المنتجات</dt>
                <dd className="font-semibold text-ink">{count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-soft">المجموع الفرعي</dt>
                <dd className="font-semibold text-ink">{formatPrice(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-soft">التوصيل</dt>
                <dd className="font-medium text-soft">يُتحقق هاتفياً</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between" aria-live="polite">
              <span className="text-sm font-bold text-ink">الإجمالي</span>
              <span className="text-xl font-bold text-brand">{formatPrice(total)}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-soft">
              <IconTruck width={14} height={14} /> الدفع نقداً عند استلام الطلب.
            </p>
            <Button asChild className="mt-4 w-full py-3.5">
              <Link to="/checkout">إتمام الطلب ←</Link>
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link to="/catalog">متابعة التسوق</Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
