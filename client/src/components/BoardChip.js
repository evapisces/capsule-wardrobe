import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function BoardChip({ item, style, onDragStart, onRemove }) {
    return (_jsxs("div", { draggable: true, onDragStart: onDragStart, className: "board-chip", style: {
            position: 'absolute',
            width: '96px',
            cursor: 'grab',
            userSelect: 'none',
            ...style,
        }, children: [_jsxs("div", { style: {
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
                }, children: [!item.photoUrl && '👕', _jsx("button", { onClick: (e) => { e.stopPropagation(); onRemove(); }, className: "board-chip-remove", "aria-label": `Remove ${item.name} from capsule`, title: `Remove ${item.name} from capsule`, style: {
                            position: 'absolute', top: '-7px', right: '-7px', width: '18px', height: '18px', borderRadius: '50%',
                            background: 'var(--ink-primary)', color: '#fff', border: 'none', fontSize: '10px', lineHeight: 1,
                            cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center',
                        }, children: "\u00D7" })] }), _jsx("div", { style: {
                    marginTop: '6px', fontSize: '11.5px', textAlign: 'center', color: 'var(--ink-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }, children: item.offClimate ? 'off-climate' : item.name }), _jsx("div", { style: {
                    fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center',
                    color: item.offClimate ? 'var(--accent-amber)' : 'var(--ink-tertiary)', marginTop: '1px',
                }, children: item.offClimate ? 'off-climate' : `${item.wearCount} wear${item.wearCount === 1 ? '' : 's'}` })] }));
}
