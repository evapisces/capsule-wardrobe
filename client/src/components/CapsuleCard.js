import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
const cardStyle = {
    position: 'relative',
    textAlign: 'left',
    border: '1px solid var(--line-strong)',
    borderRadius: '12px',
    background: 'var(--bg-raised)',
    cursor: 'pointer',
    overflow: 'hidden',
};
const thumbStyle = {
    width: '78px',
    height: '92px',
    borderRadius: '6px',
    border: '1px solid var(--line-strong)',
    background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
    backgroundSize: 'cover',
    flexShrink: 0,
};
const menuBtnStyle = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
    padding: '2px 8px',
    borderRadius: '6px',
    color: 'var(--ink-tertiary)',
};
export default function CapsuleCard({ capsule, onClick, archived = false, onArchiveToggle }) {
    const thumbnails = capsule.thumbnails ?? [];
    const extra = (capsule.itemCount ?? 0) - thumbnails.length;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuWrapRef = useRef(null);
    const stop = (e) => {
        e.stopPropagation();
    };
    useEffect(() => {
        if (!menuOpen)
            return;
        const onPointerDown = (e) => {
            if (!menuWrapRef.current?.contains(e.target))
                setMenuOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);
    return (_jsxs("div", { style: cardStyle, role: "button", tabIndex: 0, onClick: onClick, onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }, children: [onArchiveToggle && (_jsxs("div", { ref: menuWrapRef, style: { position: 'absolute', top: '10px', right: '10px', zIndex: 1 }, onClick: stop, children: [_jsx("button", { type: "button", "aria-label": "Capsule actions", "aria-haspopup": "menu", "aria-expanded": menuOpen, style: menuBtnStyle, onClick: (e) => {
                            stop(e);
                            setMenuOpen((o) => !o);
                        }, children: "\u2026" }), menuOpen && (_jsx("div", { role: "menu", style: {
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '4px',
                            background: 'var(--bg-page)',
                            border: '1px solid var(--line-strong)',
                            borderRadius: '9px',
                            boxShadow: '0 6px 18px rgba(23,21,15,0.14)',
                            minWidth: '140px',
                            overflow: 'hidden',
                        }, children: _jsx("button", { type: "button", role: "menuitem", style: {
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '10px 14px',
                                fontSize: '13px',
                                color: 'var(--ink-body)',
                            }, onClick: (e) => {
                                stop(e);
                                setMenuOpen(false);
                                onArchiveToggle();
                            }, children: archived ? 'Unarchive' : 'Archive' }) }))] })), _jsxs("div", { style: { padding: '18px 20px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--font-serif)', fontSize: '26px', lineHeight: 1.1, color: 'var(--ink-primary)' }, children: capsule.name }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '3px' }, children: capsule.tripLabel ?? (capsule.kind === 'trip' ? 'Trip capsule' : 'Standing capsule') })] }), capsule.climateLabel && (_jsx("span", { className: capsule.climateSuitable ? 'pill-green' : 'pill-amber', style: { flexShrink: 0 }, children: capsule.climateLabel }))] }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginTop: '16px' }, children: [thumbnails.map((t) => (_jsx("div", { style: { ...thumbStyle, backgroundImage: t.photoUrl ? `url(${t.photoUrl})` : undefined } }, t.id))), extra > 0 && (_jsxs("div", { style: {
                                    ...thumbStyle,
                                    background: 'var(--bg-sunken)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)',
                                }, children: ["+", extra] }))] }), _jsxs("div", { style: { marginTop: '14px', fontSize: '13px', color: 'var(--ink-body)' }, children: [capsule.itemCount ?? 0, " items \u00B7 ", capsule.outfitCount ?? 0, " outfits"] })] }), _jsxs("div", { style: {
                    marginTop: '14px', borderTop: '1px solid var(--line-soft)', padding: '14px 20px',
                    display: 'flex', alignItems: 'center', gap: '18px',
                }, children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "Efficiency" }), _jsx("div", { style: { fontFamily: 'var(--font-serif)', fontSize: '28px', lineHeight: 1.1, color: 'var(--ink-primary)' }, children: capsule.efficiency ?? 0 })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { height: '3px', borderRadius: '2px', background: '#E8E3DA', overflow: 'hidden' }, children: _jsx("div", { style: {
                                        height: '100%',
                                        width: `${capsule.efficiency ?? 0}%`,
                                        background: capsule.climateSuitable === false ? 'var(--accent-amber)' : 'var(--accent-green)',
                                    } }) }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '6px' }, children: capsule.efficiencyReason })] })] })] }));
}
