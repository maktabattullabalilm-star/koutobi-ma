/**
 * Supabase native TOTP two-factor helpers.
 * Every function takes the supabase client explicitly → unit-testable,
 * and safe when the client is null (demo mode: callers guard first).
 */

export async function getVerifiedTotpFactor(client) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp || []).find((f) => f.status === 'verified') || null;
}

export async function getAllTotpFactors(client) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return data?.totp || [];
}

/** Start enrollment → { id, totp: { qr_code (SVG), secret, uri } }. */
export async function enrollTotpFactor(client, friendlyName = 'admin-authenticator') {
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName });
  if (error) throw error;
  return data;
}

/** Open a challenge for a factor → { id: challengeId }. */
export async function challengeFactor(client, factorId) {
  const { data, error } = await client.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
}

/** Verify a 6-digit code against a challenge. Resolves with { user, session }. */
export async function verifyFactorCode(client, { factorId, challengeId, code }) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6,8}$/.test(clean)) throw new Error('أدخل رمزاً من 6 أرقام');
  const { data, error } = await client.auth.mfa.verify({ factorId, challengeId, code: clean });
  if (error) throw error;
  return data;
}

export async function unenrollFactor(client, factorId) {
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
