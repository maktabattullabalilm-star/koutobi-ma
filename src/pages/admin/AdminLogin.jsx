import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabaseErrorHint } from '../../lib/supabase';
import { STORE_NAME } from '../../lib/config';
import { useToast } from '../../components/Toast';
import { IconWrench } from '../../components/icons';

export default function AdminLogin() {
  const { supabaseEnabled, session, isAdmin, loading, signIn, signUp } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await signIn(form.email.trim(), form.password);
      else {
        if (form.password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        await signUp(form.email.trim(), form.password);
        show('تم إنشاء الحساب — قد تحتاج لتأكيد البريد');
        setMode('login');
      }
    } catch (err) {
      setError(err?.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setBusy(false);
    }
  };

  if (!supabaseEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
            <IconWrench width={26} height={26} />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">لوحة التحكم غير جاهزة</h1>
          <p className="mt-2 text-sm leading-7 text-soft">{supabaseErrorHint()}</p>
          <Link to="/" className="btn-primary mt-6">العودة إلى المتجر</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (session) {
    if (isAdmin) navigate('/admin/dashboard', { replace: true });
    else
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
            <h1 className="text-lg font-bold text-ink">مرحباً بك 👋</h1>
            <p className="mt-2 text-sm leading-7 text-soft">
              حسابك مسجّل لكنه ليس حساب مدير.
              <br />
              تواصل مع صاحب المتجر لمنحك صلاحية الإدارة.
            </p>
            <button onClick={() => navigate('/')} className="btn-primary mt-5">العودة إلى المتجر</button>
          </div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">ك</span>
            <span className="text-2xl font-bold">
              <span className="text-brand">كُتُبِي</span>
              <span className="text-ink">.ما</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-soft">لوحة تحكم {STORE_NAME}</p>
        </div>

        <form onSubmit={submit} className="rounded-card border border-line bg-white p-6 shadow-card">
          <h1 className="text-lg font-bold text-ink">{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
          {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>}

          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="email">البريد الإلكتروني</label>
          <input
            id="email"
            type="email"
            required
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="input mt-1.5 !text-right"
          />

          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="password">كلمة المرور</label>
          <input
            id="password"
            type="password"
            required
            dir="ltr"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="input mt-1.5 !text-right"
          />

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-3">
            {busy ? '…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="mt-3 w-full text-center text-sm font-medium text-brand hover:text-brand-dark"
          >
            {mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          نوصي بتفعيل حماية البريد الإلكتروني وإنشاء حساب مدير واحد فقط.
        </p>
      </div>
    </div>
  );
}