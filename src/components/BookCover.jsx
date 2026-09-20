import { useState } from 'react';
import { IconBook } from './icons';

/**
 * Book cover with a graceful fallback — never a broken-image icon.
 * `className` sizes/positions the box; `imgClassName` styles the img itself.
 * The box is ALWAYS a wrapper div so sizing classes never leak onto the img.
 */
export default function BookCover({ src, alt = '', className = '', imgClassName = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden bg-gray-100 text-gray-300 ${className}`}
        role="img"
        aria-label={alt || 'غلاف غير متوفر'}
      >
        <IconBook width={24} height={24} />
      </div>
    );
  }
  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
        className={imgClassName}
      />
    </div>
  );
}
