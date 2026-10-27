import { Link } from 'react-router-dom';
import { useStorefrontContent } from '../hooks/useStorefrontContent';

/**
 * Store wordmark. Renders only when the database has a brand name or logo —
 * there is no bundled store identity to fall back to.
 */
export default function StoreBrand({ compact = false, onClick }) {
  const brand = useStorefrontContent()?.brand?.content;
  const name = String(brand?.logo_name || '').trim();
  const suffix = String(brand?.logo_suffix || '').trim();
  const mark = String(brand?.logo_mark || '').trim() || name.charAt(0);

  if (!brand?.logo_url && !name) return null;

  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2"
      aria-label={[name, suffix].filter(Boolean).join(' ')}
    >
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={name}
          className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} rounded-lg object-contain`}
        />
      ) : (
        <span
          className={`${compact ? 'h-9 w-9 text-lg' : 'h-10 w-10 text-xl'} flex items-center justify-center rounded-lg bg-brand font-bold text-white`}
        >
          {mark}
        </span>
      )}
      <span className="text-xl font-bold leading-none">
        <bdi dir="auto" className="text-brand">
          {name}
        </bdi>
        {suffix ? ' ' : ''}
        <bdi dir="ltr" className="text-ink">
          {suffix}
        </bdi>
      </span>
    </Link>
  );
}
