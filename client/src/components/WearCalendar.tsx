import { Link } from 'react-router-dom';
import type { ClosetWearDay } from '@capsule/shared';

const MAX_THUMBS = 3;

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function summarizeDay(day: ClosetWearDay): { label: string; extraCount: number } {
  const outfitNames = day.events.filter((e) => e.outfitName).map((e) => e.outfitName as string);
  if (outfitNames.length > 0) {
    const shown = outfitNames.slice(0, MAX_THUMBS);
    return { label: shown.join(', '), extraCount: outfitNames.length - shown.length };
  }
  const itemNames = day.events.flatMap((e) => e.items.map((i) => i.name));
  const shown = itemNames.slice(0, MAX_THUMBS);
  return { label: shown.join(', '), extraCount: itemNames.length - shown.length };
}

const cellBaseStyle: React.CSSProperties = {
  minHeight: '92px',
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid var(--line-hairline)',
  background: 'var(--bg-page)',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export interface WearCalendarProps {
  year: number;
  /** 0-indexed, matching `Date#getMonth`. */
  month: number;
  days: ClosetWearDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

/** Desktop/tablet month grid: one cell per calendar day, 7 columns. */
export default function WearCalendar({ year, month, days, selectedDate, onSelectDate }: WearCalendarProps) {
  const daysByDate = new Map(days.map((d) => [d.date, d]));
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
          marginBottom: '6px',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ fontSize: '11px', color: 'var(--ink-tertiary)', textAlign: 'center' }}>
            {d}
          </div>
        ))}
      </div>
      <div
        data-testid="wear-calendar-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}
      >
        {cells.map((dayNum, i) => {
          if (dayNum === null) return <div key={`blank-${i}`} />;
          const date = toISODate(year, month, dayNum);
          const day = daysByDate.get(date);
          const hasWears = !!day && day.events.length > 0;
          const summary = hasWears ? summarizeDay(day) : null;
          const isSelected = selectedDate === date;

          return (
            <button
              key={date}
              type="button"
              data-testid={`wear-day-${date}`}
              data-has-wears={hasWears ? 'true' : 'false'}
              onClick={() => onSelectDate(date)}
              style={{
                ...cellBaseStyle,
                background: hasWears ? 'var(--bg-page)' : '#F6F3ED',
                borderColor: isSelected ? 'var(--ink-primary)' : hasWears ? 'var(--line-strong)' : 'var(--line-hairline)',
                borderWidth: isSelected ? '2px' : '1px',
                opacity: hasWears ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                {dayNum}
              </span>
              {summary && (
                <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.3 }}>
                  {summary.label}
                  {summary.extraCount > 0 ? ` +${summary.extraCount} more` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DayDetail({ day }: { day: ClosetWearDay }) {
  if (day.events.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>Nothing logged this day.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {day.events.map((event) => (
        <div key={event.id} style={{ border: '1px solid var(--line-soft)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>
              {event.outfitName ?? 'Individual items'}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-tertiary)' }}>
              {event.source === 'trip_auto' ? 'Trip auto-log' : 'Manual'}
              {event.corrected ? ' · corrected' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {event.items.map((item) => (
              <Link key={item.id} to={`/items/${item.id}`} style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
