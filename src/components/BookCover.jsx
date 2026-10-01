import { useState } from 'react';
import { IconBook } from './icons';
import { DEFAULT_COVER_SIZES, coverSrcSet } from '../lib/images';

function SoldOutSeal() {
  return (
    <span className="pointer-events-none absolute bottom-[7%] end-[6%] z-10 w-[62%] max-w-40 -rotate-6" aria-hidden="true">
      <svg viewBox="0 0 240 78" className="h-auto w-full" focusable="false">
        <rect x="4" y="4" width="232" height="70" rx="3" fill="none" stroke="#c51d30" strokeWidth="8" />
        <text x="120" y="52" fill="#c51d30" fontSize="33" fontWeight="800" textAnchor="middle" fontFamily="serif">نفدت الكمية</text>
      </svg>
    </span>
  );
}

/**
 * Book cover with a graceful fallback — never a broken-image icon.
 * `className` sizes/positions the box; `imgClassName` styles the img itself.
 * The box is ALWAYS a wrapper div so sizing classes never leak onto the img.
 *
 * Perf (docs/backlog/18): lazy by default, `decoding="async"`, intrinsic
 * `aspect-[680/960]` fallback to prevent CLS, responsive `srcSet` when
 * VITE_IMAGE_CDN is configured (single-file origin otherwise).
 */
export default function BookCover({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  eager = false,
  sizes = DEFAULT_COVER_SIZES,
  fetchPriority,
  soldOut = false,
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`relative flex aspect-[680/960] items-center justify-center overflow-hidden bg-gray-100 text-gray-300 ${className}`}
        role="img"
        aria-label={alt || 'غلاف غير متوفر'}
      >
        <IconBook width={24} height={24} aria-hidden="true" />
        {soldOut && <SoldOutSeal />}
      </div>
    );
  }
  const srcSet = coverSrcSet(src);
  return (
    <div className={`relative aspect-[680/960] overflow-hidden ${className}`}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={fetchPriority || (eager ? 'high' : undefined)}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className={imgClassName}
      />
      {soldOut && <SoldOutSeal />}
    </div>
  );
}
