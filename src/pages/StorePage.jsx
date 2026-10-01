import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getStorePage } from '../lib/storePages';
import { useHead } from '../hooks/useHead';
import { Button } from '@/components/ui/button';

export default function StorePage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStorePage(slug).then((result) => {
      if (active) setPage(result);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  useHead({ title: page?.title, description: page?.meta_description || undefined, path: `/${slug}` });

  if (loading) return <div className="container-x py-20 text-center text-sm text-soft">جارٍ تحميل الصفحة…</div>;
  if (!page) return <div className="container-x py-20 text-center"><h1 className="text-2xl font-bold text-ink">الصفحة غير موجودة</h1><p className="mt-2 text-sm text-soft">قد تكون الصفحة مخفية أو أن الرابط غير صحيح.</p><Button asChild className="mt-5"><Link to="/">العودة للرئيسية</Link></Button></div>;

  return <article className="container-x py-10 sm:py-16">
    <div className="mx-auto max-w-3xl">
      <nav aria-label="مسار التصفح" className="mb-8 text-sm text-soft">
        <Link to="/" className="hover:text-brand">الرئيسية</Link>
        <span className="mx-2 text-gray-300">/</span>
        <bdi dir="auto" className="text-ink">{page.title}</bdi>
      </nav>
      <header className="mb-8 border-b border-line pb-6 sm:mb-10 sm:pb-8">
        <h1 dir="auto" className="font-display text-3xl font-bold leading-relaxed text-ink sm:text-4xl">{page.title}</h1>
      </header>
      <div className="markdown-content break-words text-base leading-8 text-ink sm:text-[17px] sm:leading-9" dir="auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content_markdown}</ReactMarkdown>
      </div>
    </div>
  </article>;
}
