import { useEffect } from 'react';

/**
 * Minimal per-route head manager (docs/backlog/19). No dependency —
 * sets title + meta + canonical, restores defaults on unmount.
 */
const DEFAULT_TITLE = 'كُتُبِي.ما — مكتبة الكتب الإسلامية';
const DEFAULT_DESC = 'كُتُبِي.ما — مكتبة إسلامية متخصصة. كتب عربية | الدفع عند الاستلام والتوصيل لجميع المدن';

function upsertMeta(attr, key, content) {
  if (content == null) return null;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

export function useHead({ title, description, image, path } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title ? `${title} | كُتُبِي.ما` : DEFAULT_TITLE;
    document.title = fullTitle;

    const created = [];
    const desc = description || DEFAULT_DESC;
    created.push(upsertMeta('name', 'description', desc));
    created.push(upsertMeta('property', 'og:title', fullTitle));
    created.push(upsertMeta('property', 'og:description', desc));

    const origin = window.location.origin;
    const url = origin + (path || window.location.pathname);
    created.push(upsertMeta('property', 'og:url', url));
    if (image) {
      created.push(upsertMeta('property', 'og:image', image));
      created.push(upsertMeta('name', 'twitter:card', 'summary_large_image'));
    }

    let canonical = document.head.querySelector('link[rel="canonical"]');
    const hadCanonical = !!canonical;
    const prevCanonical = canonical?.getAttribute('href');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    return () => {
      document.title = prevTitle;
      for (const el of created) el?.remove();
      if (hadCanonical && prevCanonical) canonical.setAttribute('href', prevCanonical);
      else if (!hadCanonical) canonical.remove();
    };
  }, [title, description, image, path]);
}

export const SITE_DEFAULTS = { title: DEFAULT_TITLE, description: DEFAULT_DESC };
