import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/delete-image
 * Body: { key: "covers/169...-cover.jpg" }
 * Header: Authorization: Bearer <supabase-access-token>
 *
 * 1. Verifies the caller is a Supabase user with role = 'admin'
 *    (same anon-key + RLS pattern as upload-image — no service-role key).
 * 2. Validates the key lives under our `covers/` prefix (no `..`, no extra `/`).
 * 3. Deletes the object from Cloudflare R2.
 */
export const config = {
  path: '/api/delete-image',
};

const KEY_RE = /^covers\/[A-Za-z0-9._-]+$/;

export default async function handler(req) {
  try {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ---------- 1. Auth: must be an admin ----------
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return Response.json({ error: 'غير مصرّح به' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return Response.json(
        { error: 'Supabase server variables غير مضبوطة (SUPABASE_URL / SUPABASE_ANON_KEY)' },
        { status: 500 }
      );
    }

    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userErr,
    } = await client.auth.getUser();
    if (userErr || !user) {
      return Response.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    const { data: profile } = await client
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'admin') {
      return Response.json({ error: 'صلاحيات غير كافية' }, { status: 403 });
    }

    // ---------- 2. Validate the key ----------
    const body = await req.json().catch(() => ({}));
    const key = body?.key;
    if (typeof key !== 'string' || !KEY_RE.test(key)) {
      return Response.json({ error: 'مفتاح الصورة غير صالح' }, { status: 400 });
    }

    // ---------- 3. R2 configuration ----------
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return Response.json(
        { error: 'متغيرات R2 غير مضبوطة — عيّن R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET' },
        { status: 500 }
      );
    }

    // ---------- 4. Delete from R2 ----------
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    return Response.json({ ok: true, key });
  } catch (err) {
    console.error('delete-image error:', err);
    return Response.json({ error: `حدث خطأ أثناء الحذف: ${err.message || err}` }, { status: 500 });
  }
}
