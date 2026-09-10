import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useBreakpoint } from '../lib/useIsMobile';
const cellStyle = {
    background: 'var(--bg-page)',
    padding: '16px 18px',
};
export default function StatStrip({ stats }) {
    const isMobile = useBreakpoint() === 'mobile';
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        background: 'var(--line-soft)',
        gap: '1px',
        border: '1px solid var(--line-soft)',
        borderRadius: '10px',
        overflow: 'hidden',
    };
    return (_jsx("div", { style: gridStyle, children: stats.map((stat) => (_jsxs("div", { style: cellStyle, children: [_jsx("div", { className: "eyebrow", children: stat.key }), _jsx("div", { style: {
                        fontFamily: 'var(--font-serif)',
                        fontSize: isMobile ? '24px' : '32px',
                        lineHeight: 1.15,
                        color: 'var(--ink-primary)',
                        marginTop: '4px',
                    }, children: stat.value }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '2px' }, children: stat.sub })] }, stat.key))) }));
}
