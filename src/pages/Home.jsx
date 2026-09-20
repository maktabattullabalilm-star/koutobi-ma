import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks, getCategories } from '../lib/api';
import { whatsappLink } from '../lib/config';
import ProductCard from '../components/ProductCard';
import { IconBook, IconCart, IconCash, IconHeadset, IconHeart, IconShield, IconStar, IconTruck, IconWhatsApp } from '../components/icons';

const CATEGORY_STYLE = {
  'العقيدة والتوحيد': 'bg-emerald-100 text-emerald-700',
  'التفسير وعلوم القرآن': 'bg-teal-100 text-teal-700',
  'الفقه وأصوله': 'bg-indigo-100 text-indigo-700',
  'الحديث وعلومه': 'bg-amber-100 text-amber-700',
  'الرقائق والأخلاق': 'bg-rose-100 text-rose-700',
  'الأذكار والأدعية': 'bg-sky-100 text-sky-700',
};
const CATEGORY_ICON = {
  'العقيدة والتوحيد': IconShield,
  'التفسير وعلوم القرآن': IconBook,
  'الفقه وأصوله': IconCash,
  'الحديث وعلومه': IconStar,
  'الرقائق والأخلاق': IconHeart,
  'الأذكار والأدعية': IconHeadset,
};

export default function Home() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getBooks(), getCategories()])
      .then(([b, c]) => {
        setBooks(b);
        setCategories(c.length ? c : []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const featured = books.filter((b) => b.is_featured).slice(0, 8);
  const newest = [...books].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

  return (
    <div>
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-bl from-brand-dark via-brand to-brand-dark text-white">
        <div className="container-x grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              📚 كتب عربية أصيلة — بأسعار مناسبة
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-[42px]">
              مكتبة الكتب الإسلامية
              <br />
              في خدمتكم من قلب المغرب 🇲🇦
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              اختر كتابك المفضّل، أرسل اسمك وهاتفك وعنوانك، وسنتصل بك لتأكيد الطلب وتوصيله إلى باب منزلك.
              <span className="font-semibold text-white"> الدفع عند الاستلام — بدون بطاقة بنكية.</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/catalog" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-6 py-3 text-sm font-bold text-brand-dark shadow transition hover:bg-amber-300">
                تسوّق الكتب <span aria-hidden>←</span>
              </Link>
              <Link to="/#how" className="inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                كيف أطلب؟
              </Link>
            </div>

            <div className="mt-8 flex gap-6 text-center">
              {[
                { k: '100%', v: 'دفع عند الاستلام' },
                { k: '+500', v: 'عنوان رقمي مختار' },
                { k: '24/7', v: 'دعم عبر واتساب' },
              ].map((s) => (
                <div key={s.k} className="border-r border-white/20 pe-6 last:border-0 last:pe-0">
                  <div className="text-xl font-bold text-amber-300">{s.k}</div>
                  <div className="mt-0.5 text-xs text-white/75">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* hero books collage */}
          <div className="hidden lg:grid grid-cols-3 gap-4">
            {books.slice(0, 3).map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className={`overflow-hidden rounded-card shadow-xl ring-1 ring-white/20 transition hover:-translate-y-1 ${b.is_out_of_stock ? 'opacity-95' : ''}`}>
                <img src={b.cover_image} alt={b.title_ar} className="aspect-[680/960] w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {error && <div className="container-x mt-4 rounded-md bg-rose-50 px-4 py-2 text-sm text-danger">{error}</div>}

      {/* ================= CATEGORIES ================= */}
      <section className="container-x py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="section-title !mb-1">تصنيفات شائعة</h2>
            <p className="text-sm text-soft">اختر تصنيفك المفضّل لاستكشاف الكتب</p>
          </div>
          <Link to="/catalog" className="hidden text-sm font-semibold text-brand hover:text-brand-dark sm:block">
            عرض الكل ←
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const Icon = CATEGORY_ICON[c.name] || IconBook;
            const style = CATEGORY_STYLE[c.name] || 'bg-brand-pale text-brand';
            return (
              <Link
                key={c.name}
                to={`/catalog?category=${encodeURIComponent(c.name)}`}
                className="group card flex flex-col items-center gap-3 border border-line/60 p-5 text-center transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${style}`}>
                  <Icon width={24} height={24} />
                </span>
                <span className="text-sm font-semibold text-ink group-hover:text-brand">{c.name}</span>
                <span className="text-xs text-soft">{c.count} كتب</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= NEW RELEASES ================= */}
      <section className="bg-brand-pale py-12">
        <div className="container-x">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="section-title !mb-1">أحدث الإصدارات 📖</h2>
              <p className="text-sm text-soft">جديدنا الذي وصل حديثاً إلى المكتبة</p>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-brand hover:text-brand-dark">
              عرض الكل ←
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newest.map((b) => (
              <ProductCard key={b.id} book={b} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED ================= */}
      <section className="container-x py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="section-title !mb-1">الكتب الأكثر مبيعاً ⭐</h2>
            <p className="text-sm text-soft">تشكيلة مميّزة يفضّلها طلاب العلم</p>
          </div>
          <Link to="/catalog" className="text-sm font-semibold text-brand hover:text-brand-dark">
            عرض الكل ←
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((b) => (
            <ProductCard key={b.id} book={b} />
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="container-x scroll-mt-24 pb-4">
        <div className="rounded-2xl border border-line/70 bg-white p-8 shadow-card sm:p-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">كيف أطلب من كُتُبِي؟ 🛍️</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-soft">
              طريقة الطلب بسيطة جداً ولا تتطلب حساباً أو بطاقة بنكية — الدفع عند الاستلام.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { n: '١', t: 'اختر كتبك', d: 'أضف الكتب إلى السلة من صفحات المتجر، ثم انتقل إلى إتمام الطلب.', Icon: IconCart },
              { n: '٢', t: 'أدخل بياناتك', d: 'أرسل اسمك، رقم هاتفك، وعنوان التوصيل في صفحة الطلب.', Icon: IconHeadset },
              { n: '٣', t: 'نقوم بالباقي', d: 'سنتصل بك لتأكيد الطلب، وتوصيله إلى باب منزلك — تدفع عند الاستلام.', Icon: IconTruck },
            ].map((s, i) => (
              <div key={s.n} className="relative rounded-card border border-line bg-white p-6 text-center">
                {i < 2 && <span className="absolute -left-3 top-1/2 hidden -translate-y-1/2 text-2xl text-line sm:block">←</span>}
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
                  <s.Icon width={24} height={24} />
                </span>
                <span className="mt-3 block text-xs font-bold text-brand">الخطوة {s.n}</span>
                <h3 className="mt-1 text-lg font-bold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-6 text-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { Icon: IconCash, t: 'الدفع عند الاستلام', d: 'ادفع عند استلام كتابك' },
            { Icon: IconTruck, t: 'توصيل سريع', d: 'لجميع المدن المغربية' },
            { Icon: IconHeart, t: 'كتب مختارة', d: 'جودة وأصالة المتحقق' },
            { Icon: IconHeadset, t: 'دعم واتساب', d: 'نجيب على استفساراتك' },
          ].map((f) => (
            <div key={f.t} className="card flex items-center gap-3 border border-line/60 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <f.Icon width={24} height={24} />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">{f.t}</div>
                <div className="text-xs text-soft">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="bg-brand-pale py-12">
        <div className="container-x">
          <h2 className="section-title text-center">آراء عملائنا 💬</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: 'أم يوسف — الدار البيضاء', txt: 'طلبت كتابين، وكّلتهم بجودة التغليف والتوصيل. وصلنا في يومين والدفع عند الاستلام ريّحني كثيراً.', book: 'حصن المسلم' },
              { name: 'محمد — مراكش', txt: 'تجربة ممتازة، تواصلوا معي هاتفياً لتأكيد الطلب كما وعدوا. الكتب أصلية والمصاريف واضحة.', book: 'تيسير الكريم الرحمن' },
              { name: 'أبوعبدالله — فاس', txt: 'أفضل ما يميزهم الردّ السريع على واتساب والأسعار المعقولة. نصحني الأخ أن أخد «الداء والدواء» ولم أندم.', book: 'الداء والدواء' },
            ].map((t) => (
              <figure key={t.name} className="card flex flex-col border border-line/60 p-5">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M12 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.8 3 1.1-6.5L2.6 8.8l6.5-.9L12 2z" /></svg>
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-7 text-ink">«{t.txt}»</blockquote>
                <figcaption className="mt-4 border-t border-line pt-3 text-sm">
                  <span className="font-bold text-brand">{t.name}</span>
                  <span className="ms-2 text-xs text-soft">— طلب: {t.book}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BOTTOM CTA ================= */}
      <section className="container-x py-14">
        <div className="rounded-2xl bg-gradient-to-bl from-brand-dark to-brand p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">جاهز لاقتناء كتابك المفضّل؟ 📚</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
            تصفّح المكتبة، اختر كتبك، وأرسل بياناتك — وسنتواصل معك لتأكيد الطلب.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/catalog" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-6 py-3 text-sm font-bold text-brand-dark transition hover:bg-amber-300">
              تصفّح المكتبة
            </Link>
            <a href={whatsappLink('السلام عليكم، أريد طلب كتاب من مكتبة كُتُبِي 📚')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <IconWhatsApp /> اطلب عبر واتساب
            </a>
          </div>
          <p className="mt-5 text-xs text-white/70">أو تواصل معنا مباشرة للاستفسار عن الكتب وتوفرها</p>
        </div>
      </section>
    </div>
  );
}