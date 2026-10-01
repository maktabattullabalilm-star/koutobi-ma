/**
 * Central API client for browser → backend calls (docs/backlog/21).
 * - injects the admin JWT (no per-call `Bearer ${...}` drift)
 * - aborts after 25s (no hanging fetches)
 * - maps failures to short Arabic messages (never leaks internals)
 */

const TIMEOUT_MS = 25000;

export function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken || ''}` };
}

export async function apiPost(endpoint, body, accessToken) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader(accessToken) },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error || `فشل الطلب (${res.status})`);
      err.code = json?.code;
      throw err;
    }
    return json;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('انتهت المهلة — تحقق من الاتصال وحاول مجددًا');
    throw err instanceof Error ? err : new Error('تعذّر الاتصال — حاول مجددًا');
  } finally {
    clearTimeout(timer);
  }
}

export async function apiDelete(endpoint, body, accessToken) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader(accessToken) },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error || `فشل الطلب (${res.status})`);
      err.code = json?.code;
      throw err;
    }
    return json;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('انتهت المهلة — تحقق من الاتصال وحاول مجددًا');
    throw err instanceof Error ? err : new Error('تعذّر الاتصال — حاول مجددًا');
  } finally {
    clearTimeout(timer);
  }
}
