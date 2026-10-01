import { Link } from 'react-router-dom';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import { CONTENT_DEFAULTS } from '../lib/storefrontContent';

export default function StoreBrand({ compact = false, onClick }) {
  const brand = useStorefrontContent()?.brand?.content || CONTENT_DEFAULTS.brand;
  return <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2" aria-label={brand.logo_name}>
    {brand.logo_url ? <img src={brand.logo_url} alt={brand.logo_name} className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} rounded-lg object-contain`} /> : <span className={`${compact ? 'h-9 w-9 text-lg' : 'h-10 w-10 text-xl'} flex items-center justify-center rounded-lg bg-brand font-bold text-white`}>{brand.logo_mark}</span>}
    <span className="text-xl font-bold leading-none"><bdi dir="auto" className="text-brand">{brand.logo_name}</bdi><bdi dir="ltr" className="text-ink">{brand.logo_suffix}</bdi></span>
  </Link>;
}
