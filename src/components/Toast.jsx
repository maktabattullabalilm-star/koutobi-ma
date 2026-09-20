import { createContext, useCallback, useContext, useState } from 'react';
import { IconCheck } from './icons';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [timer, setTimer] = useState(null);

  const show = useCallback(
    (message) => {
      setToast(message);
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => setToast(null), 2600);
      setTimer(t);
    },
    [timer]
  );

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lift">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
              <IconCheck width={12} height={12} />
            </span>
            {toast}
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