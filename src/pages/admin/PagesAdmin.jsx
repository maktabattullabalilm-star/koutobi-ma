import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CircleHelp, ExternalLink, FilePlus2, FileText, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { adminDeleteStorePage, adminGetStorePages, adminSaveStorePage } from '../../lib/storePages';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const emptyPage = { title: '', slug: '', meta_description: '', content_markdown: '', is_visible: false, is_system: false };

export function MarkdownPreview({ source }) {
  if (!source.trim()) return <p className="text-sm text-soft">ستظهر معاينة المحتوى هنا.</p>;
  return <div dir="auto" className="markdown-content space-y-3 break-words text-sm leading-7 text-ink">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
  </div>;
}

export default function PagesAdmin() {
  const { show } = useToast();
  const [pages, setPages] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [editorMode, setEditorMode] = useState('edit');

  const reload = useCallback(async (selectedId) => {
    setLoading(true);
    try {
      const rows = await adminGetStorePages();
      setPages(rows);
      const selected = rows.find((page) => page.id === selectedId) || rows[0] || null;
      setDraft(selected ? { ...selected } : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await adminSaveStorePage(draft);
      show('تم حفظ الصفحة ✓');
      await reload(saved.id);
    } catch (err) {
      const friendly = /duplicate key|unique constraint/i.test(err.message)
        ? 'هذا الرابط مستخدم بالفعل — اختر رابطاً آخر.'
        : err.message;
      setError(friendly);
      show(friendly, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft || draft.is_system) return;
    if (!window.confirm(`حذف صفحة «${draft.title}» نهائياً؟`)) return;
    setDeleting(true);
    try {
      await adminDeleteStorePage(draft);
      show('تم حذف الصفحة');
      await reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const selectPage = (page) => { setDraft({ ...page }); setError(''); setEditorMode('edit'); };

  return <div className="mx-auto max-w-6xl">
    <PageHeader title="صفحات المتجر" description="أنشئ صفحات المعلومات، اكتب محتواها بـ Markdown، ثم أظهرها للزوار عند جاهزيتها." crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'صفحات المتجر' }]} actions={<Button onClick={() => { setDraft({ ...emptyPage }); setError(''); }}><FilePlus2 size={16} /> صفحة جديدة</Button>} />
    {error && <p role="alert" className="mb-4 rounded-md border border-danger/20 bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
    {loading ? <div className="py-16 text-center text-sm text-soft">جارٍ تحميل الصفحات…</div> : <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold text-ink">كل الصفحات</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-soft">{pages.length}</span></div>
        {pages.map((page) => <button key={page.id} type="button" onClick={() => selectPage(page)} className={`w-full rounded-lg border p-3 text-start transition ${draft?.id === page.id ? 'border-brand/30 bg-brand-pale/50' : 'border-line bg-white hover:bg-gray-50'}`}><span className="flex items-center gap-2"><FileText size={16} className="shrink-0 text-brand" /><span dir="auto" className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{page.title}</span>{page.is_visible ? <Eye size={15} className="text-emerald-700" /> : <EyeOff size={15} className="text-soft" />}</span><span dir="ltr" className="mt-1 block truncate text-start font-mono text-[11px] text-soft">/{page.slug}</span></button>)}
        {pages.length === 0 && <p className="rounded-lg border border-dashed border-line p-4 text-sm text-soft">لا توجد صفحات بعد. أنشئ صفحة جديدة للبدء.</p>}
      </aside>

      {draft ? <section className="min-w-0 rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5"><div><p className="text-xs font-bold text-brand">{draft.is_system ? 'صفحة أساسية' : draft.id ? 'صفحة مخصصة' : 'صفحة جديدة'}</p><h2 className="mt-1 font-display text-xl font-bold text-ink">{draft.title || 'صفحة بلا عنوان'}</h2></div><div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"><Switch id="page-visible" checked={!!draft.is_visible} onCheckedChange={(is_visible) => update({ is_visible })} /><label htmlFor="page-visible" className="cursor-pointer text-xs font-semibold text-ink">{draft.is_visible ? 'منشورة' : 'مخفية'}</label></div></div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-ink">عنوان الصفحة</span><Input dir="auto" maxLength={160} value={draft.title || ''} onChange={(event) => update({ title: event.target.value })} className="mt-1.5" placeholder="مثال: معلومات الشحن" /></label><label className="block"><span className="text-sm font-semibold text-ink">الرابط — أحرف إنجليزية فقط</span><div className="mt-1.5 flex items-center rounded-md border border-input bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-ring"><span className="font-mono text-sm text-soft">/</span><input dir="ltr" value={draft.slug || ''} readOnly={!!draft.is_system} onChange={(event) => update({ slug: event.target.value.toLowerCase() })} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-left font-mono text-sm outline-none read-only:text-soft" placeholder="shipping-information" /></div><span className="mt-1 block text-[11px] text-soft">استخدم a-z و0-9 والشرطة فقط، مثال: returns-policy</span></label></div>
          <label className="block"><span className="text-sm font-semibold text-ink">وصف نتائج البحث (اختياري)</span><Input maxLength={300} value={draft.meta_description || ''} onChange={(event) => update({ meta_description: event.target.value })} className="mt-1.5" placeholder="وصف مختصر يظهر في نتائج البحث" /><span className="mt-1 block text-end text-[11px] text-soft">{(draft.meta_description || '').length}/300</span></label>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">محتوى الصفحة</h3>
                  <p className="mt-0.5 text-xs text-soft">اكتب النص هنا، ثم عاينه قبل النشر.</p>
                </div>
                <span className="group relative inline-flex">
                  <button type="button" aria-label="مساعدة تنسيق المحتوى" className="flex h-7 w-7 items-center justify-center rounded-full text-soft hover:bg-gray-100 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                    <CircleHelp size={17} />
                  </button>
                  <span role="tooltip" className="pointer-events-none invisible absolute start-0 top-full z-20 mt-2 w-64 rounded-lg border border-line bg-ink p-3 text-xs font-normal leading-6 text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    تنسيق Markdown: <b>## عنوان</b> لعنوان، <b>**غامق**</b> للتأكيد، <b>- عنصر</b> لقائمة، و<b>[نص الرابط](https://...)</b> لإضافة رابط.
                  </span>
                </span>
              </div>
              <div role="group" aria-label="وضع محتوى الصفحة" className="inline-flex rounded-lg border border-line bg-gray-50 p-1">
                <button type="button" onClick={() => setEditorMode('edit')} aria-pressed={editorMode === 'edit'} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${editorMode === 'edit' ? 'bg-white text-brand shadow-sm' : 'text-soft hover:text-ink'}`}>تحرير</button>
                <button type="button" onClick={() => setEditorMode('preview')} aria-pressed={editorMode === 'preview'} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${editorMode === 'preview' ? 'bg-white text-brand shadow-sm' : 'text-soft hover:text-ink'}`}><Eye size={14} className="me-1 inline" /> معاينة</button>
              </div>
            </div>
            {editorMode === 'edit' ? (
              <Textarea dir="auto" value={draft.content_markdown || ''} onChange={(event) => update({ content_markdown: event.target.value })} className="min-h-[420px] resize-y border-line bg-white p-4 font-mono text-sm leading-7" placeholder={'## عنوان الصفحة\n\nاكتب محتوى الصفحة هنا...'} aria-label="محرر محتوى الصفحة" />
            ) : (
              <div className="min-h-[420px] rounded-lg border border-line bg-white p-5 sm:p-8">
                {!!draft.title && <h1 className="mb-6 border-b border-line pb-4 font-display text-2xl font-bold text-ink">{draft.title}</h1>}
                <MarkdownPreview source={draft.content_markdown || ''} />
              </div>
            )}
          </div>
          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5"><div>{draft.is_system ? <span className="text-xs text-soft">صفحة أساسية — لا يمكن حذفها أو تغيير رابطها.</span> : draft.id && <Button variant="ghost" onClick={remove} disabled={deleting} className="text-danger hover:text-danger"><Trash2 size={16} /> {deleting ? 'جارٍ الحذف…' : 'حذف الصفحة'}</Button>}</div><div className="flex items-center gap-2">{draft.id && draft.is_visible && <Button asChild variant="outline"><a href={`/${draft.slug}`} target="_blank" rel="noreferrer noopener"><ExternalLink size={15} /> معاينة الصفحة</a></Button>}<Button onClick={save} disabled={saving}><Save size={16} /> {saving ? 'جارٍ الحفظ…' : draft.is_visible ? 'حفظ ونشر' : 'حفظ الصفحة'}</Button></div></div>
        </div>
      </section> : <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white p-8 text-center"><FileText size={34} className="text-brand" /><h2 className="mt-3 text-lg font-bold text-ink">ابدأ بصفحة من صفحات المتجر</h2><p className="mt-1 max-w-sm text-sm leading-6 text-soft">اختر صفحة من القائمة لتعديلها، أو أنشئ صفحة مخصصة بعنوان ورابط ومحتوى Markdown.</p><Button className="mt-4" onClick={() => setDraft({ ...emptyPage })}><FilePlus2 size={16} /> إنشاء صفحة مخصصة</Button></section>}
    </div>}
  </div>;
}
