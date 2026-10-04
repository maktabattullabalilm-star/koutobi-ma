import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBundle } from '../lib/api';
import { useHead } from '../hooks/useHead';
import { formatPrice, isSoldOut } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import BookCover from '../components/BookCover';
import PackCover from '../components/PackCover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCart, IconBook } from '../components/icons';

export default function PackDetail() {
  const { id } = useParams();
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();
  const { show } = useToast();
  const navigate = useNavigate();
  useEffect(() => { getBundle(id).then(setPack).catch(() => setPack(null)).finally(() => setLoading(false)); }, [id]);
  useHead({ title: pack?.title_ar, description: pack?.description_ar || `باقة ${pack?.title_ar || ''}`, image: pack?.cover_image, path: `/pack/${id}` });
  if (loading) return <div className="container-x grid gap-8 py-10 lg:grid-cols-2"><div className="aspect-2/3 animate-pulse rounded-card bg-muted" /><div className="space-y-4"><div className="h-8 w-2/3 animate-pulse rounded bg-muted" /><div className="h-32 animate-pulse rounded bg-muted" /></div></div>;
  if (!pack) return <div className="container-x py-16 text-center"><IconBook className="mx-auto text-gray-300" width={44} height={44} /><h1 className="mt-3 text-lg font-bold text-ink">الباقة غير متاحة</h1><Button asChild className="mt-5"><Link to="/catalog">العودة إلى المكتبة</Link></Button></div>;
  const soldOut = isSoldOut(pack);
  const addPack = () => { if (add(pack)) show('تمت إضافة الباقة إلى السلة'); };
  return <div className="container-x py-8"><nav className="mb-5 text-sm text-soft"><Link to="/" className="hover:text-brand">الرئيسية</Link> / <Link to="/catalog" className="hover:text-brand">الكتب والباقات</Link> / <span>الباقات</span></nav><div className="grid gap-8 lg:grid-cols-2"><div className="lg:sticky lg:top-24 lg:self-start"><div className="relative mx-auto max-w-md overflow-hidden rounded-card border border-line/60 shadow-card"><PackCover pack={pack} alt={pack.title_ar} eager fetchPriority="high" className="aspect-680/960" /></div></div><div><span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">عرض خاص</span><h1 className="mt-3 text-3xl font-bold leading-tight text-ink">{pack.title_ar}</h1><p className="mt-3 leading-8 text-soft">{pack.description_ar || 'مجموعة مختارة من الكتب بسعر خاص.'}</p><Card className="mt-5 flex-row items-center gap-3 border-line/70 bg-gray-50 p-4"><span className="text-2xl font-bold tabular-nums text-brand">{formatPrice(pack.price)}</span>{pack.old_price > pack.price && <span className="text-base tabular-nums text-soft line-through">{formatPrice(pack.old_price)}</span>}<span className="ms-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">سعر الباقة</span></Card><div className="mt-5 rounded-xl border border-line bg-muted/30 p-5"><h2 className="font-bold text-ink">تتضمن هذه الباقة</h2><ul className="mt-3 space-y-3">{pack.books.map((item) => <li key={item.book_id} className="flex items-center gap-3 text-sm"><BookCover src={item.books?.cover_image} alt="" className="h-12 w-9 overflow-hidden rounded border" imgClassName="h-full w-full object-cover" /><span className="font-medium text-ink">{item.books?.title_ar}</span>{item.books?.author_ar && <span className="text-soft">{item.books.author_ar}</span>}</li>)}</ul></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button onClick={addPack} disabled={soldOut} className="flex-1 py-3"><IconCart width={18} />{soldOut ? 'غير متوفرة' : 'أضف الباقة للسلة'}</Button><Button onClick={() => { addPack(); navigate('/checkout'); }} disabled={soldOut} className="flex-1 bg-amber-400 py-3 font-bold text-brand-dark hover:bg-amber-300">اشترِ الباقة الآن</Button></div>{soldOut && <p className="mt-3 text-sm font-medium text-danger">أحد كتب الباقة غير متوفر حالياً.</p>}</div></div></div>;
}
