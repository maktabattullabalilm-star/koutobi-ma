/**
 * Shared R2 client for the Cloudflare Worker.
 *
 * Uses `aws4fetch` (WebCrypto SigV4) instead of @aws-sdk/client-s3 so the edge
 * bundle stays tiny and no Node.js compatibility flags are required.
 * See: https://developers.cloudflare.com/r2/examples/aws/aws4fetch/
 *
 * Server-only env (never browser-exposed): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.
 */
import { AwsClient } from 'aws4fetch';

export function r2Client(env) {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;
  const publicUrl = env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3', // required by the SDK, unused by R2
    region: 'auto', // required by the SDK, unused by R2
  });
  return {
    client,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ''),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

/** Upload one object to R2. Throws on non-2xx. */
export async function putObject(r2, key, body, { contentType, contentDisposition = 'inline', cacheControl } = {}) {
  const res = await r2.client.fetch(`${r2.endpoint}/${r2.bucket}/${key}`, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${key} failed: ${res.status} ${await res.text()}`);
  }
}

/** Delete one object from R2. A missing key is treated as success. */
export async function deleteObject(r2, key) {
  const res = await r2.client.fetch(`${r2.endpoint}/${r2.bucket}/${key}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} failed: ${res.status}`);
  }
}
