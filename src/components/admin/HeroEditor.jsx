import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Palette,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { adminGetBooks } from '../../lib/admin';
import BookCover from '../BookCover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_HERO_BACKGROUND,
  MAX_HERO_BOOKS,
  duplicateHeroSlide,
  emptyHeroSlide,
  heroTheme,
  normalizeHeroSlides,
  validateHexColor,
} from '../../lib/hero';

const FIELDS = [
  ['badge', 'الشارة الصغيرة', 'مثال: جديد هذا الأسبوع'],
  ['title', 'العنوان', 'اكتب عنوان الشريحة'],
  ['description', 'الوصف', 'نص توضيحي قصير يظهر تحت العنوان'],
  ['shop_label', 'نص زر التسوق', 'تصفّح المكتبة'],
  ['how_label', 'نص زر كيف أطلب', 'كيف أطلب؟'],
];

function bookLabel(book) {
  return book?.title_ar || book?.title || 'كتاب';
}

function ColorField({ value, onChange }) {
  const valid = Boolean(validateHexColor(value));
  return (
    <div>
      <span className="text-sm font-semibold text-ink">لون الخلفية</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label="لون خلفية الشريحة"
          value={validateHexColor(value) || DEFAULT_HERO_BACKGROUND}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-line bg-white p-1"
        />
        <Input
          dir="ltr"
          aria-label="رمز لون الخلفية"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="max-w-40 text-left font-mono"
          aria-invalid={valid ? undefined : true}
        />
        <span className="text-xs text-soft">يُختار لون النص تلقائياً حسب الخلفية.</span>
      </div>
      {!valid && <p className="mt-1 text-xs font-medium text-danger">أدخل لوناً مثل #35724e.</p>}
    </div>
  );
}

function StatsEditor({ stats, onChange }) {
  const update = (index, key, value) =>
    onChange(stats.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  return (
    <div className="rounded-lg border border-line bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-ink">الأرقام الظاهرة</h4>
          <p className="mt-0.5 text-xs text-soft">حتى ثلاثة أرقام بجانب بعضها.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-soft">{stats.length}</span>
      </div>
      <div className="space-y-2">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-[1fr_2fr_auto]"
          >
            <Input
              dir="auto"
              aria-label={`قيمة الرقم ${index + 1}`}
              placeholder="+2000"
              value={stat.value || ''}
              onChange={(event) => update(index, 'value', event.target.value)}
            />
            <Input
              dir="auto"
              aria-label={`وصف الرقم ${index + 1}`}
              placeholder="عميل سعيد"
              value={stat.label || ''}
              onChange={(event) => update(index, 'label', event.target.value)}
            />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`تحريك الرقم ${index + 1} لأعلى`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...stats];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
              >
                <ChevronUp size={15} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`حذف الرقم ${index + 1}`}
                className="text-danger hover:text-danger"
                onClick={() => onChange(stats.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={stats.length >= 3}
        onClick={() => onChange([...stats, { value: '', label: '' }])}
      >
        <Plus size={15} /> إضافة رقم
      </Button>
    </div>
  );
}

function BookPicker({ books, loading, error, bookIds, onChange }) {
  const [query, setQuery] = useState('');
  const selectedIds = useMemo(() => new Set(bookIds), [bookIds]);
  const missing = bookIds.filter((id) => !books.some((book) => book.id === id));
  const term = query.trim().toLowerCase();
  const available = useMemo(() => {
    return books
      .filter((book) => !selectedIds.has(book.id))
      .filter((book) => {
        if (!term) return true;
        return [book.title_ar, book.title, book.author_ar]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice(0, 60);
  }, [books, term, selectedIds]);
  const full = selectedIds.size >= MAX_HERO_BOOKS;

  const add = (id) => {
    if (full || selectedIds.has(id)) return;
    onChange([...bookIds, id]);
  };
  const remove = (id) => onChange(bookIds.filter((bookId) => bookId !== id));
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= bookIds.length) return;
    const next = [...bookIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-line bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-ink">كتب الشريحة</h4>
          <p className="mt-0.5 text-xs text-soft">
            اختر حتى {MAX_HERO_BOOKS} كتب. تظهر بترتيب الاختيار، ويُتجاهل أي كتاب محذوف أو غير منشور.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${full ? 'bg-amber-100 text-amber-800' : 'bg-white text-soft'}`}
        >
          {selectedIds.size} / {MAX_HERO_BOOKS}
        </span>
      </div>

      {bookIds.length > 0 && (
        <ol className="mt-4 space-y-2" aria-label="الكتب المختارة">
          {bookIds.map((id, index) => {
            const book = books.find((item) => item.id === id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-md border border-line bg-white p-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-soft">{index + 1}</span>
                {book ? (
                  <BookCover
                    src={book.cover_image}
                    alt={bookLabel(book)}
                    className="h-12 w-9 shrink-0 overflow-hidden rounded"
                  />
                ) : (
                  <span className="grid h-12 w-9 shrink-0 place-items-center rounded bg-gray-100 text-gray-300">
                    <BookOpen size={16} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {book ? bookLabel(book) : 'كتاب محذوف'}
                  </p>
                  <p className="truncate text-xs text-soft">
                    {book?.author_ar || (missing.includes(id) ? 'لم يعد موجوداً في المكتبة' : '')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`تحريك ${book ? bookLabel(book) : 'الكتاب'} لأعلى`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`تحريك ${book ? bookLabel(book) : 'الكتاب'} لأسفل`}
                    disabled={index === bookIds.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger hover:text-danger"
                    aria-label={`إزالة ${book ? bookLabel(book) : 'الكتاب'}`}
                    onClick={() => remove(id)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">ابحث عن كتاب</span>
          <div className="relative mt-1.5">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 end-3 my-auto text-soft"
            />
            <Input
              dir="auto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="اسم الكتاب أو المؤلف"
              className="pe-9"
            />
          </div>
        </label>
        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
        {loading ? (
          <p className="mt-3 text-sm text-soft">جارٍ تحميل الكتب…</p>
        ) : (
          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-line bg-white p-1">
            {available.map((book) => {
              const inactive = book.is_active === false;
              return (
                <li key={book.id}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => add(book.id)}
                    className="flex w-full items-center gap-3 rounded p-2 text-start transition hover:bg-brand-pale disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BookCover
                      src={book.cover_image}
                      alt={bookLabel(book)}
                      className="h-11 w-8 shrink-0 overflow-hidden rounded"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{bookLabel(book)}</span>
                      <span className="block truncate text-xs text-soft">{book.author_ar || '—'}</span>
                    </span>
                    {inactive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-soft">
                        غير منشور
                      </span>
                    )}
                    <Plus size={16} aria-hidden="true" className="text-brand" />
                  </button>
                </li>
              );
            })}
            {!available.length && (
              <li className="px-3 py-6 text-center text-sm text-soft">
                {full ? 'بلغت الحد الأقصى — أزل كتاباً لإضافة غيره.' : 'لا توجد كتب مطابقة.'}
              </li>
            )}
          </ul>
        )}
        {full && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            الحد الأقصى {MAX_HERO_BOOKS} كتب لكل شريحة.
          </p>
        )}
      </div>
    </div>
  );
}

function SlideEditor({ slide, books, booksLoading, booksError, onChange }) {
  const set = (key, value) => onChange({ ...slide, [key]: value });
  const theme = heroTheme(slide);
  return (
    <div className="space-y-5 rounded-xl border border-line bg-white p-4 sm:p-5">
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: theme.background, color: theme.text, borderColor: theme.border }}
        aria-label="معاينة الشريحة"
      >
        {slide.badge && (
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: theme.badgeBg, color: theme.text }}
          >
            {slide.badge}
          </span>
        )}
        <p className="mt-2 text-xl font-bold leading-snug">{slide.title || 'عنوان الشريحة'}</p>
        {slide.description && (
          <p className="mt-1 text-sm" style={{ color: theme.muted }}>
            {slide.description}
          </p>
        )}
        <span
          className="mt-3 inline-flex rounded-lg px-3 py-1.5 text-sm font-bold"
          style={{ backgroundColor: theme.button, color: theme.buttonText }}
        >
          {slide.shop_label || 'زر التسوق'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label, placeholder]) => (
          <label key={key} className={key === 'description' ? 'block sm:col-span-2' : 'block'}>
            <span className="text-sm font-semibold text-ink">{label}</span>
            {key === 'description' || key === 'title' ? (
              <Textarea
                dir="auto"
                rows={key === 'title' ? 2 : 3}
                placeholder={placeholder}
                value={slide[key] || ''}
                onChange={(event) => set(key, event.target.value)}
                className="mt-1.5 bg-white"
              />
            ) : (
              <Input
                dir="auto"
                placeholder={placeholder}
                value={slide[key] || ''}
                onChange={(event) => set(key, event.target.value)}
                className="mt-1.5 bg-white"
              />
            )}
          </label>
        ))}
      </div>

      <ColorField value={slide.background_color} onChange={(value) => set('background_color', value)} />

      <StatsEditor stats={slide.stats || []} onChange={(stats) => set('stats', stats)} />

      <BookPicker
        books={books}
        loading={booksLoading}
        error={booksError}
        bookIds={slide.book_ids || []}
        onChange={(bookIds) => set('book_ids', bookIds)}
      />
    </div>
  );
}

export default function HeroEditor({ content, onChange }) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    let alive = true;
    adminGetBooks()
      .then((data) => {
        if (alive) setBooks(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (alive) setBooksError(error?.message || 'تعذّر تحميل الكتب');
      })
      .finally(() => {
        if (alive) setBooksLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const slides = normalizeHeroSlides(content, { keepEmptyStats: true, keepInvalidColor: true });

  // Legacy rows stored one hero. Keep its copy, and make its current three
  // newest covers an explicit selection so the first save is lossless.
  useEffect(() => {
    if (seeded.current || !books.length) return;
    const needsSeed = slides.some((slide) => slide.legacy && slide.book_ids.length === 0);
    if (!needsSeed) return;
    seeded.current = true;
    const newestActive = books.filter((book) => book.is_active !== false).slice(0, 3);
    onChange({
      slides: slides.map((slide) =>
        slide.legacy ? { ...slide, legacy: false, book_ids: newestActive.map((book) => book.id) } : slide
      ),
    });
  }, [books, slides, onChange]);

  const current = slides.find((slide) => slide.id === selectedId) || slides[0] || null;

  const commit = (next) => onChange({ slides: next });
  const patch = (id, changes) =>
    commit(slides.map((slide) => (slide.id === id ? { ...slide, ...changes } : slide)));

  const addSlide = () => {
    const slide = emptyHeroSlide();
    commit([...slides, slide]);
    setSelectedId(slide.id);
  };

  const duplicate = (slide) => {
    const copy = duplicateHeroSlide(slide);
    const index = slides.findIndex((item) => item.id === slide.id);
    const next = [...slides];
    next.splice(index + 1, 0, copy);
    commit(next);
    setSelectedId(copy.id);
  };

  const remove = (slide) => {
    const index = slides.findIndex((item) => item.id === slide.id);
    const next = slides.filter((item) => item.id !== slide.id);
    commit(next);
    if (slide.id === current?.id) {
      setSelectedId(next[Math.max(0, index - 1)]?.id || '');
    }
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand/20 bg-brand-pale/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink">شرائح الواجهة</h3>
            <p className="mt-1 text-xs leading-5 text-soft">
              كل شريحة تظهر على حدة وتتبدّل تلقائياً كل 7 ثوانٍ. أضف حتى 9 كتب لكل شريحة.
            </p>
          </div>
          <Button type="button" onClick={addSlide}>
            <Plus size={16} /> إضافة شريحة
          </Button>
        </div>

        <ul className="mt-4 space-y-2" aria-label="شرائح الواجهة">
          {slides.map((slide, index) => {
            const active = slide.id === current?.id;
            const theme = heroTheme(slide);
            return (
              <li
                key={slide.id}
                className={`rounded-lg border bg-white p-3 transition ${active ? 'border-brand/40 shadow-sm' : 'border-line'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="size-8 shrink-0 rounded-md border"
                    style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(slide.id)}
                    className="min-w-0 flex-1 text-start"
                    aria-pressed={active}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold text-soft">شريحة {index + 1}</span>
                      {!slide.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-soft">
                          مخفية
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-bold text-ink">
                      {slide.title || slide.badge || 'شريحة بدون عنوان'}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`تحريك الشريحة ${index + 1} لأعلى`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUp size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`تحريك الشريحة ${index + 1} لأسفل`}
                      disabled={index === slides.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDown size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`نسخ الشريحة ${index + 1}`}
                      onClick={() => duplicate(slide)}
                    >
                      <Copy size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger hover:text-danger"
                      aria-label={`حذف الشريحة ${index + 1}`}
                      onClick={() => remove(slide)}
                    >
                      <Trash2 size={15} />
                    </Button>
                    <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
                    <Switch
                      aria-label={`إظهار الشريحة ${index + 1}`}
                      checked={slide.active}
                      onCheckedChange={(checked) => patch(slide.id, { active: checked })}
                    />
                    {slide.active ? (
                      <Eye size={15} className="text-brand" aria-hidden="true" />
                    ) : (
                      <EyeOff size={15} className="text-soft" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {!slides.length && (
          <div className="mt-4 rounded-lg border border-dashed border-line bg-white p-6 text-center">
            <GripVertical size={20} className="mx-auto text-soft" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">لا توجد شرائح بعد</p>
            <p className="mt-1 text-xs text-soft">أضف شريحة لتبدأ بتخصيص واجهة الصفحة الرئيسية.</p>
            <Button type="button" className="mt-3" onClick={addSlide}>
              <Plus size={16} /> إضافة أول شريحة
            </Button>
          </div>
        )}
      </div>

      {current ? (
        <SlideEditor
          key={current.id}
          slide={current}
          books={books}
          booksLoading={booksLoading}
          booksError={booksError}
          onChange={(next) => patch(current.id, next)}
        />
      ) : (
        <div className="rounded-lg border border-line bg-gray-50 p-5 text-sm text-soft">
          <Palette size={18} className="mb-2 text-brand" aria-hidden="true" />
          أضف شريحة لتعديل نصوصها ولونها وكتبها.
        </div>
      )}
    </div>
  );
}
