import { requireAdmin } from '../lib/auth.js';
import { bucket, deleteObject } from '../lib/r2.js';
import { R2_KEY_RE } from '../lib/media.js';

/**
 * DELETE /api/delete-image   (routed by worker/index.js)
 * POST is also accepted: some clients/proxies strip DELETE bodies, so the
 * dashboard sends POST with the same shape.
 * Body: { key: "covers/169...-cover.jpg" }
 * Header: Authorization: Bearer <supabase-access-token>
 *
 * 1. Verifies the caller is a Supabase user with role = 'admin'
 *    (same anon-key + RLS pattern as upload-image — no service-role key).
 * 2. Validates the key lives under our `covers/` prefix (no `..`, no extra `/`).
 * 3. Deletes the object from Cloudflare R2 via the native bucket binding.
 */
export async function handleDeleteImage(request, env) {
  try {
    if (request.method !== 'DELETE' && request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ---------- 1. Auth: must be an admin (shared anon+RLS gate) ----------
    const auth = await requireAdmin(env, request);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    // ---------- 2. Validate the key ----------
    const body = await request.json().catch(() => ({}));
    const key = body?.key;
    if (typeof key !== 'string' || !R2_KEY_RE.test(key)) {
      return Response.json({ error: 'مفتاح الصورة غير صالح' }, { status: 400 });
    }

    // ---------- 3. R2 configuration (bucket binding) ----------
    const bkt = bucket(env);
    if (!bkt) {
      return Response.json({ error: 'R2 غير مضبوط — تحقق من ربط الحاوية (r2_buckets)' }, { status: 500 });
    }

    // ---------- 4. Delete from R2 ----------
    await deleteObject(bkt, key);

    return Response.json({ ok: true, key });
  } catch (err) {
    console.error('delete-image error:', err);
    return Response.json({ error: 'حدث خطأ أثناء الحذف — حاول مجددًا' }, { status: 500 });
  }
}
