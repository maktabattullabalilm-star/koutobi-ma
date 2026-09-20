import { Link } from 'react-router-dom';

/**
 * Consistent admin page header: Amiri title + description + optional actions.
 * `crumbs`: [{ label, to? }] rendered RTL before the title.
 */
export default function PageHeader({ title, description, crumbs = [], actions = null }) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-soft" aria-label="مسار التنقل">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-line">/</span>}
              {c.to ? (
                <Link to={c.to} className="hover:text-brand">{c.label}</Link>
              ) : (
                <span className="font-medium text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-title">{title}</h1>
          {description && <p className="admin-subtitle">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
