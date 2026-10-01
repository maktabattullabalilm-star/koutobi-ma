import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, supabaseErrorHint } from '../../lib/supabase';
import { challengeFactor, getVerifiedTotpFactor, verifyFactorCode } from '../../lib/mfa';
import { STORE_NAME } from '../../lib/site';
import { useToast } from '../../components/Toast';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconWrench } from '../../components/icons';

export default function AdminLogin() {
  const { supabaseEnabled, session, isAdmin, loading, signIn, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  // Invite-only: no public signup on /admin. New admins are created
  // exclusively via the one-time /admin/setup invite link (docs/backlog/14).
  const [mode, setMode] = useState('login'); // login | forgot
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
        try {
          await signIn(form.email.trim(), form.password);
        } catch {
          // Generic on purpose: no account-enumeration via distinct messages.
          throw new Error('بيانات الدخول غير صحيحة — تحقق من البريد وكلمة المرور');
        }
        // Password OK — is a second factor enrolled?
        // Listing may fail transiently (then we continue: nothing to challenge).
        // But once a factor is KNOWN, its challenge must succeed (fail closed).
        let factor = null;
        try {
          factor = await getVerifiedTotpFactor(supabase);
        } catch {
          factor = null;
        }
        if (factor) {
          try {
            const ch = await challengeFactor(supabase, factor.id);
            setMfa({ factorId: factor.id, challengeId: ch.id, code: '' });
          } catch {
            await signOut();
            throw new Error('تعذّر بدء التحقق بخطوتين — حاول مجددًا');
          }
        }
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
      await verifyFactorCode(supabase, {
        factorId: mfa.factorId,
        challengeId: mfa.challengeId,
        code: mfa.code,
      });
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
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-2xl">
                  🔐
                </span>
                <h1 className="mt-3 text-lg font-bold text-ink">التحقق بخطوتين</h1>
                <p className="mt-1 text-sm text-soft">
                  افتح تطبيق المصادقة في هاتفك وأدخل الأرقام الستة الظاهرة فيه.
                </p>
                {error && (
                  <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>
                )}
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
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
              ك
            </span>
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
              {mode === 'login' ? 'تسجيل الدخول' : 'استعادة كلمة المرور'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate>
              {error && (
                <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-danger">{error}</div>
              )}
              {mode === 'forgot' && resetSent && (
                <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
                  أُرسل الرابط — تحقق من بريدك (ومجلد الرسائل غير المرغوبة) ثم اتبع الرابط لتعيين كلمة مرور
                  جديدة.
                </div>
              )}

              <Label className="mt-4 block" htmlFor="email">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                required
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="mt-1.5 text-left"
              />

              {mode !== 'forgot' && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <Label htmlFor="password">كلمة المرور</Label>
                    {mode === 'login' && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                          setResetSent(false);
                        }}
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
                    className="mt-1.5 text-left"
                  />
                </>
              )}

              <Button type="submit" disabled={busy} className="mt-6 w-full py-3">
                {busy ? '…' : mode === 'login' ? 'دخول' : 'إرسال رابط الاستعادة'}
              </Button>

              {mode === 'forgot' && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="mt-3 w-full"
                >
                  العودة لتسجيل الدخول
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-gray-500">
          نوصي بتفعيل حماية البريد الإلكتروني وإنشاء حساب مدير واحد فقط.
        </p>
      </div>
    </div>
  );
}
