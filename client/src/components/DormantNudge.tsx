import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClosetItem } from '@capsule/shared';

const MAX_NAMED = 3;

/** Oldest-`lastWornAt`-first; items that have never been worn sort last. */
function sortDormant(items: ClosetItem[]): ClosetItem[] {
  return [...items].sort((a, b) => {
    if (!a.lastWornAt && !b.lastWornAt) return 0;
    if (!a.lastWornAt) return 1;
    if (!b.lastWornAt) return -1;
    return a.lastWornAt.localeCompare(b.lastWornAt);
  });
}

export interface DormantNudgeProps {
  items: ClosetItem[];
  thresholdDays: number;
  onShowDormant: () => void;
}

export default function DormantNudge({ items, thresholdDays, onShowDormant }: DormantNudgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const dormantItems = sortDormant(items.filter((i) => i.dormant));

  if (dismissed || dormantItems.length === 0) return null;

  const named = dormantItems.slice(0, MAX_NAMED);
  const remaining = dormantItems.length - named.length;

  return (
    <div
      data-testid="dormant-nudge"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 18px',
        marginBottom: '22px',
        borderRadius: '11px',
        border: '1px solid var(--line-strong)',
        background: 'var(--bg-page)',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)', marginBottom: '4px' }}>
          {dormantItems.length} item{dormantItems.length === 1 ? '' : 's'} haven't been worn in {thresholdDays}+ days
        </div>
        <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
          {named.map((item, i) => (
            <span key={item.id}>
              <Link to={`/items/${item.id}`}>{item.name}</Link>
              {i < named.length - 1 ? ', ' : ''}
            </span>
          ))}
          {remaining > 0 ? ` +${remaining} more` : ''}
        </div>
        <button
          className="btn-secondary"
          style={{ marginTop: '10px', height: '30px', padding: '0 12px', fontSize: '12px' }}
          onClick={onShowDormant}
        >
          Show dormant items
        </button>
      </div>
      <button
        type="button"
        aria-label="Dismiss dormant items nudge"
        onClick={() => setDismissed(true)}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-tertiary)',
          fontSize: '18px',
          lineHeight: 1,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
