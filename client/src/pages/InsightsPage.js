import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClosets, getClosetStats, getInsights } from '../lib/api';
import StatStrip from '../components/StatStrip';
function formatPct(n) {
    return `${Math.round(n * 100)}%`;
}
function formatDelta(n) {
    const pct = Math.round(n * 100);
    if (pct === 0)
        return 'Flat vs last 30 days';
    return `${pct > 0 ? '+' : ''}${pct}% vs last 30 days`;
}
export default function InsightsPage() {
    const [range, setRange] = useState('6m');
    const { data: closets = [] } = useQuery({ queryKey: ['closets'], queryFn: getClosets });
    const closetId = closets[0]?.id ?? '';
    const { data: stats } = useQuery({
        queryKey: ['closetStats', closetId],
        queryFn: () => getClosetStats(closetId),
        enabled: !!closetId,
    });
    const { data: insights } = useQuery({
        queryKey: ['insights', closetId, range],
        queryFn: () => getInsights(closetId, range),
        enabled: !!closetId,
    });
    const statCells = stats
        ? [
            { key: 'Worn this month', value: `${stats.wornThisMonth}`, sub: `of ${stats.totalItems} items` },
            { key: 'Closet utilisation', value: formatPct(stats.closetUtilisation), sub: formatDelta(stats.closetUtilisationDelta) },
            { key: 'Dormant 90+ days', value: `${stats.dormantCount}`, sub: stats.dormantCoolCount > 0 ? `${stats.dormantCoolCount} are cool-weather` : 'None cool-weather' },
            { key: 'Avg cost per wear', value: stats.avgCostPerWear != null ? `$${stats.avgCostPerWear.toFixed(2)}` : '—', sub: stats.avgCostPerWear != null ? 'across priced items' : 'no prices logged yet' },
        ]
        : [];
    const maxWorn = insights?.mostWorn[0]?.wearCount ?? 1;
    return (_jsxs("div", { style: { padding: '28px', maxWidth: '1280px', margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: insights ? `${insights.loggedWears} logged wears · ${insights.unloggedDays} unlogged days` : '—' }), _jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }, children: "Insights" })] }), _jsx("div", { style: { display: 'flex', gap: '8px' }, children: ['6m', 'all'].map((r) => (_jsx("button", { className: `chip${range === r ? ' selected' : ''}`, onClick: () => setRange(r), children: r === '6m' ? 'Last 6 months' : 'All time' }, r))) })] }), stats && _jsx("div", { style: { marginBottom: '30px' }, children: _jsx(StatStrip, { stats: statCells }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px' }, children: [_jsxs("div", { children: [_jsx("div", { className: "section-label", style: { marginBottom: '12px' }, children: "Most worn" }), (insights?.mostWorn.length ?? 0) === 0 ? (_jsx("p", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "No wears logged in this range yet." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: insights.mostWorn.map((row) => (_jsx("div", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
                                                    width: '44px', height: '52px', borderRadius: '6px', flexShrink: 0,
                                                    border: '1px solid var(--line-strong)',
                                                    background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                                } }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: row.name }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)', flexShrink: 0, marginLeft: '8px' }, children: row.wearCount })] }), _jsx("div", { style: { height: '3px', borderRadius: '2px', background: '#E8E3DA', marginTop: '6px', overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', width: `${Math.round((row.wearCount / maxWorn) * 100)}%`, background: 'var(--accent-green)' } }) }), _jsx("div", { style: { fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '4px' }, children: row.costPerWear != null ? `$${row.costPerWear.toFixed(2)} / wear` : 'no price logged' })] })] }) }, row.itemId))) }))] }), _jsxs("div", { children: [_jsx("div", { className: "section-label", style: { marginBottom: '12px' }, children: "Sitting idle" }), _jsx("div", { style: { border: '1px solid var(--line-soft)', borderRadius: '11px', overflow: 'hidden', marginBottom: '26px' }, children: (insights?.sittingIdle.length ?? 0) === 0 ? (_jsx("p", { style: { padding: '16px', fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "Nothing sitting idle right now." })) : (insights.sittingIdle.map((row, i) => (_jsxs("div", { style: {
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                                        borderTop: i === 0 ? 'none' : '1px solid var(--line-hairline)',
                                    }, children: [_jsx("div", { style: {
                                                width: '40px', height: '48px', borderRadius: '6px', flexShrink: 0,
                                                border: '1px solid var(--line-strong)',
                                                background: row.photoUrl ? `center/cover no-repeat url(${row.photoUrl})` : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                            } }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }, children: row.name }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--accent-amber)' }, children: row.reason })] }), _jsx("button", { className: "btn-secondary", style: { height: '30px', padding: '0 12px', fontSize: '12px', flexShrink: 0 }, children: row.actionLabel })] }, row.itemId)))) }), _jsx("div", { className: "section-label", style: { marginBottom: '12px' }, children: "Capsule efficiency" }), (insights?.capsuleEfficiency.length ?? 0) === 0 ? (_jsx("p", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "No capsules yet." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: insights.capsuleEfficiency.map((c) => (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '120px 1fr 26px', gap: '12px', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '13px', color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: c.name }), _jsx("div", { style: { height: '3px', borderRadius: '2px', background: '#E8E3DA', overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', width: `${c.efficiency}%`, background: 'var(--accent-green)' } }) }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', color: 'var(--ink-tertiary)' }, children: c.efficiency })] }, c.capsuleId))) }))] })] })] }));
}
