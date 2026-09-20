import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

/**
 * Target of the Supabase recovery email link (/admin/reset-password#access_token=…).
 * Supabase consumes the hash and opens a recovery session; we just set the new password.
 */
export default function ResetPassword() {
  const { session, loading } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Give onAuthStateChange a beat to pick up the recovery session from the URL hash.
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, [loading]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirm) {
      setError('تأكيد كلمة المرور غير مطابق');
      return;
    }
    setBusy(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: form.password });
      if (upErr) throw upErr;
      show('تم تعيين كلمة المرور الجديدة ✓');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'تعذّر تعيين كلمة المرور — اطلب رابطاً جديداً');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <form onSubmit={submit} className="rounded-card border border-line bg-white p-6 shadow-card">
          <h1 className="text-lg font-bold text-ink">تعيين كلمة مرور جديدة 🔑</h1>
          {!ready || loading ? (
            <p className="mt-4 text-center text-sm text-soft">جارٍ التحقق من رابط الاستعادة…</p>
          ) : !session ? (
            <div className="mt-4">
              <div className="rounded-md bg-rose-50 px-3 py-2 text-sm leading-6 text-danger">
                الرابط غير صالح أو منتهي الصلاحية — اطلب رابط استعادة جديداً من صفحة الدخول.
              </div>
              <Link to="/admin" className="btn-primary mt-4 w-full">العودة لتسجيل الدخول</Link>
            </div>
          ) : (
            <>
              {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>}
              <label className="mt-4 block text-sm font-medium text-ink" htmlFor="new-password">كلمة المرور الجديدة</label>
              <input
                id="new-password"
                type="password"
                required
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8 أحرف على الأقل"
                className="input mt-1.5 !text-right"
              />
              <label className="mt-4 block text-sm font-medium text-ink" htmlFor="confirm-password">تأكيد كلمة المرور</label>
              <input
                id="confirm-password"
                type="password"
                required
                dir="ltr"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="أعد كتابتها"
                className="input mt-1.5 !text-right"
              />
              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-3">
                {busy ? 'جارٍ الحفظ…' : 'تعيين كلمة المرور'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
