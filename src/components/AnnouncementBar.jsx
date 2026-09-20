import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  '🚚 الدفع عند الاستلام — ادفع عند وصول كتابك',
  '📦 توصيل سريع لجميع المدن المغربية',
  '🎁 خصومات على أوّل طلب عبر واتساب',
];

export default function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [active, setActive] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    timer.current = setInterval(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer.current);
  }, [active]);

  if (!active) return null;
  return (
    <div className="relative overflow-hidden bg-brand text-white">
      <div className="container-x flex h-10 items-center justify-center text-center text-[13px] font-medium sm:text-sm">
        {MESSAGES.map((m, i) => (
          <span
            key={m}
            className={`absolute transition-opacity duration-500 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== idx}
          >
            {m}
          </span>
        ))}
      </div>
      <button
        onClick={() => setActive(false)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label="إغلاق الإعلان"
      >
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}