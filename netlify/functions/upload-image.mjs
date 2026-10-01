import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from './_lib/auth.mjs';
import { r2Client } from './_lib/r2.mjs';
import { validateImageUpload, buildR2Key } from './_lib/media.mjs';

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

    // ---------- 1. Auth: must be an admin (shared anon+RLS gate) ----------
    const auth = await requireAdmin(req);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    // ---------- 2. R2 configuration (shared, server-only env) ----------
    const r2 = r2Client();
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!r2 || !publicUrl) {
      return Response.json(
        {
          error:
            'متغيرات R2 غير مضبوطة — عيّن R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL',
        },
        { status: 500 }
      );
    }
    const { s3, bucket } = r2;

    // ---------- 3. Read & validate payload ----------
    const body = await req.json();
    const file = body?.file;
    if (!file?.base64 || !file?.type || !file?.name) {
      return Response.json({ error: 'الملف مطلوب (base64 + type + name)' }, { status: 400 });
    }

    const cleanName = (file.name || 'cover').replace(/[^\w.-]/g, '_').replace(/\.[^.]+$/, '') || 'cover';

    const imageBuffer = Buffer.from(file.base64, 'base64');
    if (imageBuffer.length === 0) {
      return Response.json({ error: 'ملف فارغ' }, { status: 400 });
    }
    if (imageBuffer.length > MAX_BYTES) {
      return Response.json({ error: 'حجم الصورة يتجاوز 6MB' }, { status: 413 });
    }

    // Server-truth validation: magic bytes must match claimed MIME.
    // SVG + any non-raster format rejected (stored-XSS + polyglot risk).
    // Client contract: browser pre-resizes to ≤180KB jpeg/webp (see src/lib/images.js);
    // server cap here is a hard backstop, not the target size.
    const checked = validateImageUpload(imageBuffer, file.type);
    if (!checked) {
      return Response.json(
        { error: 'صيغة الصورة غير مدعومة أو غير صالحة (PNG/JPEG/WebP/GIF/AVIF فقط)' },
        { status: 400 }
      );
    }

    // ---------- 4. Upload to R2 ----------
    const key = buildR2Key(cleanName, checked.ext);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: checked.mime,
        ContentDisposition: 'inline',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const url = `${publicUrl.replace(/\/+$/, '')}/${key}`;
    return Response.json({ url, key });
  } catch (err) {
    console.error('upload-image error:', err);
    return Response.json({ error: 'حدث خطأ أثناء الرفع — حاول مجددًا' }, { status: 500 });
  }
}
