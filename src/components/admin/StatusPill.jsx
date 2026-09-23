import { Badge } from '@/components/ui/badge';

/**
 * Single status-pill language for the whole admin console.
 * tone: red (blocked/out) | amber (needs action) | green (healthy) |
 *       gray (dormant) | blue (info)
 */
const TONE_CLASS = {
  red: 'border-transparent bg-destructive/10 text-destructive',
  amber: 'border-transparent bg-amber-100 text-amber-700',
  green: 'border-transparent bg-emerald-50 text-emerald-700',
  gray: '',
  blue: 'border-transparent bg-sky-100 text-sky-700',
};

export default function StatusPill({ tone = 'gray', children, className = '' }) {
  return (
    <Badge variant="secondary" className={`text-[11px] font-bold ${TONE_CLASS[tone] || ''} ${className}`}>
      {children}
    </Badge>
  );
}
