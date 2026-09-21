import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, supabaseErrorHint } from '../../lib/supabase';
import { challengeFactor, getVerifiedTotpFactor, verifyFactorCode } from '../../lib/mfa';
import { STORE_NAME } from '../../lib/config';
import { useToast } from '../../components/Toast';
import { Spinner } from '@/components/ui/spinner';
import { IconWrench } from '../../components/icons';

export default function AdminLogin() {
  const { supabaseEnabled, session, isAdmin, loading, signIn, signUp, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // MFA challenge state: null | { factorId, challengeId, code }
  const [mfa, setMfa] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const email = form.email.trim();
        if (!email) throw new Error('أدخل بريدك الإلكتروني أولاً');
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });
        if (resetErr) throw resetErr;
        setResetSent(true);
        show('أُرسل رابط الاستعادة إلى بريدك ✓');
      } else if (mode === 'login') {
        await signIn(form.email.trim(), form.password);
        // Password OK — is a second factor enrolled? (fails open: no factor → plain login)
        try {
          const factor = await getVerifiedTotpFactor(supabase);
          if (factor) {
            const ch = await challengeFactor(supabase, factor.id);
            setMfa({ factorId: factor.id, challengeId: ch.id, code: '' });
          }
        } catch {
          /* listFactors/challenge unavailable → continue without MFA */
        }
      } else {
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

  const submitMfa = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyFactorCode(supabase, { factorId: mfa.factorId, challengeId: mfa.challengeId, code: mfa.code });
      show('تم التحقق بخطوتين ✓');
      setMfa(null);
      // onAuthStateChange picks up the aal2 session → redirect below.
    } catch (err) {
      setError(err?.message || 'رمز غير صالح — حاول مجدداً');
    } finally {
      setBusy(false);
    }
  };

  const cancelMfa = async () => {
    await signOut();
    setMfa(null);
    setError('');
  };

  if (!supabaseEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-line p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
            <IconWrench width={26} height={26} />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">لوحة التحكم غير جاهزة</h1>
          <p className="mt-2 text-sm leading-7 text-soft">{supabaseErrorHint()}</p>
          <Button asChild className="mt-6">
            <Link to="/">العودة إلى المتجر</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-10 text-brand" />
      </div>
    );
  }

  if (mfa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <Card className="border-line text-center shadow-card">
            <CardContent className="pt-6">
          <form onSubmit={submitMfa} noValidate>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-2xl">🔐</span>
            <h1 className="mt-3 text-lg font-bold text-ink">التحقق بخطوتين</h1>
            <p className="mt-1 text-sm text-soft">أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.</p>
            {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>}
            <Input
              id="mfa-code"
              type="text"
              required
              dir="ltr"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={mfa.code}
              onChange={(e) => setMfa({ ...mfa, code: e.target.value })}
              placeholder="123456"
              className="mt-4 py-3 text-center text-2xl font-bold tracking-[0.5em]"
            />
            <Button type="submit" disabled={busy} className="mt-4 w-full py-3">
              {busy ? 'جارٍ التحقق…' : 'تحقق'}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={cancelMfa}
              className="mt-3 w-full text-soft hover:text-danger"
            >
              إلغاء وتسجيل الخروج
            </Button>
          </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (session) {
    if (isAdmin) navigate('/admin/dashboard', { replace: true });
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-line p-8 text-center shadow-card">
          <h1 className="text-lg font-bold text-ink">مرحباً بك 👋</h1>
          <p className="mt-2 text-sm leading-7 text-soft">
            حسابك مسجّل لكنه ليس حساب مدير.
            <br />
            تواصل مع صاحب المتجر لمنحك صلاحية الإدارة.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => navigate('/')}>العودة إلى المتجر</Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                show('تم تسجيل الخروج');
                navigate('/admin', { replace: true });
              }}
            >
              تسجيل الخروج
            </Button>
          </div>
        </Card>
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

        <Card className="border-line shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === 'login' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}
            </CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={submit} noValidate>
          {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>}
          {mode === 'forgot' && resetSent && (
            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
              أُرسل الرابط — تحقق من بريدك (ومجلد الرسائل غير المرغوبة) ثم اتبع الرابط لتعيين كلمة مرور جديدة.
            </div>
          )}

          <Label className="mt-4 block" htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            required
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="mt-1.5 text-right"
          />

          {mode !== 'forgot' && (
            <>
              <div className="mt-4 flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                {mode === 'login' && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => { setMode('forgot'); setError(''); setResetSent(false); }}
                    className="h-auto p-0 text-xs font-medium"
                  >
                    نسيت كلمة المرور؟
                  </Button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1.5 text-right"
              />
            </>
          )}

          <Button type="submit" disabled={busy} className="mt-6 w-full py-3">
            {busy ? '…' : mode === 'login' ? 'دخول' : mode === 'signup' ? 'إنشاء الحساب' : 'إرسال رابط الاستعادة'}
          </Button>

          {mode === 'forgot' ? (
            <Button
              type="button"
              variant="link"
              onClick={() => { setMode('login'); setError(''); }}
              className="mt-3 w-full"
            >
              العودة لتسجيل الدخول
            </Button>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="mt-3 w-full"
            >
              {mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}
            </Button>
          )}
        </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-gray-400">
          نوصي بتفعيل حماية البريد الإلكتروني وإنشاء حساب مدير واحد فقط.
        </p>
      </div>
    </div>
  );
}