import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/upload-image
 * Body: { file: { name, type, base64 } }
 * Header: Authorization: Bearer <supabase-access-token>
 *
 * 1. Verifies the caller is a Supabase user with role = 'admin'
 * 2. Uploads the image to Cloudflare R2 (S3-compatible)
 * 3. Returns the public URL for storage in the `books.cover_image` column
 */
export const config = {
  path: '/api/upload-image',
};

const MAX_BYTES = 6 * 1024 * 1024; // keep under Netlify's ~10MB payload limit

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ---------- 1. Auth: must be an admin ----------
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return Response.json({ error: 'غير مصرّح به' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'Supabase server variables غير مضبوطة (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return Response.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'admin') {
      return Response.json({ error: 'صلاحيات غير كافية' }, { status: 403 });
    }

    // ---------- 2. R2 configuration ----------
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      return Response.json(
        { error: 'متغيرات R2 غير مضبوطة — عيّن R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL' },
        { status: 500 }
      );
    }

    // ---------- 3. Read & validate payload ----------
    const body = await req.json();
    const file = body?.file;
    if (!file?.base64 || !file?.type || !file?.name) {
      return Response.json({ error: 'الملف مطلوب (base64 + type + name)' }, { status: 400 });
    }

    const cleanName =
      (file.name || 'cover').replace(/[^\w.\-]/g, '_').replace(/\.[^.]+$/, '') || 'cover';
    const extMatch = file.type.match(/\/(\w+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
    const allowed = ['png', 'jpeg', 'jpg', 'webp', 'gif', 'svg', 'avif'];
    if (!allowed.includes(ext)) {
      return Response.json({ error: `صيغة غير مدعومة: ${ext}` }, { status: 400 });
    }

    const imageBuffer = Buffer.from(file.base64, 'base64');
    if (imageBuffer.length === 0) {
      return Response.json({ error: 'ملف فارغ' }, { status: 400 });
    }
    if (imageBuffer.length > MAX_BYTES) {
      return Response.json({ error: 'حجم الصورة يتجاوز 6MB' }, { status: 413 });
    }

    // ---------- 4. Upload to R2 ----------
    const key = `covers/${Date.now()}-${cleanName}.${ext}`;
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const url = `${publicUrl.replace(/\/+$/, '')}/${key}`;
    return Response.json({ url, key });
  } catch (err) {
    console.error('upload-image error:', err);
    return Response.json({ error: `حدث خطأ أثناء الرفع: ${err.message || err}` }, { status: 500 });
  }
}