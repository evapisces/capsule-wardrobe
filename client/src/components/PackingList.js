import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '26px 52px 1fr 200px 36px',
    gap: '14px',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid var(--line-hairline)',
};
export default function PackingList({ rows, onToggle }) {
    const packedCount = rows.filter((r) => r.packed).length;
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }, children: [_jsx("span", { className: "section-label", children: "Packing list" }), _jsxs("span", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: [packedCount, " of ", rows.length, " packed"] })] }), _jsxs("div", { style: { border: '1px solid var(--line-soft)', borderRadius: '11px', overflow: 'hidden' }, children: [rows.length === 0 && (_jsx("p", { style: { padding: '16px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "Nothing to pack yet \u2014 link a capsule with items." })), rows.map((row, i) => (_jsxs("div", { style: { ...rowStyle, borderTop: i === 0 ? 'none' : rowStyle.borderTop }, children: [_jsx("button", { onClick: () => onToggle(row.itemId, !row.packed), "aria-label": row.packed ? `Mark ${row.name} unpacked` : `Mark ${row.name} packed`, style: {
                                    width: '18px', height: '18px', borderRadius: '5px', padding: 0, cursor: 'pointer',
                                    border: row.packed ? 'none' : '1.5px solid var(--line-default)',
                                    background: row.packed ? 'var(--accent-green)' : 'transparent',
                                    color: '#fff', fontSize: '12px', lineHeight: '16px',
                                }, children: row.packed ? '✓' : '' }), _jsx("div", { style: {
                                    width: '52px', height: '48px', borderRadius: '6px', border: '1px solid var(--line-strong)',
                                    background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                                }, children: !row.photoUrl && '👕' }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }, children: row.name }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', textTransform: 'capitalize' }, children: row.category })] }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: row.neededByOutfits.length > 0 ? row.neededByOutfits.join(', ') : '—' }), _jsxs("div", { style: { fontFamily: 'var(--font-mono)', fontSize: '12.5px', textAlign: 'right', color: 'var(--ink-tertiary)' }, children: ["\u00D7", row.quantity] })] }, row.itemId)))] })] }));
}
