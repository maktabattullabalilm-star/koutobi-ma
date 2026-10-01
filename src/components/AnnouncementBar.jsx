import { useEffect, useRef, useState } from 'react';
import { ar, t } from '../lib/i18n';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import { CONTENT_DEFAULTS } from '../lib/storefrontContent';

const MESSAGES = ar.announcement.messages;

export default function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [active, setActive] = useState(true);
  const timer = useRef(null);
  const saved = useStorefrontContent()?.announcement || { content: CONTENT_DEFAULTS.announcement, visible: true };
  const messages = saved.content.messages?.filter(Boolean) || MESSAGES;

  useEffect(() => {
    if (!active) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    timer.current = setInterval(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer.current);
  }, [active, messages.length]);

  if (!active || !saved.visible || !messages.length) return null;
  return (
    <div className="relative overflow-hidden bg-brand text-white">
      <div className="container-x flex h-10 items-center justify-center text-center text-[13px] font-medium sm:text-sm">
        {messages.map((m, i) => (
          <span
            key={m}
            dir="auto"
            className={`absolute transition-opacity duration-500 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== idx}
          >
            {m}
          </span>
        ))}
      </div>
      <button
        onClick={() => setActive(false)}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label={t('announcement.close')}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}
