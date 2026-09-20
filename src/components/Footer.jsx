import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCategories } from '../lib/api';
import { PHONE_DISPLAY, WHATSAPP_NUMBER, whatsappLink } from '../lib/config';
import { IconWhatsApp, IconPhone, IconPaperPlane } from './icons';

export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);
  return (
    <footer className="mt-16 border-t border-line bg-gray-50">
      {/* contact strip */}
      <div className="border-b border-line bg-brand-pale">
        <div className="container-x flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <h3 className="text-lg font-bold text-ink">خدمة العملاء متواجدة لمساعدتكم 🌱</h3>
            <p className="text-sm text-soft">اطلب عبر الموقع وسنتصل بك لتأكيد الطلب والتوصيل.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={whatsappLink('السلام عليكم، أريد الاستفسار عن الطلب 🛒')} target="_blank" rel="noreferrer" className="btn-primary bg-brand!">
              <IconWhatsApp /> واتساب
            </a>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className="btn-ghost">
              <IconPhone /> {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </div>

      <div className="container-x grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">ك</span>
            <span className="text-xl font-bold">
              <span className="text-brand">كُتُبِي</span>
              <span className="text-ink">.ما</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-soft">
            مكتبة إسلامية متخصصة في الكتب العربية الأصيلة. نوصل الكتب إلى باب منزلك والدفع عند الاستلام.
          </p>
          <div className="mt-4 flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-xs text-soft">
            🚚 شحن متاح لجميع المدن المغربية — الدفع نقداً عند التسليم
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">التصنيفات</h4>
          <ul className="space-y-2 text-sm text-soft">
            {categories.map((c) => (
              <li key={c.name}>
                <Link to={`/catalog?category=${encodeURIComponent(c.name)}`} className="hover:text-brand">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">روابط مهمة</h4>
          <ul className="space-y-2 text-sm text-soft">
            <li><Link to="/catalog" className="hover:text-brand">كل الكتب</Link></li>
            <li><Link to="/cart" className="hover:text-brand">سلة التسوق</Link></li>
            <li><a href="#how" className="hover:text-brand">كيف أطلب؟</a></li>
            <li><Link to="/admin" className="hover:text-brand">لوحة التحكم</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">تواصل معنا</h4>
          <ul className="space-y-2.5 text-sm text-soft">
            <li><a href={whatsappLink()} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brand"><IconWhatsApp width={16} height={16} /> واتساب</a></li>
            <li><a href={`tel:+${WHATSAPP_NUMBER}`} className="flex items-center gap-2 hover:text-brand"><IconPhone width={16} height={16} /> {PHONE_DISPLAY}</a></li>
            <li><a href="mailto:salam@koutobi.ma" className="flex items-center gap-2 hover:text-brand"><IconPaperPlane width={16} height={16} /> salam@koutobi.ma</a></li>
          </ul>
          <div className="mt-4 flex gap-2">
            {[
              { label: 'فيسبوك', href: '#' },
              { label: 'إنستغرام', href: '#' },
              { label: 'تيك توك', href: '#' },
            ].map((s) => (
              <a key={s.label} href={s.href} className="rounded-md border border-line bg-white px-3 py-1.5 text-xs text-soft hover:border-brand hover:text-brand">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-gray-400 sm:flex-row">
          <span>© {new Date().getFullYear()} مكتبة كُتُبِي.ما — جميع الحقوق محفوظة</span>
          <span>الدفع عند الاستلام 🛍️ | توصيل لجميع المدن 🚚</span>
        </div>
      </div>
    </footer>
  );
}