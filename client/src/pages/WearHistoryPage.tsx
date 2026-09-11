import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getClosets, getClosetWearHistory } from '../lib/api';
import { useBreakpoint } from '../lib/useIsMobile';
import WearCalendar, { DayDetail } from '../components/WearCalendar';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export default function WearHistoryPage() {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const pagePadding = isMobile ? '16px' : breakpoint === 'tablet' ? '20px' : '28px';

  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: closets = [], isLoading: closetsLoading } = useQuery({ queryKey: ['closets'], queryFn: getClosets });
  const closetId = closets[0]?.id ?? '';
  const noCloset = !closetsLoading && closets.length === 0;

  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);

  const { data: days = [], isLoading } = useQuery({
    queryKey: ['closetWearHistory', closetId, from, to],
    queryFn: () => getClosetWearHistory(closetId, from, to),
    enabled: !!closetId,
  });

  const goToPreviousMonth = () => {
    setSelectedDate(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setSelectedDate(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const selectedDay = days.find((d) => d.date === selectedDate) ?? (selectedDate ? { date: selectedDate, events: [] } : null);
  const daysWithWears = days.filter((d) => d.events.length > 0);

  if (noCloset) {
    return (
      <div style={{ padding: pagePadding, maxWidth: '1280px', margin: '0 auto' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>
          Create a closet first — <Link to="/">head back to your closet</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: pagePadding, maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow">Wear history</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }}>
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" aria-label="Previous month" onClick={goToPreviousMonth}>
            ← Previous
          </button>
          <button className="btn-secondary" aria-label="Next month" onClick={goToNextMonth}>
            Next →
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>
      ) : isMobile ? (
        <div data-testid="wear-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {daysWithWears.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>No wears logged this month.</p>
          ) : (
            daysWithWears.map((day) => (
              <button
                key={day.date}
                type="button"
                data-testid={`wear-timeline-day-${day.date}`}
                onClick={() => setSelectedDate(day.date)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: selectedDate === day.date ? '2px solid var(--ink-primary)' : '1px solid var(--line-soft)',
                  background: 'var(--bg-page)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)' }}>{day.date}</div>
                <div style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                  {day.events.map((e) => e.outfitName ?? e.items.map((i) => i.name).join(', ')).join(' · ')}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <WearCalendar
          year={year}
          month={month}
          days={days}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {selectedDay && (
        <div style={{ marginTop: '26px' }}>
          <div className="section-label" style={{ marginBottom: '12px' }}>{selectedDay.date}</div>
          <DayDetail day={selectedDay} />
        </div>
      )}
    </div>
  );
}
