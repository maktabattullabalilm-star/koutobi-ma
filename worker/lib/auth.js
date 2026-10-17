/**
 * Shared admin gate for the Cloudflare Worker (docs/backlog/24).
 * Verifies the caller via the anon key + their own JWT + RLS
 * (`profiles` row with role='admin'). No service-role key anywhere.
 *
 * Secrets come from the Worker's `env` binding, never process.env.
 */
import { createClient } from '@supabase/supabase-js';

export async function requireAdmin(env, req) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'غير مصرّح به', status: 401 };

  const supabaseUrl = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { error: 'Supabase server variables غير مضبوطة (SUPABASE_URL / SUPABASE_ANON_KEY)', status: 500 };
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user) return { error: 'جلسة غير صالحة', status: 401 };

  const { data: profile } = await client.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') return { error: 'صلاحيات غير كافية', status: 403 };
  return { ok: true };
}
