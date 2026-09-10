import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const STATE_STYLE = {
    auto: { border: 'var(--line-strong)', bg: 'var(--bg-raised)', text: 'var(--accent-green)', label: 'Auto-logged' },
    corrected: { border: 'var(--accent-amber-line-soft)', bg: 'var(--accent-amber-bg)', text: 'var(--accent-amber)', label: 'Corrected by you' },
    today: { border: 'var(--accent-green)', bg: 'var(--accent-green-tint)', text: 'var(--accent-green)', label: 'Today' },
    future: { border: 'var(--line-soft)', bg: 'var(--bg-raised)', text: 'var(--ink-tertiary)', label: 'Will auto-log' },
};
export default function DayStrip({ days, outfitOptions, onPick }) {
    const [openDate, setOpenDate] = useState(null);
    return (_jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: '8px', position: 'relative' }, children: days.map((day) => {
            const s = STATE_STYLE[day.state];
            return (_jsxs("div", { style: { position: 'relative' }, children: [_jsxs("button", { onClick: () => setOpenDate((d) => (d === day.date ? null : day.date)), style: {
                            width: '100%', textAlign: 'left', border: `1px solid ${s.border}`, background: s.bg,
                            borderRadius: '9px', padding: '10px', cursor: 'pointer',
                        }, children: [_jsx("div", { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)' }, children: new Date(day.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) }), _jsx("div", { style: {
                                    width: '44px', height: '44px', borderRadius: '6px', margin: '6px 0',
                                    background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                    border: '1px solid var(--line-strong)',
                                } }), _jsx("div", { style: { fontSize: '12px', fontWeight: 500, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: day.outfitName ?? '—' }), _jsx("div", { style: { fontSize: '11px', color: s.text }, children: s.label })] }), openDate === day.date && (_jsxs("div", { style: {
                            position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 10,
                            background: '#fff', border: '1px solid var(--line-strong)', borderRadius: '10px',
                            boxShadow: 'var(--shadow-frame)', minWidth: '160px', overflow: 'hidden',
                        }, children: [outfitOptions.map((o) => (_jsx("button", { onClick: () => { onPick(day.date, o.id); setOpenDate(null); }, style: {
                                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                                    fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer',
                                    borderTop: '1px solid var(--line-hairline)',
                                }, children: o.name }, o.id))), outfitOptions.length === 0 && (_jsx("div", { style: { padding: '9px 12px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "No outfits yet" }))] }))] }, day.date));
        }) }));
}
