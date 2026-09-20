import { useEffect, useState } from 'react';
import { adminUpdateAppSetting, getAppSetting } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import {
  challengeFactor,
  enrollTotpFactor,
  getVerifiedTotpFactor,
  unenrollFactor,
  verifyFactorCode,
} from '../../lib/mfa';
import { useToast } from '../../components/Toast';
import PageHeader from './PageHeader';

/**
 * Store + account settings (sensitive area, separate from the overview):
 * - account security: password change, TOTP two-factor
 * - store: quantity-visibility default
 */
export default function Settings() {
  const { show } = useToast();

  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passBusy, setPassBusy] = useState(false);

  const [qtyDefault, setQtyDefault] = useState('hide');
  const [qtyBusy, setQtyBusy] = useState(false);

  // 2FA state: 'unknown' | 'off' | 'on' | 'enrolling'
  const [mfaState, setMfaState] = useState('unknown');
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [enroll, setEnroll] = useState(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState('');

  useEffect(() => {
    getAppSetting('show_quantity_default')
      .then((v) => {
        if (v === 'show' || v === 'hide') setQtyDefault(v);
      })
      .catch(() => {});
    refreshMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    if (newPass.length < 8) {
      setPassMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setPassBusy(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: newPass });
      if (upErr) throw upErr;
      setNewPass('');
      setPassMsg('تم تغيير كلمة المرور بنجاح ✓');
      show('تم تغيير كلمة المرور ✓');
    } catch (err) {
      setPassMsg(err?.message || 'تعذّر تغيير كلمة المرور');
    } finally {
      setPassBusy(false);
    }
  };

  const refreshMfa = async () => {
    try {
      const factor = await getVerifiedTotpFactor(supabase);
      if (factor) {
        setMfaState('on');
        setMfaFactorId(factor.id);
      } else {
        setMfaState('off');
        setMfaFactorId(null);
      }
    } catch {
      setMfaState('off');
    }
  };

  const startEnroll = async () => {
    setMfaMsg('');
    setMfaBusy(true);
    try {
      const data = await enrollTotpFactor(supabase);
      setEnroll({ factorId: data.id, qr_code: data.totp?.qr_code || '', secret: data.totp?.secret || '' });
      setEnrollCode('');
      setMfaState('enrolling');
    } catch (err) {
      setMfaMsg(err?.message || 'تعذّر بدء التفعيل');
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    setMfaMsg('');
    setMfaBusy(true);
    try {
      const ch = await challengeFactor(supabase, enroll.factorId);
      await verifyFactorCode(supabase, { factorId: enroll.factorId, challengeId: ch.id, code: enrollCode });
      setEnroll(null);
      setMfaState('on');
      setMfaFactorId(enroll.factorId);
      show('تم تفعيل التحقق بخطوتين ✓');
    } catch (err) {
      setMfaMsg(err?.message || 'رمز غير صالح — حاول مجدداً');
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!mfaFactorId) return;
    if (!window.confirm('إلغاء التحقق بخطوتين؟ ستصبح كلمة المرور وسيلة الدخول الوحيدة.')) return;
    setMfaBusy(true);
    try {
      await unenrollFactor(supabase, mfaFactorId);
      setMfaState('off');
      setMfaFactorId(null);
      show('تم إلغاء التحقق بخطوتين');
    } catch (err) {
      setMfaMsg(err?.message || 'تعذّر الإلغاء');
    } finally {
      setMfaBusy(false);
    }
  };

  const saveQtyDefault = async (value) => {
    setQtyDefault(value);
    setQtyBusy(true);
    try {
      await adminUpdateAppSetting('show_quantity_default', value);
      show('تم حفظ الإعداد الافتراضي ✓');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setQtyBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="الإعدادات ⚙️"
        description="إعدادات الحساب والمتجر الحساسة — في صفحة مستقلة عن نظرة العمل اليومية."
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'الإعدادات' }]}
      />

      {/* account security */}
      <section className="card border border-line/70 p-5">
        <h2 className="admin-section-title">أمان الحساب</h2>

        <form onSubmit={changePassword} className="mt-4">
          <h3 className="text-sm font-bold text-ink">تغيير كلمة المرور 🔒</h3>
          <p className="mt-1 text-xs leading-5 text-soft">8 أحرف على الأقل.</p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              dir="ltr"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="كلمة مرور جديدة"
              className="input flex-1 py-2! text-right!"
            />
            <button type="submit" disabled={passBusy} className="btn-ghost shrink-0 px-4! py-2!">
              {passBusy ? '…' : 'حفظ'}
            </button>
          </div>
          {passMsg && <p className="mt-1.5 text-xs text-soft">{passMsg}</p>}
        </form>

        <div id="mfa-security" className="mt-5 scroll-mt-24 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">التحقق بخطوتين 🔐</h3>
          {mfaState === 'unknown' && <p className="mt-2 text-xs text-soft">جارٍ التحقق…</p>}
          {mfaState === 'on' && (
            <div className="mt-2">
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                مفعّل ✓ — الدخول يتطلب رمز المصادقة
              </p>
              <button onClick={disableMfa} disabled={mfaBusy} className="mt-2 text-xs font-medium text-danger hover:underline">
                {mfaBusy ? '…' : 'إلغاء التفعيل'}
              </button>
            </div>
          )}
          {mfaState === 'off' && (
            <div className="mt-2">
              <p className="text-xs leading-5 text-soft">أضف طبقة حماية: رمز من تطبيق المصادقة (Google Authenticator) عند كل دخول.</p>
              <button onClick={startEnroll} disabled={mfaBusy} className="btn-ghost mt-2 w-full py-2! text-xs">
                {mfaBusy ? '…' : 'تفعيل بخطوتين'}
              </button>
            </div>
          )}
          {mfaState === 'enrolling' && enroll && (
            <form onSubmit={confirmEnroll} className="mt-2 space-y-2">
              <p className="text-xs leading-5 text-soft">امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز الظاهر فيه:</p>
              {enroll.qr_code && (
                <div
                  className="mx-auto w-fit rounded-md border border-line bg-white p-2 [&>svg]:block [&>svg]:h-40 [&>svg]:w-40"
                  dangerouslySetInnerHTML={{ __html: enroll.qr_code }}
                />
              )}
              {enroll.secret && (
                <p className="break-all rounded-sm bg-gray-50 px-2 py-1.5 text-center font-mono text-[11px] text-soft" dir="ltr">
                  {enroll.secret}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="123456"
                  className="input flex-1 py-2! text-center font-bold tracking-[0.4em]"
                />
                <button type="submit" disabled={mfaBusy} className="btn-primary shrink-0 px-4! py-2! text-xs">
                  {mfaBusy ? '…' : 'تأكيد'}
                </button>
              </div>
              <button type="button" onClick={() => { setEnroll(null); setMfaState('off'); }} className="w-full text-center text-xs text-soft hover:text-danger">
                إلغاء
              </button>
            </form>
          )}
          {mfaMsg && <p className="mt-1.5 text-xs text-danger">{mfaMsg}</p>}
          <p className="mt-3 text-[11px] leading-5 text-soft">
            فقدت هاتفك؟ الاستعادة من Supabase Dashboard ← Authentication ← Users ← حذف عامل MFA، ثم الدخول بكلمة المرور.
          </p>
        </div>
      </section>

      {/* store settings */}
      <section className="card border border-line/70 p-5">
        <h2 className="admin-section-title">إعدادات المتجر</h2>
        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">إظهار الكمية (افتراضي) 🔢</h3>
          <p className="mt-1 text-xs leading-5 text-soft">يُطبَّق على الكتب المضبوطة على «وراثة الإعداد العام».</p>
          <select
            value={qtyDefault}
            onChange={(e) => saveQtyDefault(e.target.value)}
            disabled={qtyBusy}
            className="input mt-2 max-w-xs"
          >
            <option value="hide">إخفاء الكمية</option>
            <option value="show">إظهار الكمية الدقيقة</option>
          </select>
        </div>
      </section>
    </div>
  );
}
