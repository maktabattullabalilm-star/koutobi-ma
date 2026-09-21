/**
 * Client-side image helpers.
 * - fitDimensions / isDeletableR2Key are pure (unit-tested).
 * - resizeImageToLimit needs canvas (browser only, hand-tested per TESTING.md).
 */

export const IMAGE_MAX_KB = 180;
export const IMAGE_MAX_DIM = 1600;
export const IMAGE_MAX_COUNT = 5;

/** Scale (w,h) to fit inside maxDim on the longest side. Never upscales. */
export function fitDimensions(width, height, maxDim = IMAGE_MAX_DIM) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w <= 0 || h <= 0 || maxDim <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * Only keys we created may be deleted: exactly `covers/<filename>`,
 * no subfolders, no `..`, safe filename characters.
 * Mirrors the KEY_RE check in netlify/functions/delete-image.mjs.
 */
export function isDeletableR2Key(key) {
  return typeof key === 'string' && /^covers\/[A-Za-z0-9._-]+$/.test(key);
}

/**
 * Pull image Files out of a paste/drop item list (ClipboardEvent /
 * DragEvent DataTransferItemList). Pure and unit-tested — the components
 * just forward `e.clipboardData.items` / `e.dataTransfer.items`.
 * Accepts array-likes of { kind, type, getAsFile }.
 */
export function extractImageFiles(items) {
  const out = [];
  for (const item of Array.from(items || [])) {
    if (item?.kind === 'file' && String(item?.type || '').startsWith('image/')) {
      try {
        const f = item.getAsFile?.();
        if (f) out.push(f);
      } catch {
        /* unreadable item — skip */
      }
    }
  }
  return out;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('ملف الصورة غير صالح'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('تعذّر معالجة الصورة'))),
      type,
      quality
    );
  });
}

/**
 * Resize an image file in the browser so the result is ≤ maxKB.
 * - Max dimension 1600px on the longest side (no upscale).
 * - PNG/GIF/SVG → JPEG (canvas quality param doesn't apply to PNG,
 *   GIF keeps its first frame only); JPEG/WebP keep their type.
 * - JPEG-quality step-down 0.90 → 0.60; if still too big, one extra
 *   pass at 70% dimensions.
 * Returns { blob, contentType, ext }.
 */
export async function resizeImageToLimit(file, { maxDim = IMAGE_MAX_DIM, maxKB = IMAGE_MAX_KB } = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('اختر ملف صورة صالحاً');
  }
  const srcType = file.type;
  const outType = srcType === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const ext = outType === 'image/webp' ? 'webp' : 'jpg';

  const img = await loadImage(file);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) throw new Error('تعذّر قراءة أبعاد الصورة');

  const limit = maxKB * 1024;
  const canvas = document.createElement('canvas');

  const render = async (w, h) => {
    const d = fitDimensions(w, h, maxDim);
    canvas.width = d.width;
    canvas.height = d.height;
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency — paint white behind transparent sources.
    if (outType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, d.width, d.height);
    }
    ctx.drawImage(img, 0, 0, d.width, d.height);
    let quality = 0.9;
    let blob = await canvasToBlob(canvas, outType, quality);
    while (blob.size > limit && quality > 0.6) {
      quality = Math.round((quality - 0.05) * 100) / 100;
      blob = await canvasToBlob(canvas, outType, quality);
    }
    return blob;
  };

  let blob = await render(naturalW, naturalH);
  if (blob.size > limit) {
    // Last resort: shrink dimensions to 70% and retry once.
    blob = await render(Math.round(naturalW * 0.7), Math.round(naturalH * 0.7));
  }
  return { blob, contentType: outType, ext };
}

/** Blob/File → base64 payload (without the data: prefix). */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    reader.readAsDataURL(blob);
  });
}
