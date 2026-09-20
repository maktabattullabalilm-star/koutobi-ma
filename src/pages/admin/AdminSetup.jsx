import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { IconWrench } from '../../components/icons';

const ERROR_AR = {
  invalid_token: 'رابط التفعيل غير صالح.',
  already_used: 'تم استخدام رابط التفعيل مسبقاً — سجّل الدخول من صفحة الإدارة.',
  not_authorized: 'انتهت الجلسة — سجّل الدخول ثم أعد فتح الرابط.',
};

export default function AdminSetup() {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const navigate = useNavigate();
  const { show } = useToast();

  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <h1 className="text-lg font-bold text-ink">الإعداد غير جاهز</h1>
          <p className="mt-2 text-sm text-soft">لم تُضبط بيانات Supabase بعد.</p>
          <Link to="/" className="btn-primary mt-6">العودة إلى المتجر</Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-danger">
            <IconWrench width={26} height={26} />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">رابط غير صالح</h1>
          <p className="mt-2 text-sm leading-7 text-soft">
            صفحة إعداد المدير تعمل فقط عبر رابط الدعوة الخاص لمرة واحدة.
          </p>
          <Link to="/admin" className="btn-primary mt-6">الذهاب لتسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  const claim = async (userId) => {
    const { data, error: rpcErr } = await supabase.rpc('claim_first_admin', {
      p_user_id: userId,
      p_token: token,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (!data?.ok) throw new Error(ERROR_AR[data?.error] || 'تعذّر تفعيل الحساب.');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsConfirm(false);
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirm) {
      setError('تأكيد كلمة المرور غير متطابق');
      return;
    }
    setBusy(true);
    try {
      const email = form.email.trim();
      let userId = null;

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
      });

      if (signUpErr) {
        // Account may already exist (e.g. signed up but never claimed) — try signing in.
        if (/already registered|already exists|duplicate/i.test(signUpErr.message)) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password: form.password,
          });
          if (signInErr) throw new Error('هذا البريد مسجّل مسبقاً — سجّل الدخول بكلمة مرورك من صفحة الإدارة.');
          userId = signInData.user?.id;
        } else {
          throw signUpErr;
        }
      } else {
        userId = signUpData.user?.id;
      }

      if (!userId) {
        // Email confirmation is enabled in Supabase Auth: no session yet.
        // The link is NOT consumed — reopen it after confirming the email.
        setNeedsConfirm(true);
        return;
      }

      await claim(userId);
      show('تم تفعيل حساب المدير بنجاح 🎉');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">ك</span>
            <span className="text-2xl font-bold">
              <span className="text-brand">كُتُبِي</span>
              <span className="text-ink">.ما</span>
            </span>
          </span>
          <p className="mt-2 text-sm text-soft">إعداد حساب المدير — رابط لمرة واحدة 🔑</p>
        </div>

        {needsConfirm ? (
          <div className="rounded-card border border-line bg-white p-6 text-center shadow-card">
            <h1 className="text-lg font-bold text-ink">تحقق من بريدك 📧</h1>
            <p className="mt-2 text-sm leading-7 text-soft">
              تم إنشاء الحساب. أكّد بريدك الإلكتروني عبر الرابط المرسل إليك،
              ثم <b>أعد فتح رابط الدعوة نفسه</b> لإتمام التفعيل (الرابط ما زال صالحاً).
            </p>
            <Link to="/admin" className="btn-ghost mt-5">صفحة تسجيل الدخول</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-card border border-line bg-white p-6 shadow-card" noValidate>
            <h1 className="text-lg font-bold text-ink">إنشاء حساب المدير</h1>
            {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>}

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="su-email">البريد الإلكتروني</label>
            <input
              id="su-email"
              type="email"
              required
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="input mt-1.5 !text-right"
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="su-pass">كلمة المرور (8 أحرف على الأقل)</label>
            <input
              id="su-pass"
              type="password"
              required
              dir="ltr"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="input mt-1.5 !text-right"
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="su-confirm">تأكيد كلمة المرور</label>
            <input
              id="su-confirm"
              type="password"
              required
              dir="ltr"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="••••••••"
              className="input mt-1.5 !text-right"
            />

            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-3">
              {busy ? 'جارٍ التفعيل…' : 'تفعيل حساب المدير'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              يعمل هذا الرابط مرة واحدة فقط، ويُعطّل نهائياً بعد نجاح التفعيل.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}