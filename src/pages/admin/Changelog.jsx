import { APP_VERSION } from '../../lib/version';
import { CHANGE_TYPES, CHANGELOG } from '../../lib/changelog';
import PageHeader from '../../components/admin/PageHeader';
import StatusPill from '../../components/admin/StatusPill';
import { Card } from '@/components/ui/card';

const dateFormatter = new Intl.DateTimeFormat('ar-MA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatReleaseDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date);
}

export default function Changelog() {
  return (
    <div>
      <PageHeader
        title="سجل التغييرات"
        description="كل إصدار من المتجر وما تغيّر فيه، من الأحدث إلى الأقدم."
        actions={<StatusPill tone="blue">الإصدار الحالي v{APP_VERSION}</StatusPill>}
      />

      <ol className="relative space-y-4 border-s border-line/70 ps-5">
        {CHANGELOG.map((entry) => {
          const type = CHANGE_TYPES[entry.type] || CHANGE_TYPES.patch;
          const current = entry.version === APP_VERSION;
          return (
            <li key={entry.version} className="relative" data-testid="release">
              <span
                aria-hidden="true"
                className={`absolute -start-[26px] top-6 h-3 w-3 rounded-full ring-4 ring-gray-50 ${
                  current ? 'bg-brand' : 'bg-gray-300'
                }`}
              />
              <Card
                className={`border-line/60 p-5 ${current ? 'ring-2 ring-brand/20' : ''}`}
                aria-current={current ? 'true' : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span dir="ltr" className="font-display text-lg font-bold tabular-nums text-ink">
                    v{entry.version}
                  </span>
                  <StatusPill tone={type.tone}>{type.label}</StatusPill>
                  {current && <StatusPill tone="green">الإصدار الحالي</StatusPill>}
                  <time dateTime={entry.date} className="ms-auto text-xs tabular-nums text-soft">
                    {formatReleaseDate(entry.date)}
                  </time>
                </div>

                <h2 className="mt-3 font-display text-base font-bold text-ink">{entry.title}</h2>
                <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-gray-700">
                  {entry.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
