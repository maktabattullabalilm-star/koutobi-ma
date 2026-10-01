import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    let frame = 0;
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        frame = window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    // Move screen-reader/keyboard focus to the new page content.
    const main = document.getElementById('main-content');
    const h1 = main?.querySelector('h1');
    (h1 || main)?.setAttribute('tabindex', '-1');
    (h1 || main)?.focus?.({ preventScroll: true });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
