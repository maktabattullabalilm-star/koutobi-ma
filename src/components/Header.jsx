import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getCategories } from '../lib/api';
import { buildCategoryTree } from '../lib/catalog';
import { IconCart, IconChevronDown, IconClose, IconMenu, IconSearch } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import StoreBrand from './StoreBrand';
import HashLink from './HashLink';

function CategoryTreeLinks({ nodes = [] }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.id || node.name}>
          <Link
            to={`/catalog?category=${encodeURIComponent(node.name)}`}
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink transition hover:bg-brand-pale hover:text-brand"
          >
            <bdi dir="auto" className="min-w-0 truncate">
              {node.name}
            </bdi>
            {node.totalCount != null && (
              <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-soft">
                {node.totalCount}
              </span>
            )}
          </Link>
          {node.children?.length > 0 && (
            <div className="ms-2 border-s border-line/60 ps-1">
              <CategoryTreeLinks nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function MobileCategoryLinks({ nodes = [], depth = 0, onNavigate }) {
  return nodes.map((node) => (
    <div key={node.id || node.name}>
      <Link
        to={`/catalog?category=${encodeURIComponent(node.name)}`}
        onClick={onNavigate}
        style={{ paddingInlineStart: `${12 + depth * 14}px` }}
        className="flex items-center justify-between gap-2 rounded-md py-3 pe-3 text-sm font-medium text-ink hover:bg-brand-pale hover:text-brand"
      >
        <span className="min-w-0 truncate">
          {depth > 0 && (
            <span className="me-1 text-soft" aria-hidden="true">
              ↳
            </span>
          )}
          <bdi dir="auto">{node.name}</bdi>
        </span>
        {node.totalCount != null && (
          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-soft">
            {node.totalCount}
          </span>
        )}
      </Link>
      {node.children?.length > 0 && (
        <MobileCategoryLinks nodes={node.children} depth={depth + 1} onNavigate={onNavigate} />
      )}
    </div>
  ));
}

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

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

  const navLink = 'whitespace-nowrap px-3 py-2 text-[13px] font-medium text-ink transition hover:text-brand';

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur-sm">
      <div className="container-x">
        {/* top row */}
        <div className="flex h-16 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <IconMenu />
          </Button>

          <StoreBrand compact />

          <form onSubmit={submitSearch} role="search" className="mx-auto hidden w-full max-w-md lg:block">
            <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 ring-1 ring-inset ring-line focus-within:ring-brand">
              <IconSearch className="shrink-0 text-soft" width={18} height={18} />
              <input
                dir="auto"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن كتاب، مؤلف، تصنيف…"
                aria-label="البحث في المكتبة"
                type="search"
                className="w-full bg-transparent py-2.5 text-sm text-ink outline-hidden placeholder:text-gray-500"
              />
            </div>
          </form>

          <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
            <Link to="/cart" className="relative rounded-md p-2 text-ink hover:text-brand" aria-label="السلة">
              <IconCart />
              {count > 0 && (
                <span className="absolute -top-0.5 -start-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* nav row */}
      <nav className="hidden border-t border-line/60 lg:block">
        <div className="container-x flex flex-wrap items-center gap-1 py-1.5">
          <Link to="/catalog" className={navLink}>
            كل الكتب
          </Link>
          {tree.map((c) =>
            c.children?.length > 0 ? (
              <div key={c.id || c.name} className="group relative">
                <Link
                  to={`/catalog?category=${encodeURIComponent(c.name)}`}
                  className={`${navLink} inline-flex items-center gap-1`}
                  aria-haspopup="true"
                >
                  <bdi dir="auto">{c.name}</bdi>
                  <IconChevronDown width={12} height={12} className="text-soft" />
                </Link>
                <div className="invisible absolute start-0 top-full z-50 max-h-[70vh] w-72 overflow-y-auto pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="overflow-hidden rounded-lg border border-line bg-white shadow-lift">
                    <div className="border-b border-line/60 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-bold text-soft">تصنيفات «{c.name}»</p>
                    </div>
                    <div className="p-2">
                      <CategoryTreeLinks nodes={c.children} />
                    </div>
                    <Link
                      to={`/catalog?category=${encodeURIComponent(c.name)}`}
                      className="flex items-center justify-between border-t border-line/60 px-3 py-2.5 text-xs font-bold text-brand transition hover:bg-brand-pale"
                    >
                      <span>عرض كل «{c.name}»</span>
                      <span aria-hidden="true">←</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={c.id || c.name}
                to={`/catalog?category=${encodeURIComponent(c.name)}`}
                className={navLink}
              >
                <bdi dir="auto">{c.name}</bdi>
              </Link>
            )
          )}
          <HashLink to="/#how" className={navLink}>
            كيف أطلب؟
          </HashLink>
        </div>
      </nav>

      {/* mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-80 max-w-[85vw] flex-col p-0 lg:hidden">
          <SheetHeader className="border-b border-line px-4 py-4 text-start">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">
                <StoreBrand compact onClick={() => setOpen(false)} />
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق">
                <IconClose />
              </Button>
            </div>
          </SheetHeader>

          <form
            onSubmit={submitSearch}
            role="search"
            className="flex items-center gap-2 border-b border-line px-4 py-3"
          >
            <div className="flex flex-1 items-center gap-2 rounded-md bg-gray-50 px-3 ring-1 ring-inset ring-line">
              <IconSearch className="text-soft" width={18} height={18} />
              <Input
                dir="auto"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                aria-label="البحث في المكتبة"
                type="search"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" className="px-4 py-2">
              بحث
            </Button>
          </form>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <Link
              to="/catalog"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-brand-pale hover:text-brand"
            >
              كل الكتب
            </Link>
            <MobileCategoryLinks nodes={tree} onNavigate={() => setOpen(false)} />
            <HashLink
              to="/#how"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-brand-pale hover:text-brand"
            >
              كيف أطلب؟
            </HashLink>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
