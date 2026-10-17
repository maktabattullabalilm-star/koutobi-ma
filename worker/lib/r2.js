/**
 * R2 access for the Cloudflare Worker.
 *
 * Uses the native R2 binding declared in wrangler.jsonc (`r2_buckets`) rather
 * than the S3-compatible API, so there are no S3 credentials to hold or rotate.
 * See: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
 */
export function bucket(env) {
  return env.BUCKET || null;
}

/** Normalised public base URL used to build browser-facing image URLs. */
export function publicUrl(env) {
  const base = env.R2_PUBLIC_URL;
  return base ? base.replace(/\/+$/, '') : '';
}

/** Store one object. `body` accepts ArrayBufferView (our Uint8Array). */
export async function putObject(bkt, key, body, { contentType, contentDisposition = 'inline', cacheControl } = {}) {
  await bkt.put(key, body, {
    httpMetadata: {
      contentType,
      contentDisposition,
      ...(cacheControl ? { cacheControl } : {}),
    },
  });
}

/** Delete one object. R2 deletes are idempotent. */
export async function deleteObject(bkt, key) {
  await bkt.delete(key);
}
