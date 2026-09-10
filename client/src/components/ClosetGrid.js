import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ItemCard from './ItemCard';
import { useBreakpoint } from '../lib/useIsMobile';
/** Page gutter at the mobile breakpoint — kept in sync with ClosetPage. */
const MOBILE_PAGE_PADDING = 16;
const SHELVES = [
    { category: 'outerwear', label: 'Layers' },
    { category: 'tops', label: 'Tops' },
    { category: 'bottoms', label: 'Bottoms' },
    { category: 'dresses', label: 'Dresses' },
    { category: 'shoes', label: 'Shoes' },
    { category: 'accessories', label: 'Accessories' },
];
const shelfHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
};
const shelfNameStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--ink-primary)',
    whiteSpace: 'nowrap',
};
const shelfCountStyle = {
    fontSize: '13px',
    color: 'var(--ink-tertiary)',
};
const shelfRuleStyle = {
    flex: 1,
    height: '1px',
    background: 'var(--line-soft)',
};
const shelfNoteStyle = {
    fontSize: '12.5px',
    color: 'var(--ink-tertiary)',
    whiteSpace: 'nowrap',
};
const baseRowStyle = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '4px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
};
function shelfNote(items) {
    const unworn = items.filter((i) => (i.wearCount ?? 0) === 0).length;
    if (unworn > 0)
        return `${unworn} unworn this season`;
    return null;
}
export default function ClosetGrid({ items, activeCapsuleItemIds, onItemClick }) {
    const isMobile = useBreakpoint() === 'mobile';
    // At mobile the shelf bleeds to the full viewport width: negative page-gutter
    // margins with matching padding so a card is never clipped by the page gutter.
    const rowStyle = isMobile
        ? {
            ...baseRowStyle,
            marginLeft: `-${MOBILE_PAGE_PADDING}px`,
            marginRight: `-${MOBILE_PAGE_PADDING}px`,
            paddingLeft: `${MOBILE_PAGE_PADDING}px`,
            paddingRight: `${MOBILE_PAGE_PADDING}px`,
        }
        : baseRowStyle;
    if (items.length === 0) {
        return (_jsx("p", { style: { color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }, children: "No items yet." }));
    }
    const maxWearCount = Math.max(1, ...items.map((i) => i.wearCount ?? 0));
    const byCategory = SHELVES.map((shelf) => ({
        ...shelf,
        items: items.filter((i) => i.category === shelf.category),
    })).filter((shelf) => shelf.items.length > 0);
    return (_jsx("div", { children: byCategory.map((shelf, i) => (_jsxs("div", { style: { marginTop: i === 0 ? 0 : '34px' }, children: [_jsxs("div", { style: shelfHeaderStyle, children: [_jsx("span", { style: shelfNameStyle, children: shelf.label }), _jsxs("span", { style: shelfCountStyle, children: ["(", shelf.items.length, ")"] }), _jsx("span", { style: shelfRuleStyle }), shelfNote(shelf.items) && _jsx("span", { style: shelfNoteStyle, children: shelfNote(shelf.items) })] }), _jsx("div", { style: rowStyle, children: shelf.items.map((item) => (_jsx(ItemCard, { item: item, isInActiveCapsule: activeCapsuleItemIds?.has(item.id), onClick: onItemClick, maxWearCount: maxWearCount }, item.id))) })] }, shelf.category))) }));
}
