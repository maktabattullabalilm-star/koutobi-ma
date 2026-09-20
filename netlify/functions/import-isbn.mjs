import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { isbnToBookFields, lookupIsbn, normalizeIsbn } from '../../src/lib/importers.js';

/**
 * POST /api/import-isbn
 * Body: { isbn }
 * Header: Authorization: Bearer <supabase-access-token> (admin only)
 *
 * Lookup chain: Open Library → Google Books (first hit wins).
 * Returns { fields, cover: { url, r2_key } | null, warnings, source }.
 * `fields` uses BookForm names; price is NEVER imported.
 * The cover is downloaded to OUR R2 (never hotlinked) when possible.
 */
export const config = {
  path: '/api/import-isbn',
};

const MAX_BYTES = 6 * 1024 * 1024;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function requireAdmin(req) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'غير مصرّح به', status: 401 };

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
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

  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') return { error: 'صلاحيات غير كافية', status: 403 };
  return { ok: true };
}

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { s3, bucket, publicUrl: publicUrl.replace(/\/+$/, '') };
}

function extFromContentType(ct) {
  const m = String(ct || '').match(/image\/(jpeg|jpg|png|webp|gif|avif)/i);
  if (!m) return null;
  return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
}

/** Download a remote cover into our R2. Returns { url, r2_key } or throws. */
async function downloadCoverToR2(coverUrl) {
  const r2 = r2Client();
  if (!r2) throw new Error('R2 غير مضبوط');
  const res = await fetch(coverUrl, { headers: { 'User-Agent': BROWSER_UA } });
  if (!res.ok) throw new Error(`cover HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  const ext = extFromContentType(ct);
  if (!ext) throw new Error('صيغة الغلاف غير مدعومة');
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX_BYTES) throw new Error('حجم الغلاف غير صالح');
  const key = `covers/imported-${Date.now()}.${ext}`;
  await r2.s3.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: buf,
      ContentType: ct.split(';')[0],
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return { url: `${r2.publicUrl}/${key}`, r2_key: key };
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const auth = await requireAdmin(req);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const isbn = normalizeIsbn(body?.isbn);
    if (!isbn) return Response.json({ error: 'رقم ISBN مطلوب' }, { status: 400 });

    let found;
    try {
      found = await lookupIsbn(isbn);
    } catch (e) {
      return Response.json({ error: e?.message || 'تعذّر البحث' }, { status: 422 });
    }

    const warnings = [];
    if (!found.fields.title) warnings.push('لم يُعثر على العنوان');
    if (!found.fields.author) warnings.push('لم يُعثر على المؤلف — تحقق منه يدوياً (الكتب العربية غالباً غائبة)');

    let cover = null;
    if (found.cover_url) {
      try {
        cover = await downloadCoverToR2(found.cover_url);
      } catch {
        cover = { url: found.cover_url, r2_key: null };
        warnings.push('تعذّر نسخ الغلاف إلى التخزين — سيُستخدم الرابط الأصلي');
      }
    } else {
      warnings.push('لا توجد صورة غلاف في المصدر');
    }

    return Response.json({
      fields: isbnToBookFields(found.fields),
      cover,
      warnings,
      source: found.source,
    });
  } catch (err) {
    console.error('import-isbn error:', err);
    return Response.json({ error: `حدث خطأ أثناء الاستيراد: ${err.message || err}` }, { status: 500 });
  }
}
