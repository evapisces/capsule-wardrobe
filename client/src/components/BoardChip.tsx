import type { BoardItem } from '@capsule/shared';

interface Props {
  item: BoardItem;
  style?: React.CSSProperties;
  onDragStart: (e: React.DragEvent) => void;
  onRemove: () => void;
}

export default function BoardChip({ item, style, onDragStart, onRemove }: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="board-chip"
      style={{
        position: 'absolute',
        width: '96px',
        cursor: 'grab',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '96px',
          height: '112px',
          borderRadius: '8px',
          border: `1.5px solid ${item.offClimate ? 'var(--accent-amber-line)' : '#E0DBD1'}`,
          background: item.photoUrl
            ? `center/cover no-repeat url(${item.photoUrl})`
            : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
          boxShadow: 'var(--shadow-chip)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
        }}
      >
        {!item.photoUrl && '👕'}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="board-chip-remove"
          aria-label={`Remove ${item.name} from capsule`}
          title={`Remove ${item.name} from capsule`}
          style={{
            position: 'absolute', top: '-7px', right: '-7px', width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--ink-primary)', color: '#fff', border: 'none', fontSize: '10px', lineHeight: 1,
            cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>
      <div style={{
        marginTop: '6px', fontSize: '11.5px', textAlign: 'center', color: 'var(--ink-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.offClimate ? 'off-climate' : item.name}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center',
        color: item.offClimate ? 'var(--accent-amber)' : 'var(--ink-tertiary)', marginTop: '1px',
      }}>
        {item.offClimate ? 'off-climate' : `${item.wearCount} wear${item.wearCount === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}
