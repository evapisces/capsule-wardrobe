import { useState } from 'react';
import type { TripDay } from '@capsule/shared';
import { useBreakpoint } from '../lib/useIsMobile';

interface Props {
  days: TripDay[];
  outfitOptions: { id: string; name: string }[];
  onPick: (date: string, outfitId: string) => void;
}

const STATE_STYLE: Record<TripDay['state'], { border: string; bg: string; text: string; label: string }> = {
  auto: { border: 'var(--line-strong)', bg: 'var(--bg-raised)', text: 'var(--accent-green)', label: 'Auto-logged' },
  corrected: { border: 'var(--accent-amber-line-soft)', bg: 'var(--accent-amber-bg)', text: 'var(--accent-amber)', label: 'Corrected by you' },
  today: { border: 'var(--accent-green)', bg: 'var(--accent-green-tint)', text: 'var(--accent-green)', label: 'Today' },
  future: { border: 'var(--line-soft)', bg: 'var(--bg-raised)', text: 'var(--ink-tertiary)', label: 'Will auto-log' },
};

/** Fixed width for a day card on the mobile/tablet scroll row (>= 104px). */
const CARD_WIDTH = 104;

export default function DayStrip({ days, outfitOptions, onPick }: Props) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  // Desktop keeps an equal-column grid, but `auto-fit` so long trips wrap
  // instead of squeezing each day. Mobile/tablet become a horizontally
  // scrollable, snap-aligned row of fixed-width cards.
  const containerStyle: React.CSSProperties = isDesktop
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${CARD_WIDTH}px, 1fr))`,
        gap: '8px',
        position: 'relative',
      }
    : {
        display: 'flex',
        gap: '8px',
        position: 'relative',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      };

  return (
    <div style={containerStyle}>
      {days.map((day, i) => {
        const s = STATE_STYLE[day.state];
        const isOpen = openDate === day.date;
        // Flip the popover to the right edge for days in the right half of the
        // container so it is never clipped by the viewport.
        const flipRight = days.length > 1 && i >= days.length / 2;

        const popoverStyle: React.CSSProperties = {
          position: 'absolute',
          top: '100%',
          marginTop: '4px',
          zIndex: 10,
          background: '#fff',
          border: '1px solid var(--line-strong)',
          borderRadius: '10px',
          boxShadow: 'var(--shadow-frame)',
          overflow: 'hidden',
          ...(isMobile
            ? { left: 0, right: 0, width: '100%' }
            : flipRight
              ? { right: 0, minWidth: '160px' }
              : { left: 0, minWidth: '160px' }),
        };

        return (
          <div
            key={day.date}
            style={{
              position: 'relative',
              ...(isDesktop
                ? {}
                : { flex: `0 0 ${CARD_WIDTH}px`, width: `${CARD_WIDTH}px`, scrollSnapAlign: 'start' }),
            }}
          >
            <button
              onClick={() => setOpenDate((d) => (d === day.date ? null : day.date))}
              style={{
                display: 'block', width: '100%', minHeight: '44px', textAlign: 'left',
                border: `1px solid ${s.border}`, background: s.bg,
                borderRadius: '9px', padding: '10px', cursor: 'pointer',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)' }}>
                {new Date(day.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '6px', margin: '6px 0',
                background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                border: '1px solid var(--line-strong)',
              }} />
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {day.outfitName ?? '—'}
              </div>
              <div style={{ fontSize: '11px', color: s.text }}>{s.label}</div>
            </button>
            {isOpen && (
              <div style={popoverStyle}>
                {outfitOptions.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { onPick(day.date, o.id); setOpenDate(null); }}
                    style={{
                      display: 'block', width: '100%', minHeight: '44px', textAlign: 'left', padding: '11px 12px',
                      fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer',
                      borderTop: '1px solid var(--line-hairline)',
                    }}
                  >
                    {o.name}
                  </button>
                ))}
                {outfitOptions.length === 0 && (
                  <div style={{ minHeight: '44px', padding: '11px 12px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>No outfits yet</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
