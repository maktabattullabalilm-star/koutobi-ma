import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { IconBook, IconClose, IconGrid, IconInbox, IconLogout, IconMenu, IconWrench, IconShield } from '../../components/icons';

const LINKS = [
  { to: '/admin/dashboard', label: 'نظرة عامة', Icon: IconInbox, end: true },
  { to: '/admin/books', label: 'الكتب', Icon: IconBook },
  { to: '/admin/catalog', label: 'بيانات الكتالوج', Icon: IconGrid },
  { to: '/admin/orders', label: 'الطلبات', Icon: IconWrench },
  { to: '/admin/settings', label: 'الإعدادات', Icon: IconShield },
];

export default function AdminLayout() {
  const { session, profile, loading, isAdmin, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const active = ({ isActive }) =>
    `flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-brand'
    }`;

  const doSignOut = async () => {
    await signOut();
    setDrawer(false);
    show('تم تسجيل الخروج');
    navigate('/admin');
  };

  useEffect(() => {
    if (loading) return;
    if (!session) navigate('/admin', { replace: true });
    else if (session && !isAdmin) navigate('/admin', { replace: true });
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return (
      <div className="container-x py-20 text-center">
        <Spinner className="mx-auto size-10 text-brand" />
        <p className="mt-3 text-sm text-soft">جارٍ التحقق من الصلاحيات…</p>
      </div>
    );
  }

  const brand = (
    <NavLink to="/" className="flex items-center gap-2 border-b border-line px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-lg font-bold text-white">ك</span>
      <div>
        <div className="font-display text-base font-bold leading-tight text-ink">لوحة التحكم</div>
        <div className="text-[11px] text-soft">مكتبة كُتُبِي.ما</div>
      </div>
    </NavLink>
  );

  const profileBox = (
    <div className="border-t border-line p-3">
      <div className="mb-2 truncate px-3 text-xs text-soft">
        {profile?.email}
        <span className="mt-0.5 block rounded-sm bg-brand-pale px-1.5 py-0.5 text-[10px] font-bold text-brand">مدير المتجر</span>
      </div>
      <button
        onClick={doSignOut}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-danger hover:bg-rose-50"
      >
        <IconLogout width={18} height={18} /> تسجيل الخروج
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-white md:flex">
        {brand}
        <nav className="flex-1 space-y-1 p-3">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={active}>
              <l.Icon width={18} height={18} /> {l.label}
            </NavLink>
          ))}
        </nav>
        {profileBox}
      </aside>

      {/* drawer (mobile) */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="right" className="flex w-72 max-w-[85vw] flex-col p-0 md:hidden">
          <SheetHeader className="border-b border-line px-4 py-3 text-start">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display text-lg font-bold">لوحة التحكم</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setDrawer(false)} aria-label="إغلاق">
                <IconClose />
              </Button>
            </div>
          </SheetHeader>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" onClick={() => setDrawer(false)}>
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={active}>
                <l.Icon width={18} height={18} /> {l.label}
              </NavLink>
            ))}
            <NavLink to="/" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-brand">
              معاينة المتجر ↗
            </NavLink>
          </nav>
          {profileBox}
        </SheetContent>
      </Sheet>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile topbar */}
        <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="القائمة">
            <IconMenu />
          </Button>
          <span className="font-display text-lg font-bold text-ink">لوحة التحكم</span>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
