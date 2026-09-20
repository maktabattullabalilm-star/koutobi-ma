import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { whatsappLink } from '../lib/config';
import BookCover from '../components/BookCover';
import { IconCart, IconClose, IconTruck } from '../components/icons';

export default function Cart() {
  const { items, remove, setQty, count, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-pale text-brand">
          <IconCart width={28} height={28} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">سلتك فارغة 🛒</h1>
        <p className="mt-1 text-sm text-soft">تصفّح المكتبة وأضف بعض الكتب الرائعة.</p>
        <Link to="/catalog" className="btn-primary mt-6">تصفّح الكتب</Link>
        <div className="mt-6 text-sm text-soft">
          أو اطلب مباشرة عبر{' '}
          <a href={whatsappLink('السلام عليكم، أريد طلب كتاب من مكتبة كُتُبِي 📚')} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:text-brand-dark">
            واتساب
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink sm:text-3xl">سلة التسوق 🛒</h1>
      <p className="mb-6 text-sm text-soft">لديك {count} كتاب في السلة · الدفع عند الاستلام</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((it) => (
            <div key={it.id} className="card flex gap-4 border border-line/60 p-3.5">
              <Link to={`/book/${it.id}`} className="shrink-0 overflow-hidden rounded-md border border-line/50 bg-gray-100">
                <BookCover src={it.cover} alt={it.title} className="h-28 w-20 sm:h-32 sm:w-24" imgClassName="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/book/${it.id}`} className="text-sm font-bold leading-6 text-ink hover:text-brand">
                      {it.title}
                    </Link>
                    {it.author && <div className="text-xs text-soft">{it.author}</div>}
                  </div>
                  <button onClick={() => remove(it.id)} className="rounded-md p-1.5 text-gray-300 transition hover:bg-rose-50 hover:text-danger" aria-label="إزالة">
                    <IconClose width={16} height={16} />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-md border border-line">
                    <button onClick={() => setQty(it.id, it.qty + 1)} className="px-3 py-1.5 text-sm font-bold text-brand hover:bg-brand-pale" aria-label="زيادة">
                      ＋
                    </button>
                    <span className="min-w-8 border-x border-line px-2 py-1.5 text-center text-sm font-semibold text-ink">{it.qty}</span>
                    <button onClick={() => setQty(it.id, it.qty - 1)} className="px-3 py-1.5 text-sm font-bold text-brand hover:bg-brand-pale" aria-label="إنقاص">
                      −
                    </button>
                  </div>
                  <span className="text-base font-bold text-brand">{formatPrice(it.price * it.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card border border-line/60 bg-white p-5">
            <h2 className="text-lg font-bold text-ink">ملخص الطلب</h2>
            <dl className="mt-4 space-y-2 border-b border-line pb-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-soft">عدد الكتب</dt>
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
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">الإجمالي</span>
              <span className="text-xl font-bold text-brand">{formatPrice(total)}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-soft">
              <IconTruck width={14} height={14} /> الدفع نقداً عند استلام الطلب.
            </p>
            <Link to="/checkout" className="btn-primary mt-4 w-full py-3.5!">إتمام الطلب ←</Link>
            <Link to="/catalog" className="btn-ghost mt-2 w-full">متابعة التسوق</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}