import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getClosets, getClosetItems, getClosetStats, getAllCapsules } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import { searchInputStyle } from '../components/NavBar';
import { useBreakpoint } from '../lib/useIsMobile';
import ClosetGrid from '../components/ClosetGrid';
import StatStrip from '../components/StatStrip';
import ItemUploadForm from '../components/ItemUploadForm';
const CHIPS = [
    { key: 'all', label: 'All' },
    { key: 'worn', label: 'Worn this month' },
    { key: 'dormant', label: 'Dormant 90d' },
    { key: 'hot', label: 'Hot climate' },
];
function formatPct(n) {
    return `${Math.round(n * 100)}%`;
}
function formatDelta(n) {
    const pct = Math.round(n * 100);
    if (pct === 0)
        return 'Flat vs last 30 days';
    return `${pct > 0 ? '+' : ''}${pct}% vs last 30 days`;
}
export default function ClosetPage() {
    const navigate = useNavigate();
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    const pagePadding = bp === 'mobile' ? '16px' : bp === 'tablet' ? '20px' : '28px';
    const titleSize = bp === 'mobile' ? '30px' : bp === 'tablet' ? '36px' : '42px';
    const [chip, setChip] = useState('all');
    const [search, setSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const { data: closets = [] } = useQuery({ queryKey: ['closets'], queryFn: getClosets });
    const closetId = closets[0]?.id ?? '';
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['closetItems', closetId],
        queryFn: () => getClosetItems(closetId),
        enabled: !!closetId,
    });
    const { data: stats } = useQuery({
        queryKey: ['closetStats', closetId],
        queryFn: () => getClosetStats(closetId),
        enabled: !!closetId,
    });
    // Active + archived: the closet summary count should not drop archived capsules.
    const { data: capsules = [] } = useQuery({ queryKey: ['capsules', 'all'], queryFn: getAllCapsules });
    useTopBarActions(_jsxs(_Fragment, { children: [_jsx("input", { style: searchInputStyle, placeholder: "Search your closet", value: search, onChange: (e) => setSearch(e.target.value), "aria-label": "Search your closet" }), _jsx("button", { className: "btn-primary", onClick: () => setShowAddForm(true), children: "Add item" })] }));
    const handleItemClick = (item) => navigate(`/items/${item.id}`);
    const filtered = items.filter((item) => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
            return false;
        if (chip === 'worn')
            return (item.wearCount ?? 0) > 0;
        if (chip === 'dormant')
            return item.dormant;
        if (chip === 'hot')
            return item.climate === 'tropical';
        return true;
    });
    const statCells = stats
        ? [
            { key: 'Worn this month', value: `${stats.wornThisMonth}`, sub: `of ${stats.totalItems} items` },
            { key: 'Closet utilisation', value: formatPct(stats.closetUtilisation), sub: formatDelta(stats.closetUtilisationDelta) },
            {
                key: 'Dormant 90+ days',
                value: `${stats.dormantCount}`,
                sub: stats.dormantCoolCount > 0 ? `${stats.dormantCoolCount} are cool-weather` : 'None cool-weather',
            },
            {
                key: 'Avg cost per wear',
                value: stats.avgCostPerWear != null ? `$${stats.avgCostPerWear.toFixed(2)}` : '—',
                sub: stats.avgCostPerWear != null ? 'across priced items' : 'no prices logged yet',
            },
        ]
        : [];
    return (_jsxs("div", { style: { padding: pagePadding, maxWidth: '1280px', margin: '0 auto' }, children: [_jsxs("div", { style: isMobile
                    ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginBottom: '18px', gap: '14px' }
                    : { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }, children: [_jsxs("div", { children: [_jsxs("div", { className: "eyebrow", children: [items.length, " items \u00B7 ", capsules.length, " capsules"] }), _jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: titleSize, fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }, children: closets[0]?.name ?? 'Your closet' })] }), _jsx("div", { "data-testid": "closet-filter-chips", style: isMobile
                            ? {
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'nowrap',
                                overflowX: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                width: '100%',
                                paddingBottom: '4px',
                            }
                            : { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: CHIPS.map((c) => (_jsx("button", { className: `chip${chip === c.key ? ' selected' : ''}`, onClick: () => setChip(c.key), style: { flex: '0 0 auto', whiteSpace: 'nowrap' }, children: c.label }, c.key))) })] }), stats && _jsx("div", { style: { marginBottom: '30px' }, children: _jsx(StatStrip, { stats: statCells }) }), isLoading ? (_jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "Loading\u2026" })) : (_jsx(ClosetGrid, { items: filtered, onItemClick: handleItemClick })), showAddForm && closetId && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, background: 'rgba(23,21,15,0.4)',
                    display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', zIndex: 200,
                }, children: _jsx("div", { "data-testid": "add-item-modal", style: isMobile
                        ? {
                            position: 'absolute',
                            inset: 0,
                            background: 'var(--bg-page)',
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch',
                        }
                        : {
                            background: 'var(--bg-page)',
                            borderRadius: '14px',
                            border: '1px solid var(--line-strong)',
                            overflowY: 'auto',
                            maxHeight: '90vh',
                            width: '100%',
                            maxWidth: '880px',
                            margin: '20px',
                        }, children: _jsx(ItemUploadForm, { closetId: closetId, onSuccess: () => setShowAddForm(false), onCancel: () => setShowAddForm(false) }) }) }))] }));
}
