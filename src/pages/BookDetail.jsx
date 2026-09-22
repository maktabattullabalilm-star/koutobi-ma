import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBook, getRelatedBooks } from '../lib/api';
import { getAppSetting } from '../lib/admin';
import { formatPrice, isSoldOut } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import ProductCard from '../components/ProductCard';
import BookCover from '../components/BookCover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconBook, IconCart, IconHeadset } from '../components/icons';

function Spec({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-line/70 py-2.5 last:border-0">
      <dt className="text-sm text-soft">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [showQtyDefault, setShowQtyDefault] = useState('hide');
  const { add } = useCart();
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getAppSetting('show_quantity_default').then(setShowQtyDefault).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setBook(null);
    setActiveImg(0);
    getBook(id)
      .then(async (b) => {
        if (!b) {
          setError('الكتاب غير موجود.');
          return;
        }
        setBook(b);
        try {
          setRelated(await getRelatedBooks(b));
        } catch { /* ignore */ }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-x grid gap-8 py-10 lg:grid-cols-2">
        <div className="mx-auto aspect-2/3 w-full max-w-sm animate-pulse rounded-card bg-gray-100" />
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-8 w-3/4 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-5 w-1/3 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-20 w-full animate-pulse rounded-sm bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container-x py-16 text-center">
        <IconBook className="mx-auto text-gray-300" width={44} height={44} />
        <h1 className="mt-3 text-lg font-bold text-ink">{error || 'الكتاب غير موجود'}</h1>
        <Button asChild className="mt-5">
          <Link to="/catalog">العودة إلى المكتبة</Link>
        </Button>
      </div>
    );
  }

  const discounted = book.old_price != null && book.old_price > book.price;
  const discountPct = discounted ? Math.round(((book.old_price - book.price) / book.old_price) * 100) : 0;
  const gallery = book.images && book.images.length ? book.images : [{ url: book.cover_image }];
  const current = gallery[Math.min(activeImg, gallery.length - 1)];
  const soldOut = isSoldOut(book);

  /** Resolve whether to show quantity for this book. */
  const resolveShowQty = () => {
    if (book.show_quantity === 'show') return true;
    if (book.show_quantity === 'hide') return false;
    return showQtyDefault === 'show';
  };
  const showQty = resolveShowQty();
  const inStock = (book.stock_qty ?? 0) > 0;

  return (
    <div className="container-x py-8">
      {/* breadcrumb */}
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-soft">
        <Link to="/" className="hover:text-brand">الرئيسية</Link>
        <span>/</span>
        <Link to="/catalog" className="hover:text-brand">الكتب</Link>
        {book.category && (
          <>
            <span>/</span>
            <Link to={`/catalog?category=${encodeURIComponent(book.category)}`} className="hover:text-brand">{book.category}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-card border border-line/60 shadow-card">
            <BookCover src={current.url} alt={book.title_ar} eager className="aspect-680/960 w-full" imgClassName="h-full w-full object-cover" />
            {discounted && (
              <span className="absolute right-3 top-3 rounded-md bg-danger px-2.5 py-1 text-sm font-bold text-white">
                خصم {discountPct}٪
              </span>
            )}
            {book.is_new && (
              <span className="absolute left-3 top-3 rounded-md bg-brand px-2.5 py-1 text-sm font-bold text-white">
                جديد
              </span>
            )}
            {soldOut && (
              <span className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-sm font-bold text-white">
                نفدت الكمية حالياً
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mx-auto mt-3 flex max-w-md justify-center gap-2">
              {gallery.map((g, ix) => (
                <button
                  key={g.id || ix}
                  type="button"
                  onClick={() => setActiveImg(ix)}
                  aria-label={`صورة ${ix + 1}`}
                  className={`overflow-hidden rounded-md border-2 transition ${
                    ix === Math.min(activeImg, gallery.length - 1)
                      ? 'border-brand'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <BookCover src={g.url} alt="" className="h-16 w-12" imgClassName="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div>
          <span className="inline-block rounded-full bg-brand-pale px-3 py-1 text-xs font-bold text-brand">{book.category}</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-3xl">{book.title_ar}</h1>
          {book.subtitle_ar && <p className="mt-1 text-base text-soft">{book.subtitle_ar}</p>}
          {book.author_ar && <p className="mt-2 text-sm font-semibold text-ink">تأليف: <span className="text-brand">{book.author_ar}</span></p>}
          {book.publisher_ar && <p className="mt-1 text-sm text-soft">الناشر: {book.publisher_ar}</p>}

          {/* price */}
          <Card className="mt-5 flex-row items-center gap-3 border-line/70 bg-gray-50 p-4">
            <span className="text-2xl font-bold tabular-nums text-brand">{formatPrice(book.price)}</span>
            {discounted && <span className="text-base tabular-nums text-soft line-through">{formatPrice(book.old_price)}</span>}
            <span className="ms-auto rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand">الدفع عند الاستلام</span>
          </Card>

          {/* stock visibility */}
          {showQty && (
            <p className="mt-2 text-sm font-medium flex items-center gap-2"
              style={{ color: inStock ? (book.stock_qty <= 5 ? '#dc2626' : '#35724E') : '#dc2626' }}>
              {inStock
                ? `المتوفر: ${book.stock_qty} ${book.stock_qty <= 5 ? '⚠️ بقي قليل' : ''}`
                : 'غير متوفر حالياً'}
            </p>
          )}

          <p className="mt-3 text-xs text-soft">الضريبة مضمنة في السعر · التوصيل يُحسب عند تأكيد الطلب هاتفياً.</p>

          {/* actions */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => { add(book); show('تمت الإضافة إلى السلة ✓'); }}
              disabled={soldOut}
              className="flex-1 px-6 py-3"
            >
              <IconCart width={18} height={18} />
              {soldOut ? 'غير متوفر' : 'أضف للسلة'}
            </Button>
            <Button
              onClick={() => { add(book); navigate('/checkout'); }}
              disabled={soldOut}
              className="flex-1 bg-amber-400 px-6 py-3 text-sm font-bold text-brand-dark hover:bg-amber-300"
            >
              اطلب الآن
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-md bg-brand-pale px-4 py-3 text-sm text-brand-dark">
            <IconHeadset width={18} height={18} />
            عند إتمام طلبك، سيتواصل معك فريقنا هاتفياً لتأكيد العنوان والدفع عند الاستلام.
          </div>

          {/* description */}
          {book.description_ar && (
            <section className="mt-7">
              <h2 className="text-lg font-bold text-ink">التفاصيل</h2>
              <Card className="mt-2 border-line/70 bg-white p-4 text-sm leading-7 text-ink">{book.description_ar}</Card>
            </section>
          )}

          {/* specs */}
          <section className="mt-7">
            <h2 className="text-lg font-bold text-ink">بيانات الطبعة</h2>
            <Card className="mt-3 border-line/70 p-4">
            <dl>
              <Spec label="المؤلف" value={book.author_ar} />
              <Spec label="الناشر" value={book.publisher_ar} />
              <Spec label="الصفحات" value={book.pages ? `${book.pages} صفحة` : null} />
              <Spec label="المقاس" value={book.size_ar} />
              <Spec label="التجليد" value={book.binding_ar} />
              <Spec label="الورق" value={book.paper_ar} />
              <Spec label="الطبعة" value={book.edition_ar} />
              <Spec label="الرقم المعياري ISBN" value={book.isbn} />
            </dl>
            </Card>
          </section>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title">كتب قد تعجبك أيضاً</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((b) => (
              <ProductCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}