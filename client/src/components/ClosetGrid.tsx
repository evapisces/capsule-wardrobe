import type { ClosetItem, ItemCategory } from '@capsule/shared';
import ItemCard from './ItemCard';
import { useBreakpoint } from '../lib/useIsMobile';

/** Page gutter at the mobile breakpoint — kept in sync with ClosetPage. */
const MOBILE_PAGE_PADDING = 16;

interface Props {
  items: ClosetItem[];
  activeCapsuleItemIds?: Set<string>;
  onItemClick?: (item: ClosetItem) => void;
}

const SHELVES: { category: ItemCategory; label: string }[] = [
  { category: 'outerwear', label: 'Layers' },
  { category: 'tops', label: 'Tops' },
  { category: 'bottoms', label: 'Bottoms' },
  { category: 'dresses', label: 'Dresses' },
  { category: 'shoes', label: 'Shoes' },
  { category: 'accessories', label: 'Accessories' },
];

const shelfHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
};

const shelfNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--ink-primary)',
  whiteSpace: 'nowrap',
};

const shelfCountStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--ink-tertiary)',
};

const shelfRuleStyle: React.CSSProperties = {
  flex: 1,
  height: '1px',
  background: 'var(--line-soft)',
};

const shelfNoteStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--ink-tertiary)',
  whiteSpace: 'nowrap',
};

const baseRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  overflowX: 'auto',
  paddingBottom: '4px',
  scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch',
};

function shelfNote(items: ClosetItem[]): string | null {
  const unworn = items.filter((i) => (i.wearCount ?? 0) === 0).length;
  if (unworn > 0) return `${unworn} unworn this season`;
  return null;
}

export default function ClosetGrid({ items, activeCapsuleItemIds, onItemClick }: Props) {
  const isMobile = useBreakpoint() === 'mobile';

  // At mobile the shelf bleeds to the full viewport width: negative page-gutter
  // margins with matching padding so a card is never clipped by the page gutter.
  const rowStyle: React.CSSProperties = isMobile
    ? {
        ...baseRowStyle,
        marginLeft: `-${MOBILE_PAGE_PADDING}px`,
        marginRight: `-${MOBILE_PAGE_PADDING}px`,
        paddingLeft: `${MOBILE_PAGE_PADDING}px`,
        paddingRight: `${MOBILE_PAGE_PADDING}px`,
      }
    : baseRowStyle;

  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
        No items yet.
      </p>
    );
  }

  const maxWearCount = Math.max(1, ...items.map((i) => i.wearCount ?? 0));
  const byCategory = SHELVES.map((shelf) => ({
    ...shelf,
    items: items.filter((i) => i.category === shelf.category),
  })).filter((shelf) => shelf.items.length > 0);

  return (
    <div>
      {byCategory.map((shelf, i) => (
        <div key={shelf.category} style={{ marginTop: i === 0 ? 0 : '34px' }}>
          <div style={shelfHeaderStyle}>
            <span style={shelfNameStyle}>{shelf.label}</span>
            <span style={shelfCountStyle}>({shelf.items.length})</span>
            <span style={shelfRuleStyle} />
            {shelfNote(shelf.items) && <span style={shelfNoteStyle}>{shelfNote(shelf.items)}</span>}
          </div>
          <div style={rowStyle}>
            {shelf.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isInActiveCapsule={activeCapsuleItemIds?.has(item.id)}
                onClick={onItemClick}
                maxWearCount={maxWearCount}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
