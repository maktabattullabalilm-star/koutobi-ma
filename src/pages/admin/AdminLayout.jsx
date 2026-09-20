import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { IconBook, IconInbox, IconLogout, IconWrench, IconGrid } from '../../components/icons';

export default function AdminLayout() {
  const { session, profile, loading, isAdmin, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const active = ({ isActive }) =>
    `flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-brand'
    }`;

  useEffect(() => {
    if (loading) return;
    if (!session) navigate('/admin', { replace: true });
    else if (session && !isAdmin) navigate('/admin', { replace: true });
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return (
      <div className="container-x py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-soft">جارٍ التحقق من الصلاحيات…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-white md:flex">
        <NavLink to="/" className="flex items-center gap-2 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">ك</span>
          <div>
            <div className="text-base font-bold leading-tight text-ink">لوحة التحكم</div>
            <div className="text-[11px] text-soft">مكتبة كُتُبِي.ما</div>
          </div>
        </NavLink>

        <nav className="flex-1 space-y-1 p-3">
          <NavLink to="/admin/dashboard" end className={active}>
            <IconInbox width={18} height={18} /> نظرة عامة
          </NavLink>
          <NavLink to="/admin/books" className={active}>
            <IconBook width={18} height={18} /> الكتب
          </NavLink>
          <NavLink to="/admin/catalog" className={active}>
            <IconGrid width={18} height={18} /> بيانات الكتالوج
          </NavLink>
          <NavLink to="/admin/orders" className={active}>
            <IconWrench width={18} height={18} /> الطلبات
          </NavLink>
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 px-3 text-xs text-soft">
            {profile?.email}
            <span className="mt-0.5 block rounded bg-brand-pale px-1.5 py-0.5 text-[10px] font-bold text-brand">مدير المتجر</span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              show('تم تسجيل الخروج');
              navigate('/admin');
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-danger hover:bg-rose-50"
          >
            <IconLogout width={18} height={18} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* main */}
      <div className="flex flex-1 flex-col">
        {/* mobile topbar */}
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <span className="font-bold text-ink">لوحة التحكم</span>
          <div className="flex items-center gap-2">
            <NavLink to="/admin/books" className="text-sm font-medium text-brand">الكتب</NavLink>
            <NavLink to="/admin/orders" className="text-sm font-medium text-brand">الطلبات</NavLink>
            <button onClick={() => signOut()} className="btn-ghost !px-3 !py-1.5 text-xs" aria-label="تسجيل الخروج">
              <IconLogout width={14} height={14} />
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}