import type { Capsule, ClosetItem } from '@capsule/shared';

interface Props {
  capsule: Capsule;
  onRemoveItem: (itemId: string) => void;
  onAddClick: () => void;
}

export default function CapsuleTray({ capsule, onRemoveItem, onAddClick }: Props) {
  const items: ClosetItem[] = capsule.items ?? [];

  const trayStyle: React.CSSProperties = {
    position: 'sticky', top: '57px', zIndex: 50,
    background: '#fff', borderBottom: '1px solid #e0d8cc',
    padding: '14px 24px',
  };

  const scrollRowStyle: React.CSSProperties = {
    display: 'flex', gap: '8px', overflowX: 'auto',
    paddingBottom: '4px',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'relative', flexShrink: 0,
    width: '52px', height: '52px', borderRadius: '8px',
    background: '#e0d8cc', overflow: 'visible',
  };

  const imgStyle: React.CSSProperties = {
    width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px',
    background: '#e0d8cc',
  };

  const removeStyle: React.CSSProperties = {
    position: 'absolute', top: '-5px', right: '-5px',
    width: '16px', height: '16px',
    background: '#e63946', color: '#fff', border: 'none',
    borderRadius: '50%', fontSize: '9px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', lineHeight: 1, padding: 0,
  };

  const addBtnStyle: React.CSSProperties = {
    flexShrink: 0, width: '52px', height: '52px',
    borderRadius: '8px', border: '2px dashed #0bcddb',
    background: 'transparent', color: '#0bcddb',
    fontSize: '22px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  };

  return (
    <div style={trayStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>{capsule.name}</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={scrollRowStyle}>
        {items.map((item) => (
          <div key={item.id} style={thumbStyle}>
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} title={item.name} style={imgStyle} />
            ) : (
              <div title={item.name}
                style={{ ...imgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                👕
              </div>
            )}
            <button
              style={removeStyle}
              onClick={() => onRemoveItem(item.id)}
              aria-label={`Remove ${item.name}`}
              title={`Remove ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
        <button style={addBtnStyle} onClick={onAddClick} aria-label="Add item to capsule" title="Add item">
          +
        </button>
      </div>
    </div>
  );
}
