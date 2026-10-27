import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';

/**
 * Online-only storefront. The catalogue, prices and contact details all live in
 * the database, so there is no offline shell or cached fallback to show. When
 * the device reports no connection we replace the app with a single message and
 * a reload action (the user explicitly reloads after reconnecting).
 */
export default function NetworkGuard({ children }) {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return children;

  return (
    <div
      dir="rtl"
      role="alert"
      className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-card">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-pale text-brand">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={32}
            height={32}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </span>
        <h1 className="mt-5 text-xl font-bold text-ink">{t('network.offlineTitle')}</h1>
        <p className="mt-2 text-sm leading-7 text-soft">{t('network.offlineBody')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          {t('network.reload')}
        </button>
      </div>
    </div>
  );
}
