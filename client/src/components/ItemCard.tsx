import type { ClosetItem } from '@capsule/shared';

interface Props {
  item: ClosetItem;
  isInActiveCapsule?: boolean;
  onClick?: (item: ClosetItem) => void;
}

export default function ItemCard({ item, isInActiveCapsule, onClick }: Props) {
  const showBadge = (item.capsuleCount ?? 0) > (isInActiveCapsule ? 1 : 0);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f0ebe3',
    border: isInActiveCapsule ? '2px solid #2a9d8f' : '2px solid transparent',
    cursor: onClick ? 'pointer' : 'default',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: '#f4a261',
    color: '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  const photoStyle: React.CSSProperties = {
    flex: 1,
    background: '#e0d8cc',
    backgroundImage: item.photoUrl ? `url(${item.photoUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  };

  const labelStyle: React.CSSProperties = {
    padding: '4px 6px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <button
      style={cardStyle}
      onClick={() => onClick?.(item)}
      title={item.name}
      aria-label={item.name}
    >
      <div style={photoStyle}>{!item.photoUrl && '👕'}</div>
      <div style={labelStyle}>{item.name}</div>
      {showBadge && <span style={badgeStyle}>{item.capsuleCount}</span>}
    </button>
  );
}
