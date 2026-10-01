import { DELETE_IMAGE_ENDPOINT, UPLOAD_ENDPOINT } from '../config';
import { isDeletableR2Key } from '../images';
import { apiDelete, apiPost } from '../apiClient';

/**
 * Upload a file to R2. Payload contract matches
 * netlify/functions/upload-image.mjs: { file: { name, type, base64 } }.
 */
export async function uploadR2File({ name, type, base64 }, accessToken) {
  const json = await apiPost(UPLOAD_ENDPOINT, { file: { name, type, base64 } }, accessToken).catch((err) => {
    throw new Error(err?.message || 'فشل الرفع');
  });
  if (!json.url || !json.key) throw new Error('استجابة الرفع غير مكتملة');
  return json; // { url, key }
}

/** Delete one R2 object by key. Key must live under `covers/`. */
export async function deleteR2Object(key, accessToken) {
  if (!isDeletableR2Key(key)) throw new Error('مفتاح الصورة غير صالح');
  return apiDelete(DELETE_IMAGE_ENDPOINT, { key }, accessToken).catch((err) => {
    throw new Error(err?.message || 'فشل حذف الصورة');
  });
}
