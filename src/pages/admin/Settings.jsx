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
import { PASSWORD_MIN } from '../../lib/constants';
import { isValidMaPhone, normalizePhoneDigits } from '../../lib/validators';
import {
  PHONE_SETTING_KEY,
  WHATSAPP_SETTING_KEY,
  formatPhoneDisplay,
  telHref,
} from '../../lib/siteSettings';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactMsg, setContactMsg] = useState('');

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
    getAppSetting(PHONE_SETTING_KEY)
      .then((v) => {
        if (v && /[0-9]/.test(String(v))) setPhone(String(v));
      })
      .catch(() => {});
    getAppSetting(WHATSAPP_SETTING_KEY)
      .then((v) => {
        if (v && /[0-9]/.test(String(v))) setWhatsapp(String(v));
      })
      .catch(() => {});
    refreshMfa();
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    if (newPass.length < PASSWORD_MIN) {
      setPassMsg(`كلمة المرور يجب أن تكون ${PASSWORD_MIN} حرفًا على الأقل`);
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

  const saveContacts = async (e) => {
    e.preventDefault();
    setContactMsg('');
    const p = normalizePhoneDigits(phone);
    const w = normalizePhoneDigits(whatsapp);
    if (p && !isValidMaPhone(p)) {
      setContactMsg('رقم الهاتف غير صالح — مثال: 0624182004');
      return;
    }
    if (w && !isValidMaPhone(w)) {
      setContactMsg('رقم واتساب غير صالح — مثال: 0624182004');
      return;
    }
    if (!p && !w) {
      setContactMsg('أدخل رقم الهاتف ورقم واتساب أولاً');
      return;
    }
    setContactBusy(true);
    try {
      if (p) await adminUpdateAppSetting(PHONE_SETTING_KEY, p);
      if (w) await adminUpdateAppSetting(WHATSAPP_SETTING_KEY, w);
      setContactMsg('تم حفظ أرقام التواصل ✓ — تظهر مباشرة في الموقع');
      show('تم حفظ أرقام التواصل ✓');
    } catch (err) {
      setContactMsg(err?.message || 'تعذّر حفظ الأرقام');
    } finally {
      setContactBusy(false);
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
      <Card className="border-line/70 p-5">
        <h2 className="admin-section-title">أمان الحساب</h2>

        <form onSubmit={changePassword} className="mt-4">
          <h3 className="text-sm font-bold text-ink">تغيير كلمة المرور 🔒</h3>
          <p className="mt-1 text-xs leading-5 text-soft">
            {PASSWORD_MIN} أحرف على الأقل — عبارة مرور طويلة أفضل.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="••••••••••••"
              className="flex-1 py-2 text-left"
            />
            <Button type="submit" variant="outline" disabled={passBusy} className="shrink-0 px-4 py-2">
              {passBusy ? '…' : 'حفظ'}
            </Button>
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
              <Button
                variant="link"
                onClick={disableMfa}
                disabled={mfaBusy}
                className="mt-1 h-auto p-0 text-xs font-medium text-danger"
              >
                {mfaBusy ? '…' : 'إلغاء التفعيل'}
              </Button>
            </div>
          )}
          {mfaState === 'off' && (
            <div className="mt-2">
              <p className="text-xs leading-5 text-soft">
                حماية إضافية لحسابك: رمز متغير من تطبيق في هاتفك عند كل دخول. حمّل تطبيق Google Authenticator
                من متجر التطبيقات أولاً.
              </p>
              <Button
                onClick={startEnroll}
                variant="outline"
                disabled={mfaBusy}
                className="mt-2 w-full py-2 text-xs"
              >
                {mfaBusy ? '…' : 'تفعيل بخطوتين'}
              </Button>
            </div>
          )}
          {mfaState === 'enrolling' && enroll && (
            <form onSubmit={confirmEnroll} className="mt-2 space-y-2">
              <p className="text-xs leading-5 text-soft">
                افتح تطبيق المصادقة في هاتفك، امسح رمز المربعات أعلاه، ثم أدخل الأرقام الستة الظاهرة فيه:
              </p>
              {enroll.qr_code && (
                <div className="mx-auto w-fit rounded-md border border-line bg-white p-2">
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(enroll.qr_code)}`}
                    alt="رمز الاستجابة السريعة للتفعيل"
                    className="block h-40 w-40"
                  />
                </div>
              )}
              {enroll.secret && (
                <p
                  className="break-all rounded-sm bg-gray-50 px-2 py-1.5 text-center font-mono text-[11px] text-soft"
                  dir="ltr"
                >
                  {enroll.secret}
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="123456"
                  className="flex-1 py-2 text-center font-bold tracking-[0.4em]"
                />
                <Button type="submit" disabled={mfaBusy} className="shrink-0 px-4 py-2 text-xs">
                  {mfaBusy ? '…' : 'تأكيد'}
                </Button>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setEnroll(null);
                  setMfaState('off');
                }}
                className="h-auto w-full p-0 text-xs text-soft hover:text-danger"
              >
                إلغاء
              </Button>
            </form>
          )}
          {mfaMsg && <p className="mt-1.5 text-xs text-danger">{mfaMsg}</p>}
          <p className="mt-3 text-[11px] leading-5 text-soft">
            فقدت هاتفك؟ ادخل إلى لوحة تحكم Supabase ← قسم الدخول (Authentication) ← المستخدمون (Users) ← احذف
            عامل المصادقة الخاص بحسابك، ثم ادخل بكلمة المرور فقط.
          </p>
        </div>
      </Card>

      {/* store settings */}
      <Card className="border-line/70 p-5">
        <h2 className="admin-section-title">إعدادات المتجر</h2>
        <form onSubmit={saveContacts} className="mt-4 border-b border-line pb-5">
          <h3 className="text-sm font-bold text-ink">أرقام التواصل 📞</h3>
          <p className="mt-1 text-xs leading-5 text-soft">
            رقم الهاتف يظهر في الموقع وزر الاتصال، ورقم واتساب يُستخدم لجميع أزرار واتساب. التغيير يظهر
            مباشرة في الموقع.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">رقم الهاتف (للاتصال)</span>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                inputMode="tel"
                placeholder="0624182004"
                className="py-2 text-left font-mono tabular-nums"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">رقم واتساب</span>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                dir="ltr"
                inputMode="tel"
                placeholder="0624182004"
                className="py-2 text-left font-mono tabular-nums"
              />
            </label>
          </div>
          {(phone || whatsapp) && (
            <p className="mt-2 text-xs text-soft">
              المعاينة:{' '}
              <span dir="ltr" className="inline-block font-mono tabular-nums" style={{ unicodeBidi: 'isolate' }}>
                {formatPhoneDisplay(phone || whatsapp)}
              </span>{' '}
              ·{' '}
              <a href={telHref(phone || whatsapp)} className="text-brand hover:underline" dir="ltr">
                تجربة الاتصال
              </a>
            </p>
          )}
          <Button type="submit" variant="outline" disabled={contactBusy} className="mt-3 px-4 py-2 text-xs">
            {contactBusy ? 'جارٍ الحفظ…' : 'حفظ الأرقام'}
          </Button>
          {contactMsg && <p className="mt-1.5 text-xs text-soft">{contactMsg}</p>}
        </form>
        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">إظهار الكمية (افتراضي) 🔢</h3>
          <p className="mt-1 text-xs leading-5 text-soft">
            يُطبَّق على الكتب المضبوطة على «وراثة الإعداد العام».
          </p>
          <Select value={qtyDefault} onValueChange={saveQtyDefault} disabled={qtyBusy}>
            <SelectTrigger className="mt-2 max-w-xs" aria-label="إظهار الكمية">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hide">إخفاء الكمية</SelectItem>
              <SelectItem value="show">إظهار الكمية الدقيقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
    </div>
  );
}
