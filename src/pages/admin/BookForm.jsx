import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateBook,
  adminCreateBookImage,
  adminDeleteBookImage,
  adminGetBookImages,
  adminGetBooks,
  adminUpdateBook,
  adminUpdateBookImage,
  deleteR2Object,
  getAttributeOptionsForForm,
  getCategoriesForForm,
  uploadR2File,
} from '../../lib/admin';
import { FALLBACK_CATEGORIES, warnFallback } from '../../lib/site';
import { blobToBase64, IMAGE_MAX_COUNT } from '../../lib/images';
import { validateBook } from '../../lib/validators';
import { pluralImg, useGallery } from '../../hooks/useGallery';
import { useToast } from '../../components/Toast';
import { Spinner } from '@/components/ui/spinner';
import { IconBook, IconCamera, IconCheck, IconChevronLeft, IconChevronRight, IconCopy, IconEye, IconImage, IconLayers, IconStar, IconTrash } from '../../components/icons';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const EMPTY = {
  title_ar: '',
  subtitle_ar: '',
  author_ar: '',
  publisher_ar: '',
  category: '',
  price: '',
  old_price: '',
  description_ar: '',
  pages: '',
  size_ar: '',
  binding_ar: '',
  paper_ar: '',
  edition_ar: '',
  isbn: '',
  cover_image: '',
  stock_qty: '',
  show_quantity: 'inherit',
  is_new: true,
  is_featured: false,
  is_out_of_stock: false,
  is_active: true,
};

const FALLBACK_CATS = FALLBACK_CATEGORIES;
const FALLBACK_PAPER = ['ورق أصفر (شامواه)', 'ورق أبيض'];
const FALLBACK_BINDING = ['تجليد فني', 'تجليد عادي'];
const FALLBACK_SIZES = ['17×24 سم', '14×20 سم', '12×17 سم', '24×17 سم'];

