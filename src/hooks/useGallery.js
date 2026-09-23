import { useCallback, useEffect, useRef, useState } from 'react';
import { IMAGE_MAX_COUNT, extractImageFiles, resizeImageToLimit } from '../lib/images';
import { swapAdjacent } from '../lib/catalog';
import { useToast } from '../components/Toast';

let uidCounter = 0;
const nextUid = () => `img-${Date.now()}-${uidCounter++}`;

/**
 * Gallery working set extracted from BookForm (docs/backlog/21).
 * Item shape: { uid, id?, url, r2_key?, blob?, ext?, preview?, is_primary }
 * - `blob` set → staged locally, uploaded to R2 on save (never orphaned).
 * - `id` set → already persisted in book_images.
 */
export function useGallery() {
  const { show } = useToast();
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [staging, setStaging] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // Revoke local preview URLs on unmount.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      imagesRef.current.forEach((i) => {
        if (i.preview) URL.revokeObjectURL(i.preview);
      });
    },
    []
  );

  /**
   * Replace the whole set from persisted `book_images` rows.
   * Assigns local uids + primary fallback. Stable identity.
   */
  const resetGallery = useCallback((persisted) => {
    const rows = (persisted || []).map((r) => ({
      uid: nextUid(),
      id: r.id,
      url: r.url,
      r2_key: r.r2_key || null,
      is_primary: !!r.is_primary,
    }));
    if (rows.length && !rows.some((r) => r.is_primary)) rows[0].is_primary = true;
    setImages(rows);
    setOriginalImages(rows.map((r) => ({ ...r })));
  }, []);

  const markPrimary = (uid) => setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.uid === uid })));

  const moveImage = (uid, dir) => setImages((prev) => swapAdjacent(prev, uid, dir, 'uid') || prev);

  const removeImage = (uid) =>
    setImages((prev) => {
      const target = prev.find((i) => i.uid === uid);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      const next = prev.filter((i) => i.uid !== uid);
      if (target?.is_primary && next.length) next[0] = { ...next[0], is_primary: true };
      return next;
    });

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      show('تم نسخ الرابط ✓');
    } catch {
      show('تعذّر النسخ — انسخ الرابط يدوياً', 'error');
    }
  };

  /** Resize selected files in the browser and stage them (upload happens on save). */
  const stageFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type?.startsWith('image/'));
    if (!files.length) return;
    if (images.length + files.length > IMAGE_MAX_COUNT) {
      show(`الحد الأقصى ${IMAGE_MAX_COUNT} صور لكل كتاب`, 'error');
      return;
    }
    setStaging(true);
    try {
      const staged = [];
      for (const f of files) {
        const { blob, ext } = await resizeImageToLimit(f);
        staged.push({
          uid: nextUid(),
          blob,
          ext,
          url: '',
          r2_key: null,
          preview: URL.createObjectURL(blob),
          is_primary: false,
        });
      }
      setImages((prev) => {
        const next = [...prev, ...staged];
        if (!prev.some((i) => i.is_primary) && next.length) {
          next[prev.length] = { ...next[prev.length], is_primary: true };
        }
        return next;
      });
      show(`تم تجهيز ${staged.length} صورة — ستُرفع عند الحفظ`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setStaging(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  /** Drop image files onto the gallery zone. */
  const onDropImages = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = extractImageFiles(e.dataTransfer?.items);
    if (files.length) stageFiles(files);
  };

  /** Paste a copied image (right-click → copy image, then Ctrl+V here). */
  const onPasteImages = (e) => {
    const files = extractImageFiles(e.clipboardData?.items);
    if (files.length) {
      e.preventDefault();
      stageFiles(files);
    }
  };

  const addUrlImage = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      show('الرابط يجب أن يبدأ بـ http(s)://', 'error');
      return;
    }
    if (images.length >= IMAGE_MAX_COUNT) {
      show(`الحد الأقصى ${IMAGE_MAX_COUNT} صور لكل كتاب`, 'error');
      return;
    }
    setImages((prev) => [
      ...prev,
      {
        uid: nextUid(),
        url,
        r2_key: null,
        is_primary: prev.length === 0 || !prev.some((i) => i.is_primary),
      },
    ]);
    setUrlInput('');
  };

  return {
    images,
    setImages,
    originalImages,
    urlInput,
    setUrlInput,
    staging,
    dragging,
    setDragging,
    fileRef,
    cameraRef,
    resetGallery,
    markPrimary,
    moveImage,
    removeImage,
    copyUrl,
    stageFiles,
    onDropImages,
    onPasteImages,
    addUrlImage,
  };
}

/** Proper Arabic count: 1 → واحدة, 2 → اثنتان, 3+ → number + plural. */
export const pluralImg = (n) => (n === 1 ? 'صورة واحدة' : n === 2 ? 'صورتان' : `${n} صور`);
