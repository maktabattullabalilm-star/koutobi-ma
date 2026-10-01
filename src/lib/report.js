/**
 * Minimal error reporting (docs/backlog/30). Zero vendor, zero PII leaks.
 * - Without VITE_ERROR_ENDPOINT: console-only (dev + default prod).
 * - With it: POSTs {message, stack, url, at} scrubbed of PII.
 * Upgrade path: point the endpoint at Sentry/GlitchTip envelope API.
 */

const ENDPOINT = (import.meta.env.VITE_ERROR_ENDPOINT || '').replace(/\/+$/, '');

function scrub(text) {
  return String(text || '')
    .replace(/0[5-7]\d{8}|\+?212[5-7]\d{8}/g, '[phone]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

export function reportError(err, context = '') {
  const message = scrub(err?.message || String(err));
  const stack = scrub(err?.stack || '').slice(0, 4000);
  const payload = {
    message,
    stack,
    url: typeof window !== 'undefined' ? window.location.pathname : '',
    context: scrub(context),
    at: new Date().toISOString(),
  };
  if (!ENDPOINT) {
    console.error('[koutobi]', payload.message, context ? `(${payload.context})` : '');
    return;
  }
  try {
    fetch(`${ENDPOINT}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the app for telemetry */
  }
}