const FORM_TABS = [
  { id: 'sec-info', label: 'المعلومات' },
  { id: 'sec-edition', label: 'الطبعة والمخزون' },
  { id: 'sec-gallery', label: 'الصور' },
  { id: 'sec-status', label: 'النشر' },
];

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  // Gallery working set lives in a hook (images, staging, drop/paste/URL).
  const {
    images,
    originalImages,
    urlInput,
    setUrlInput,
    staging,
    dragging,
    setDragging,
    fileRef,
    cameraRef,
    resetGallery,
    markPrimary,
    moveImage,
    removeImage,
    copyUrl,
    stageFiles,
    onDropImages,
    onPasteImages,
    addUrlImage,
    attachCover,
  } = useGallery();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState([]);
  const [paperOpts, setPaperOpts] = useState([]);
  const [bindingOpts, setBindingOpts] = useState([]);
  const [sizeOpts, setSizeOpts] = useState([]);

  useEffect(() => {
    // Fetch dropdown options (public reads — no admin check needed)
    Promise.all([
      getCategoriesForForm(),
      getAttributeOptionsForForm('paper'),
      getAttributeOptionsForForm('binding'),
      getAttributeOptionsForForm('size'),
    ])
      .then(([c, p, b, s]) => {
        if (!c.length) warnFallback('categories');
        setCats(c.length ? c : FALLBACK_CATS);
        setPaperOpts(p.length ? p : FALLBACK_PAPER);
        setBindingOpts(b.length ? b : FALLBACK_BINDING);
        setSizeOpts(s.length ? s : FALLBACK_SIZES);
      })
      .catch(() => {
        warnFallback('catalog options');
        setCats(FALLBACK_CATS);
        setPaperOpts(FALLBACK_PAPER);
        setBindingOpts(FALLBACK_BINDING);
        setSizeOpts(FALLBACK_SIZES);
      });

    if (!isEdit) {
      setForm({ ...EMPTY, cover_image: '' });
      // One-shot handoff from the standalone import page (new books only —
      // the import flow never runs while editing). Cleared after applying.
      const data = location.state?.importData;
      if (data) {
        setForm((f) => {
          const next = { ...f };
          for (const [k, v] of Object.entries(data.fields || {})) {
            if (v !== '' && v != null && k in next) next[k] = v;
          }
          return next;
        });
        if (data.cover?.url) attachCover(data.cover);
        show(`تم جلب البيانات (${data.sourceLabel}) — راجعها قبل الحفظ ✓`);
        navigate(location.pathname, { replace: true, state: {} });
      }
      return;
    }
    Promise.all([adminGetBooks(), adminGetBookImages(id)])
      .then(([list, imgs]) => {
        const b = list.find((x) => x.id === id);
        if (!b) {
          show('الكتاب غير موجود', 'error');
          navigate('/admin/books');
          return;
        }
        setForm({
          ...EMPTY,
          ...b,
          price: b.price ?? '',
          old_price: b.old_price ?? '',
          pages: b.pages ?? '',
        });
        const rows = imgs || [];
        resetGallery(rows);
      })
      .catch((e) => show(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [attachCover, id, isEdit, location, navigate, resetGallery, show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    // key → [message, section anchor] so the summary can jump to the field.
    const catNames = (cats.length ? cats : FALLBACK_CATS).map((c) =>
      typeof c === 'string' ? c : c.name_ar || c.name
    );
    const errs = validateBook(form, { categories: catNames });
    setErrors(errs);
    if (Object.keys(errs).length) {
      show('تحقق من الحقول الناقصة', 'error');
      return;
    }

    setSaving(true);
    const price = Number(form.price);
    // R2 keys uploaded during THIS save — deleted again if the save fails (no orphans).
    const uploadedKeys = [];
    try {
      // 1. Upload staged blobs to R2.
      const finalImages = [];
      let n = 0;
      for (const img of images) {
        if (img.blob) {
          const base64 = await blobToBase64(img.blob);
          const up = await uploadR2File(
            {
              name: `book-${Date.now()}-${n++}.${img.ext || 'jpg'}`,
              type: img.blob.type || 'image/jpeg',
              base64,
            },
            session?.access_token
          );
          uploadedKeys.push(up.key);
          if (img.preview) URL.revokeObjectURL(img.preview);
          finalImages.push({ ...img, url: up.url, r2_key: up.key, blob: undefined, preview: undefined });
        } else {
          finalImages.push(img);
        }
      }
      if (finalImages.length && !finalImages.some((i) => i.is_primary)) {
        finalImages[0] = { ...finalImages[0], is_primary: true };
      }
      const primary = finalImages.find((i) => i.is_primary) || null;

      // 2. Save the book (primary URL mirrored into legacy cover_image).
      const payload = {
        ...form,
        price,
        old_price: form.old_price === '' ? null : Number(form.old_price),
        pages: form.pages === '' ? null : Number(form.pages),
        stock_qty: form.stock_qty === '' ? 0 : Number(form.stock_qty),
        show_quantity: form.show_quantity,
        cover_image: primary?.url || '',
        is_new: !!form.is_new,
        is_featured: !!form.is_featured,
        is_out_of_stock: !!form.is_out_of_stock,
        is_active: !!form.is_active,
      };

      let bookId = id;
      if (isEdit) {
        await adminUpdateBook(id, payload);
      } else {
        const created = await adminCreateBook(payload);
        bookId = created.id;
      }

      // 3. Sync gallery rows.
      if (isEdit) {
        const currIds = new Set(finalImages.filter((i) => i.id).map((i) => i.id));
        const r2Failures = [];
        for (const orig of originalImages) {
          if (!orig.id || currIds.has(orig.id)) continue;
          await adminDeleteBookImage(orig.id);
          if (orig.r2_key) {
            try {
              await deleteR2Object(orig.r2_key, session?.access_token);
            } catch {
              r2Failures.push(orig.r2_key);
            }
          }
        }
        let pos = 0;
        for (const img of finalImages) {
          if (!img.id) {
            await adminCreateBookImage({
              book_id: bookId,
              url: img.url,
              r2_key: img.r2_key,
              position: pos,
              is_primary: !!img.is_primary,
            });
          } else {
            await adminUpdateBookImage(img.id, { position: pos, is_primary: !!img.is_primary });
          }
          pos += 1;
        }
        if (r2Failures.length) {
          show(`تم الحفظ، لكن تعذّر حذف ${r2Failures.length} صورة قديمة من التخزين`, 'error');
        }
      } else {
        let pos = 0;
        for (const img of finalImages) {
          await adminCreateBookImage({
            book_id: bookId,
            url: img.url,
            r2_key: img.r2_key,
            position: pos,
            is_primary: !!img.is_primary,
          });
          pos += 1;
        }
      }

      show(isEdit ? 'تم حفظ التعديلات ✓' : 'تمت إضافة الكتاب ✓');
      navigate('/admin/books');
    } catch (err) {
      for (const key of uploadedKeys) {
        try {
          await deleteR2Object(key, session?.access_token);
        } catch {
          /* orphan-sweep procedure covers leftovers */
        }
      }
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));
  const check = (k, label) => (
    <label
      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition ${form[k] ? 'border-brand bg-brand-light text-brand' : 'border-line bg-white text-soft'}`}
    >
      <input type="checkbox" checked={form[k]} onChange={toggle(k)} className="sr-only" />
      <span
        className={`h-3 w-3 rounded-xs border ${form[k] ? 'border-brand bg-brand' : 'border-gray-300 bg-white'}`}
      />
      {label}
    </label>
  );

  const field = (label, name, extra = {}) => (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} value={form[name]} onChange={set(name)} {...extra} />
      {errors[name] && <FieldError>{errors[name][0]}</FieldError>}
    </Field>
  );

  const selectField = (label, name, options) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
      </Label>
      <Select value={form[name]} onValueChange={(v) => setForm((f) => ({ ...f, [name]: v }))}>
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <Spinner className="mx-auto size-10 text-brand" />
        <p className="mt-3 text-sm text-soft">جارٍ تحميل الكتاب…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'تعديل الكتاب ✏️' : 'إضافة كتاب جديد 📚'}
        description="املأ بيانات الكتاب وارفعه ليكون جاهزاً للبيع."
        crumbs={[
          { label: 'لوحة التحكم', to: '/admin/dashboard' },
          { label: 'الكتب', to: '/admin/books' },
          { label: isEdit ? 'تعديل' : 'جديد' },
        ]}
      />

      {/* sticky section tabs */}
      <nav
        className="sticky top-0 z-10 -mx-1 mb-5 flex gap-1 overflow-x-auto bg-gray-50/95 px-1 py-2 backdrop-blur-sm"
        aria-label="أقسام النموذج"
      >
        {FORM_TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-soft ring-1 ring-inset ring-line transition hover:text-brand hover:ring-brand/40"
          >
            {t.label}
          </a>
        ))}
      </nav>

      <form onSubmit={save} className="mt-6 space-y-6" noValidate>
        {Object.keys(errors).length > 0 && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
            <p className="text-sm font-bold text-danger">تحقق من الحقول الناقصة:</p>
            <ul className="mt-1.5 space-y-1 text-sm text-danger">
              {Object.entries(errors).map(([key, [msg, section]]) => (
                <li key={key}>
                  <a href={`#${section}`} className="underline decoration-dotted hover:no-underline">
                    {msg} ←
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* قسم البيانات */}
        <section id="sec-info" className="card scroll-mt-24 border border-line/70 p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
              <IconBook width={15} height={15} />
            </span>
            <h2 className="admin-section-title">معلومات الكتاب</h2>
          </div>
          <p className="mb-4 text-xs text-soft">البيانات الأساسية التي تظهر في بطاقة الكتاب بالمتجر.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('العنوان *', 'title_ar', { placeholder: 'مثال: الداء والدواء' })}
            {field('العنوان الفرعي', 'subtitle_ar', { placeholder: 'اختياري' })}
            {field('المؤلف', 'author_ar', { placeholder: 'مثال: ابن القيم الجوزية' })}
            {field('الناشر', 'publisher_ar', { placeholder: 'مثال: دار ابن كثير' })}
            {selectField('التصنيف *', 'category', cats)}
            {field('السعر (درهم) *', 'price', {
              type: 'number',
              min: 0,
              step: '0.01',
              placeholder: 'مثال: 80',
            })}
            {field('السعر قبل الخصم (اختياري)', 'old_price', {
              type: 'number',
              min: 0,
              step: '0.01',
              placeholder: 'اتركه فارغاً إن لم يوجد خصم',
            })}
            <div className="sm:col-span-2">
              <Label htmlFor="description_ar" className="mb-1.5 block">
                الوصف
              </Label>
              <Textarea
                id="description_ar"
                value={form.description_ar}
                onChange={set('description_ar')}
                rows={4}
                className="resize-y"
                placeholder="نبذة عن الكتاب ومحتواه…"
              />
            </div>
          </div>
        </section>

        {/* قسم بيانات الطبعة */}
        <section id="sec-edition" className="card scroll-mt-24 border border-line/70 p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
              <IconLayers width={15} height={15} />
            </span>
            <h2 className="admin-section-title">بيانات الطبعة والمخزون</h2>
          </div>
          <p className="mb-4 text-xs text-soft">مواصفات النسخة المعروضة وكمية المخزون.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('عدد الصفحات', 'pages', { type: 'number', min: 0, placeholder: 'مثال: 480' })}
            {field('رقم ISBN', 'isbn', { placeholder: 'مثال: 978-2-7451-...' })}
            {field('الطبعة', 'edition_ar', { placeholder: 'مثال: الطبعة الخامسة' })}
            {selectField('الورق', 'paper_ar', paperOpts)}
            {selectField('التجليد', 'binding_ar', bindingOpts)}
            {selectField('المقاس', 'size_ar', sizeOpts)}
            {field('المخزون (عدد النسخ)', 'stock_qty', { type: 'number', min: 0, placeholder: 'مثال: 50' })}
            {selectField('إظهار الكمية في المتجر', 'show_quantity', [
              { value: 'inherit', label: 'مثل الإعداد العام للمتجر' },
              { value: 'show', label: 'إظهار الكمية الدقيقة' },
              { value: 'hide', label: 'إخفاء الكمية' },
            ])}
          </div>
        </section>

        {/* قسم الصور */}
        <section id="sec-gallery" className="card scroll-mt-24 border border-line/70 p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
              <IconImage width={15} height={15} />
            </span>
            <h2 className="admin-section-title">صور الكتاب (حتى {IMAGE_MAX_COUNT})</h2>
            {images.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-soft">
                {pluralImg(images.length)}
              </span>
            )}
          </div>
          <p className="mb-4 mt-1 text-xs leading-5 text-soft">
            الصور المختارة من جهازك تُصغَّر تلقائياً ثم تُحفظ في تخزين المتجر عند الحفظ. الصورة الرئيسية
            تظهر في بطاقات المتجر.
          </p>

          {images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, ix) => (
                <figure
                  key={img.uid}
                  className={`w-full max-w-[190px] overflow-hidden rounded-md border bg-white ${img.is_primary ? 'border-brand ring-1 ring-brand' : 'border-line'}`}
                >
                  <div className="relative">
                    {img.preview || img.url ? (
                      <img
                        src={img.preview || img.url}
                        alt={`صورة ${ix + 1}`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] w-full items-center justify-center bg-gray-50 text-gray-300">
                        <IconBook width={24} height={24} />
                      </div>
                    )}
                    {img.is_primary && (
                      <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <IconStar filled width={10} height={10} /> الرئيسية
                      </span>
                    )}
                    {img.blob && (
                      <span className="absolute left-1.5 top-1.5 rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">
                        ستُرفع عند الحفظ
                      </span>
                    )}
                  </div>
                  <figcaption className="space-y-1.5 p-2">
                    {img.url ? (
                      <button
                        type="button"
                        onClick={() => copyUrl(img.url)}
                        dir="ltr"
                        title="اضغط لنسخ الرابط"
                        className="flex w-full items-center gap-1 text-left text-[10px] text-soft underline decoration-dotted hover:text-brand"
                      >
                        <IconCopy width={10} height={10} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{img.url}</span>
                      </button>
                    ) : (
                      <span className="block text-[10px] text-soft">معاينة محلية — لم تُرفع بعد</span>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => markPrimary(img.uid)}
                        disabled={img.is_primary}
                        title="اجعلها الصورة الرئيسية"
                        className={`flex h-9 w-9 items-center justify-center rounded-md transition ${img.is_primary ? 'text-brand' : 'text-gray-300 hover:bg-amber-50 hover:text-amber-500'}`}
                        aria-label="صورة رئيسية"
                      >
                        <IconStar filled={img.is_primary} width={16} height={16} />
                      </button>
                      <div className="flex items-center gap-0.5" dir="ltr">
                        <button
                          type="button"
                          onClick={() => moveImage(img.uid, -1)}
                          disabled={ix === 0}
                          title="تقديم"
                          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"
                          aria-label="تقديم"
                        >
                          <IconChevronLeft width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(img.uid, 1)}
                          disabled={ix === images.length - 1}
                          title="تأخير"
                          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"
                          aria-label="تأخير"
                        >
                          <IconChevronRight width={14} height={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(img.uid)}
                        title="حذف الصورة"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-300 transition hover:bg-rose-50 hover:text-danger"
                        aria-label="حذف الصورة"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Dropzone: click, drag-drop, or paste — no links needed */}
            <div
              role="button"
              tabIndex={0}
              aria-label="أضف صوراً: اختر من جهازك، اسحبها هنا، أو الصقها"
              onClick={() => {
                if (!staging && !saving && images.length < IMAGE_MAX_COUNT) fileRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === 'Enter' || e.key === ' ') &&
                  !staging &&
                  !saving &&
                  images.length < IMAGE_MAX_COUNT
                )
                  fileRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDropImages}
              onPaste={onPasteImages}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
                dragging
                  ? 'border-brand bg-brand-pale'
                  : 'border-line bg-gray-50 hover:border-brand/50 hover:bg-brand-pale/50'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand" aria-hidden>
                <IconImage width={20} height={20} />
              </span>
              <span className="text-sm font-bold text-ink">
                {staging
                  ? 'جارٍ التجهيز…'
                  : images.length >= IMAGE_MAX_COUNT
                    ? `اكتمل العدد (${IMAGE_MAX_COUNT})`
                    : 'اسحب الصور إلى هنا، أو الصقها (Ctrl+V)، أو اضغط للاختيار من جهازك'}
              </span>
              <span className="text-[11px] text-soft">
                تُصغَّر تلقائياً إلى أقل من 180 ك.ب — لا حاجة لأي روابط
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => stageFiles(e.target.files)}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={staging || saving || images.length >= IMAGE_MAX_COUNT}
              variant="outline"
              className="w-full"
            >
              <IconCamera width={16} height={16} /> التقط صورة بالكاميرا
            </Button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => stageFiles(e.target.files)}
              className="hidden"
            />
            <details className="rounded-md border border-line/70 bg-white px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-soft hover:text-brand">
                إضافة برابط صورة (خيار متقدم)
              </summary>
              <div className="flex gap-2 pt-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  dir="ltr"
                  placeholder="https://…/cover.jpg"
                  className="flex-1 text-right"
                  aria-label="رابط صورة"
                />
                <Button
                  type="button"
                  onClick={addUrlImage}
                  disabled={saving || images.length >= IMAGE_MAX_COUNT}
                  variant="outline"
                  className="shrink-0"
                >
                  <IconCheck width={16} height={16} /> إضافة
                </Button>
              </div>
            </details>
          </div>
        </section>

        {/* قسم الحالة */}
        <section id="sec-status" className="card scroll-mt-24 border border-line/70 p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
              <IconEye width={15} height={15} />
            </span>
            <h2 className="admin-section-title">الحالة والعرض</h2>
          </div>
          <p className="mb-4 text-xs text-soft">التحكم في ظهور الكتاب وتمييزه في المتجر.</p>
          <div className="flex flex-wrap gap-3">
            {check('is_new', 'كتاب جديد')}
            {check('is_featured', (<span className="flex items-center gap-1.5"><IconStar filled width={14} height={14} className="text-amber-500" /> كتاب مميز</span>))}
            {check('is_out_of_stock', 'نفدت الكمية')}
            {check('is_active', 'منشور في المتجر')}
          </div>
        </section>

        {/* sticky save bar */}
        <div className="sticky bottom-0 z-10 -mx-1 bg-gray-50/95 px-1 py-3 backdrop-blur-sm">
          <div className="card flex flex-col-reverse gap-3 border border-line/70 p-3 shadow-lift sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link to="/admin/books">إلغاء</Link>
            </Button>
            <div className="flex items-center gap-3">
              {images.length > 0 && (
                <span className="text-xs text-soft">
                  {pluralImg(images.length)}
                  {' · '}
                  {images.filter((i) => i.blob).length > 0
                    ? `${pluralImg(images.filter((i) => i.blob).length)} بانتظار الرفع`
                    : 'كل الصور مرفوعة'}
                </span>
              )}
              <Button type="submit" disabled={saving || staging} className="flex-1 px-8 sm:flex-none">
                {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'نشر الكتاب'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
