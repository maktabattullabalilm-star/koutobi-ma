/**
 * Single status-pill language for the whole admin console.
 * tone: red (blocked/out) | amber (needs action) | green (healthy) |
 *       gray (dormant) | blue (info)
 */
const TONES = {
  red: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-50 text-emerald-700',
  gray: 'bg-gray-100 text-gray-500',
  blue: 'bg-sky-100 text-sky-700',
};

export default function StatusPill({ tone = 'gray', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${TONES[tone] || TONES.gray} ${className}`}
    >
      {children}
    </span>
  );
}
