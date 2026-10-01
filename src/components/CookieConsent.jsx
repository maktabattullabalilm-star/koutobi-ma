import { useCallback, useEffect, useState } from 'react';
import {
  CATEGORIES,
  COOKIE_INVENTORY,
  acceptAllCookies,
  getConsent,
  rejectOptionalCookies,
  saveCustomCookies,
} from '../lib/cookies';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

function CookieTable({ categoryId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs font-semibold text-brand hover:text-brand-dark"
      >
        {open ? 'إخفاء قائمة ملفات الارتباط' : 'عرض قائمة ملفات الارتباط'}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-105 text-start text-xs">
            <thead>
              <tr className="bg-gray-50 text-soft">
                <th className="px-3 py-2 font-semibold">الاسم</th>
                <th className="px-3 py-2 font-semibold">الغرض</th>
                <th className="px-3 py-2 font-semibold">المدة</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_INVENTORY[categoryId].map((row) => (
                <tr key={row.name} className="border-t border-line align-top">
                  <td className="px-3 py-2 font-mono" dir="auto">
                    {row.name}
                    <span className="block font-sans text-gray-500">{row.storage}</span>
                  </td>
                  <td className="px-3 py-2 leading-5 text-soft">{row.purpose}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-soft">{row.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [choice, setChoice] = useState({ statistics: false, marketing: false });

  const refresh = useCallback(() => {
    const stored = getConsent();
    if (stored) {
      setVisible(false);
      setChoice({ statistics: stored.statistics, marketing: stored.marketing });
    } else {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const reopen = () => {
      const stored = getConsent();
      if (stored) setChoice({ statistics: stored.statistics, marketing: stored.marketing });
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener('koutobi:open-cookie-preferences', reopen);
    return () => window.removeEventListener('koutobi:open-cookie-preferences', reopen);
  }, [refresh]);

  if (!visible) return null;

  const done = (fn) => () => {
    fn();
    setVisible(false);
    setCustomizing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="موافقة ملفات الارتباط"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-5"
    >
      <Card className="mx-auto max-w-3xl border-line bg-white p-4 shadow-lift sm:p-5">
        {!customizing ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-ink">نحترم خصوصيتك 🍪</h2>
              <p className="mt-1 text-xs leading-5 text-soft">
                نستخدم ملفات ضرورية لعمل المتجر (السلة، تأكيد الطلب). الإحصائية والتسويقية اختيارية
                ومعطّلة افتراضياً — التفاصيل في{' '}
                <a href="/privacy-policy" className="font-semibold text-brand hover:underline">
                  سياسة الخصوصية
                </a>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={done(acceptAllCookies)}>
                قبول الكل
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCustomizing(true)}>
                تخصيص
              </Button>
              <Button size="sm" variant="outline" onClick={done(rejectOptionalCookies)}>
                رفض الاختياري
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-ink">تخصيص ملفات الارتباط</h2>
            <p className="mt-1 text-xs leading-5 text-soft">
              اختر الفئات التي توافق عليها. الضرورية تعمل دائماً لأن المتجر لا يعمل بدونها.
            </p>
            <div className="mt-3 space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="rounded-lg border border-line bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-ink">
                      {cat.label}
                      {cat.locked && (
                        <span className="ms-2 rounded-full bg-brand-light px-2 py-0.5 text-[11px] text-brand">
                          دائماً مفعّلة
                        </span>
                      )}
                    </span>
                    <Switch
                      checked={cat.locked ? true : choice[cat.id]}
                      disabled={cat.locked}
                      onCheckedChange={(v) => setChoice((c) => ({ ...c, [cat.id]: v }))}
                      aria-label={`ملفات الارتباط ${cat.label}`}
                    />
                  </div>
                  <CookieTable categoryId={cat.id} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCustomizing(false)}>
                رجوع
              </Button>
              <Button size="sm" variant="outline" onClick={done(rejectOptionalCookies)}>
                رفض الاختياري
              </Button>
              <Button size="sm" onClick={done(() => saveCustomCookies(choice))}>
                حفظ اختياري
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
