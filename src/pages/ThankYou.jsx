import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import { whatsappLink } from '../lib/config';
import { IconWhatsApp } from '../components/icons';

export default function ThankYou() {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('koutobi_last_order');
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }, []);

  const orderId = order?.id;

  return (
    <div className="container-x py-14 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-light text-brand">
        <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>

      <h1 className="mt-5 text-2xl font-bold text-ink sm:text-3xl">شكراً لك! تم استلام طلبك 🎉</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-soft">
        سيصلك اتصال من فريقنا لتأكيد الطلب وتحديد التفاصيل.
        {order?.demo && (
          <span className="mt-1 block rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            ⚠️ أنت الآن في الوضع التجريبي — لم يتم حفظ الطلب في قاعدة البيانات.
          </span>
        )}
      </p>

      {orderId && (
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-card border border-line/70 bg-gray-50 px-5 py-3 text-sm">
          <span className="text-soft">رقم الطلب: </span>
          <span className="font-bold text-brand" dir="ltr">{orderId}</span>
        </div>
      )}

      {order?.total != null && (
        <p className="mt-3 text-sm text-soft">
          الإجمالي المطلوب عند الاستلام: <span className="font-bold text-ink">{formatPrice(order.total)}</span>
        </p>
      )}

      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={whatsappLink(
            `السلام عليكم، أؤكد طلبي رقم ${orderId || ''} ${order?.name ? `باسم ${order.name}` : ''} ${order?.phone ? `(${order.phone})` : ''}.`
          )}
          target="_blank"
          rel="noreferrer"
          className="btn-primary bg-[#25D366]! sm:flex-1"
        >
          <IconWhatsApp /> تأكيد أسرع عبر واتساب
        </a>
        <Link to="/catalog" className="btn-ghost sm:flex-1">
          متابعة التسوق
        </Link>
      </div>

      <div className="mx-auto mt-10 grid max-w-lg gap-3 text-start sm:grid-cols-3">
        {[
          { t: '📞 اتصال تأكيدي', d: 'سنتصل بك قريباً' },
          { t: '🚚 التوصيل', d: 'لكل المدن المغربية' },
          { t: '💵 الدفع عند الاستلام', d: 'بدون بطاقة بنكية' },
        ].map((s) => (
          <div key={s.t} className="rounded-card border border-line/60 bg-gray-50 p-4">
            <div className="text-sm font-bold text-ink">{s.t}</div>
            <div className="mt-0.5 text-xs text-soft">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}