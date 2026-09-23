import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBookImport } from '../../hooks/useBookImport';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IconDownload } from '../../components/icons';

/**
 * Standalone import flow: fetch book data from an external source, then hand
 * it to a fresh new-book form (via location state) for review before saving.
 * Nothing is ever created here — the form remains the only review + save step.
 */
export default function BookImport() {
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [importTab, setImportTab] = useState('sifa'); // sifa | isbn

  /** Merge happens in the new-book form; this page only routes there. */
  const onApply = (fields, cover, sourceLabel, warnings = []) => {
    if (warnings.length) show(`ملاحظات: ${warnings.join('؛ ')}`, 'error');
    navigate('/admin/books/new', { state: { importData: { fields, cover, sourceLabel } } });
  };

  const {
    sifaUrl,
    setSifaUrl,
    sifaHtml,
    setSifaHtml,
    isbnInput,
    setIsbnInput,
    importing,
    showHtmlFallback,
    importFromSifaUrl,
    importFromSifaHtml,
    importFromIsbn,
  } = useBookImport({ accessToken: session?.access_token, onApply });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="استيراد بيانات الكتاب"
        description="اجلب البيانات من مصدر خارجي، ثم تُفتح صفحة كتاب جديد معبأة بها — راجعها وعدّلها قبل النشر."
        crumbs={[
          { label: 'لوحة التحكم', to: '/admin/dashboard' },
          { label: 'الكتب', to: '/admin/books' },
          { label: 'استيراد' },
        ]}
      />

      <section className="card mt-6 border border-line/70 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
            <IconDownload width={15} height={15} />
          </span>
          <h2 className="admin-section-title">اختر المصدر</h2>
        </div>
        <p className="mb-4 text-xs leading-5 text-soft">
          لا يُنشأ أي كتاب تلقائياً، والسعر يُحدَّد يدوياً دائماً (MAD).
        </p>

        <div className="mb-4 flex gap-2">
          {[
            { id: 'sifa', label: 'رابط sifatusafwa' },
            { id: 'isbn', label: 'رقم ISBN' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setImportTab(t.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                importTab === t.id ? 'bg-brand text-white' : 'bg-gray-100 text-ink hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {importTab === 'sifa' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={sifaUrl}
                onChange={(e) => setSifaUrl(e.target.value)}
                dir="ltr"
                placeholder="https://www.sifatusafwa.com/…/product.html"
                className="flex-1 text-right"
                aria-label="رابط sifatusafwa"
              />
              <Button type="button" onClick={importFromSifaUrl} disabled={importing} className="shrink-0">
                {importing ? 'جارٍ الجلب…' : 'جلب'}
              </Button>
            </div>
            {showHtmlFallback && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-bold leading-5 text-amber-800">
                  تعذّر الجلب التلقائي — انسخ محتوى الصفحة يدوياً بهذه الخطوات:
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 ps-5 text-xs leading-5 text-amber-800">
                  <li>افتح صفحة الكتاب في متصفحك (Chrome أو غيره)</li>
                  <li>اضغط على Ctrl+U لعرض محتوى الصفحة</li>
                  <li>حدّد الكل بـ Ctrl+A ثم انسخه بـ Ctrl+C</li>
                  <li>الصق ما نسخته في المربع أسفله ثم اضغط «تحليل»</li>
                </ol>
                <Textarea
                  value={sifaHtml}
                  onChange={(e) => setSifaHtml(e.target.value)}
                  rows={4}
                  dir="ltr"
                  placeholder="الصق محتوى الصفحة هنا…"
                  className="mt-2 bg-white font-mono text-xs"
                  aria-label="محتوى الصفحة المنسوخ"
                />
                <Button
                  type="button"
                  onClick={importFromSifaHtml}
                  disabled={importing}
                  className="mt-2 w-full"
                >
                  {importing ? 'جارٍ التحليل…' : 'تحليل المحتوى الملصق'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                dir="ltr"
                placeholder="978-…"
                className="flex-1 text-right"
                aria-label="رقم ISBN"
              />
              <Button type="button" onClick={importFromIsbn} disabled={importing} className="shrink-0">
                {importing ? 'جارٍ البحث…' : 'بحث'}
              </Button>
            </div>
            <p className="text-[11px] leading-5 text-soft">
              نبحث في مكتبتين عالميتين — الكتب العربية غالباً غائبة منهما، وستُكمل الإدخال يدوياً عندها.
              ستجد الرقم على الغلاف الخلفي للكتاب بجانب الباركود.
            </p>
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-sm text-soft">
        تفضل الإدخال اليدوي؟{' '}
        <Link to="/admin/books/new" className="font-bold text-brand hover:underline">
          أنشئ كتاباً فارغاً
        </Link>
      </p>
    </div>
  );
}
