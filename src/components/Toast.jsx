import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { IconCheck } from './icons';

const ToastCtx = createContext(null);

const TONE_CLASS = {
  ok: 'bg-ink text-white',
  error: 'bg-danger text-white',
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, tone }
  const timer = useRef(null);

  const show = useCallback((message, tone = 'ok') => {
    setToast({ message, tone: tone === 'error' ? 'error' : 'ok' });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lift ${TONE_CLASS[toast.tone]}`}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"
            >
              <IconCheck width={12} height={12} />
            </span>
            <span dir="auto">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
