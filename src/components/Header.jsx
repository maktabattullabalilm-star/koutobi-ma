import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getCategories } from '../lib/api';
import { IconCart, IconClose, IconMenu, IconSearch, IconWrench } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : '/catalog');
    setOpen(false);
  };

  const navLink = ({ isActive }) =>
    `whitespace-nowrap px-3 py-2 text-[13px] font-medium transition ${isActive ? 'text-brand font-semibold' : 'text-ink hover:text-brand'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur-sm">
      <div className="container-x">
        {/* top row */}
        <div className="flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة">
            <IconMenu />
          </Button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">ك</span>
            <span className="text-xl font-bold leading-none">
              <span className="text-brand">كُتُبِي</span>
              <span className="text-ink">.ما</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-md lg:block">
            <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 ring-1 ring-inset ring-line focus-within:ring-brand">
              <IconSearch className="shrink-0 text-soft" width={18} height={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن كتاب، مؤلف، تصنيف…"
                className="w-full bg-transparent py-2.5 text-sm text-ink outline-hidden placeholder:text-gray-400"
              />
            </div>
          </form>

          <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
            <Link to="/admin" className="rounded-md p-2 text-soft hover:text-brand" title="لوحة التحكم" aria-label="لوحة التحكم">
              <IconWrench width={19} height={19} />
            </Link>
            <Link to="/cart" className="relative rounded-md p-2 text-ink hover:text-brand" aria-label="السلة">
              <IconCart />
              {count > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* nav row */}
      <nav className="hidden border-t border-line/60 lg:block">
        <div className="container-x flex items-center gap-1 overflow-x-auto py-1.5">
          <NavLink to="/catalog" className={navLink} end>
            كل الكتب
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c.name} to={`/catalog?category=${encodeURIComponent(c.name)}`} className={navLink}>
              {c.name}
            </NavLink>
          ))}
          <Link to="/#how" className="whitespace-nowrap px-3 py-2 text-[13px] font-medium text-brand hover:text-brand-dark">
            كيف أطلب؟ 💬
          </Link>
        </div>
      </nav>

      {/* mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-80 max-w-[85vw] flex-col p-0 lg:hidden">
          <SheetHeader className="border-b border-line px-4 py-4 text-start">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">
                <span className="text-brand">كُتُبِي</span>.ما
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق">
                <IconClose />
              </Button>
            </div>
          </SheetHeader>

          <form onSubmit={submitSearch} className="flex items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex flex-1 items-center gap-2 rounded-md bg-gray-50 px-3 ring-1 ring-inset ring-line">
              <IconSearch className="text-soft" width={18} height={18} />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" className="px-4 py-2">بحث</Button>
          </form>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {[{ name: 'كل الكتب' }, ...categories].map((c) => (
              <Link
                key={c.name}
                to={c.name === 'كل الكتب' ? '/catalog' : `/catalog?category=${encodeURIComponent(c.name)}`}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-brand-pale hover:text-brand"
              >
                {c.name}
              </Link>
            ))}
            <Link to="/#how" onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-sm font-semibold text-brand hover:bg-brand-pale">
              كيف أطلب؟ 💬
            </Link>
          </nav>

          <div className="border-t border-line p-4">
            <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm text-soft hover:text-brand">
              <IconWrench width={16} height={16} /> لوحة التحكم
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}