import type { ClosetItem } from '@capsule/shared';
import Tooltip from './Tooltip';
import { useBreakpoint } from '../lib/useIsMobile';

interface Props {
  item: ClosetItem;
  isInActiveCapsule?: boolean;
  onClick?: (item: ClosetItem) => void;
  /** Highest wearCount in the current view, for the usage-bar fill percentile. */
  maxWearCount?: number;
}

function formatLastWorn(item: ClosetItem): string {
  if (!item.lastWornAt) {
    const days = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 31) return 'Added recently';
    const months = Math.round(days / 30);
    return `Added ${months} month${months === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor((Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Worn today';
  if (days === 1) return 'Worn yesterday';
  if (days < 21) return `Worn ${days} days ago`;
  if (item.dormant) return `Not worn in ${days} days`;
  const weeks = Math.round(days / 7);
  return `Worn ${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

export default function ItemCard({ item, isInActiveCapsule, onClick, maxWearCount }: Props) {
  const isMobile = useBreakpoint() === 'mobile';
  const photoWidth = isMobile ? '156px' : '186px';
  const showBadge = (item.capsuleCount ?? 0) > (isInActiveCapsule ? 1 : 0);
  const wearCount = item.wearCount ?? 0;
  const dormant = item.dormant ?? false;
  const usagePct = maxWearCount && maxWearCount > 0 ? Math.max(4, Math.round((wearCount / maxWearCount) * 100)) : 0;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: photoWidth,
    minWidth: '44px',
    minHeight: '44px',
    flex: '0 0 auto',
    scrollSnapAlign: 'start',
    cursor: onClick ? 'pointer' : 'default',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    transition: 'opacity 140ms ease-out',
  };

  const photoStyle: React.CSSProperties = {
    width: photoWidth,
    aspectRatio: '186 / 212',
    borderRadius: '10px',
    border: isInActiveCapsule ? '1.5px solid var(--accent-green)' : '1px solid var(--line-strong)',
    background: item.photoUrl
      ? `center/cover no-repeat url(${item.photoUrl})`
      : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxSizing: 'border-box',
  };

  const usageBarTrack: React.CSSProperties = {
    marginTop: '10px',
    height: '2px',
    borderRadius: '1px',
    background: '#E8E3DA',
    overflow: 'hidden',
  };

  const usageBarFill: React.CSSProperties = {
    height: '100%',
    width: `${usagePct}%`,
    background: dormant ? 'var(--accent-amber)' : 'var(--accent-green)',
  };

  const rowStyle: React.CSSProperties = {
    marginTop: '9px',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '6px',
  };

  const nameStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--ink-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const wearCountStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: dormant ? 'var(--accent-amber)' : 'var(--accent-green)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const metaStyle: React.CSSProperties = {
    marginTop: '3px',
    fontSize: '12.5px',
    color: 'var(--ink-tertiary)',
  };

  const detailStyle: React.CSSProperties = {
    marginTop: '2px',
    fontSize: '12px',
    color: 'var(--ink-tertiary)',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#17150F',
    color: 'var(--bg-page)',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  const details = [item.brand, item.climate].filter(Boolean).join(' · ');

  return (
    <button style={cardStyle} onClick={() => onClick?.(item)} aria-label={item.name}>
      <div style={{ position: 'relative' }}>
        <div style={photoStyle}>{!item.photoUrl && '👕'}</div>
        {showBadge && (
          <span style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip content={`In ${item.capsuleCount} capsule${item.capsuleCount === 1 ? '' : 's'}`}>
              <span style={{ ...badgeStyle, position: 'static' }}>{item.capsuleCount}</span>
            </Tooltip>
          </span>
        )}
      </div>
      <div style={usageBarTrack}>
        <div style={usageBarFill} />
      </div>
      <div style={rowStyle}>
        <span style={nameStyle}>{item.name}</span>
        <span style={wearCountStyle}>{wearCount === 0 ? 'Never worn' : `${wearCount} wear${wearCount === 1 ? '' : 's'}`}</span>
      </div>
      <div style={metaStyle}>{formatLastWorn(item)}</div>
      {details && <div style={detailStyle}>{details}</div>}
    </button>
  );
}
