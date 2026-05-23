import type { ClosetItem } from '@capsule/shared';
import ItemCard from './ItemCard';

interface Props {
  items: ClosetItem[];
  activeCapsuleItemIds?: Set<string>;
  onItemClick?: (item: ClosetItem) => void;
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '12px',
};

export default function ClosetGrid({ items, activeCapsuleItemIds, onItemClick }: Props) {
  if (items.length === 0) {
    return (
      <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
        No items yet.
      </p>
    );
  }

  return (
    <div style={gridStyle}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isInActiveCapsule={activeCapsuleItemIds?.has(item.id)}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
