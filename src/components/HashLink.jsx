import { Link, useLocation } from 'react-router-dom';

/**
 * Hash links become no-ops once the hash is already in the URL, because
 * React Router ignores navigation to the same location. This link re-scrolls
 * the existing target in that case, so «كيف أطلب؟» keeps working every click.
 */
export default function HashLink({ to, onClick, ...props }) {
  const { pathname, hash } = useLocation();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (typeof to !== 'string' || !to.includes('#')) return;

    const [rawPath, rawHash] = to.split('#');
    const targetPath = rawPath || pathname;
    const targetHash = `#${rawHash || ''}`;
    if (targetPath !== pathname || targetHash !== hash) return;

    let id = rawHash;
    try {
      id = decodeURIComponent(rawHash);
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return <Link to={to} onClick={handleClick} {...props} />;
}
