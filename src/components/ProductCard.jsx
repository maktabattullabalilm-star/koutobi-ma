import { Link } from 'react-router-dom';
import { formatPrice, isSoldOut } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { IconCart } from './icons';
import BookCover from './BookCover';

export default function ProductCard({ book }) {
  const { add } = useCart();
  const { show } = useToast();
  const discounted = book.old_price != null && book.old_price > book.price;
  const discountPct = discounted ? Math.round(((book.old_price - book.price) / book.old_price) * 100) : 0;
  const soldOut = isSoldOut(book);

  return (
    <div className="group card relative flex flex-col overflow-hidden border border-line/60 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift">
      {/* cover */}
      <Link to={`/book/${book.id}`} className="relative block aspect-[680/960] overflow-hidden bg-gray-100">
        <BookCover
          src={book.cover_image}
          alt={book.title_ar}
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {discounted && (
          <span className="absolute right-2 top-2 rounded-md bg-danger px-2 py-0.5 text-xs font-bold text-white">
            خصم {discountPct}٪
          </span>
        )}
        {book.is_new && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">
            جديد
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1.5 text-center text-xs font-semibold text-white">
            نفدت الكمية
          </span>
        )}
      </Link>

      {/* body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <span className="text-[11px] font-medium text-brand">{book.category}</span>
        <Link to={`/book/${book.id}`} className="clamp-2 text-[14px] font-semibold leading-6 text-ink hover:text-brand">
          {book.title_ar}
        </Link>
        {book.author_ar && <span className="text-xs text-soft">{book.author_ar}</span>}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-base font-bold text-brand">{formatPrice(book.price)}</span>
          {discounted && <span className="text-xs text-soft line-through">{formatPrice(book.old_price)}</span>}
        </div>

        <button
          onClick={() => {
            if (soldOut) return;
            add(book);
            show('تمت الإضافة إلى السلة ✓');
          }}
          disabled={soldOut}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconCart width={16} height={16} />
          {soldOut ? 'غير متوفر' : 'أضف للسلة'}
        </button>
      </div>
    </div>
  );
}