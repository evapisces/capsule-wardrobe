import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrip, getAllCapsules, linkCapsuleToTrip, unlinkCapsuleFromTrip, deleteTrip, getTripWeather, getTripDays, setTripDayOutfit, getTripPacking, setPackingItemPacked, getPackingSuggestions, } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import BottomSheet from '../components/BottomSheet';
import Tooltip from '../components/Tooltip';
import DayStrip from '../components/DayStrip';
import PackingList from '../components/PackingList';
function describeItem(item) {
    const details = [item.brand, item.category, item.size, item.color, item.climate]
        .filter((v) => Boolean(v));
    return details.length ? `${item.name} — ${details.join(' · ')}` : item.name;
}
const CLIMATE_THEME = {
    tropical: { icon: '☀️', gradient: 'linear-gradient(135deg, #fff1d6, #ffd98a)', accent: '#b8710f' },
    temperate: { icon: '⛅', gradient: 'linear-gradient(135deg, #dff5ea, #b8e6d1)', accent: '#1b9e6b' },
    cold: { icon: '❄️', gradient: 'linear-gradient(135deg, #e3f1fc, #b8dcf5)', accent: '#2274a5' },
    layering: { icon: '🌦️', gradient: 'linear-gradient(135deg, #efe6fc, #d9c8f5)', accent: '#7952b3' },
};
export default function TripDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [expandedCapsuleIds, setExpandedCapsuleIds] = useState(new Set());
    const { data: trip, isLoading } = useQuery({
        queryKey: ['trip', id],
        queryFn: () => getTrip(id),
        enabled: !!id,
    });
    const { data: allCapsules = [] } = useQuery({
        // Includes archived capsules so an already-linked archived capsule still
        // shows in the trip-linking picker (explicitly out of scope for archiving).
        queryKey: ['capsules', 'all'],
        queryFn: getAllCapsules,
        enabled: sheetOpen,
    });
    const { data: weather, isLoading: weatherLoading, isError: weatherError } = useQuery({
        queryKey: ['tripWeather', id],
        queryFn: () => getTripWeather(id),
        enabled: !!id,
        retry: false,
    });
    const { data: days = [] } = useQuery({
        queryKey: ['tripDays', id],
        queryFn: () => getTripDays(id),
        enabled: !!id,
    });
    const { data: packing = [] } = useQuery({
        queryKey: ['tripPacking', id],
        queryFn: () => getTripPacking(id),
        enabled: !!id,
    });
    const { data: suggestions = [] } = useQuery({
        queryKey: ['tripPackingSuggestions', id],
        queryFn: () => getPackingSuggestions(id),
        enabled: !!id,
    });
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['trip', id] });
        qc.invalidateQueries({ queryKey: ['tripWeather', id] });
    };
    const linkMutation = useMutation({
        mutationFn: (capsuleId) => linkCapsuleToTrip(id, capsuleId),
        onSuccess: () => { invalidate(); setSheetOpen(false); },
    });
    const unlinkMutation = useMutation({
        mutationFn: (capsuleId) => unlinkCapsuleFromTrip(id, capsuleId),
        onSuccess: invalidate,
    });
    const deleteMutation = useMutation({
        mutationFn: () => deleteTrip(id),
        onSuccess: () => navigate('/trips'),
    });
    const dayPickMutation = useMutation({
        mutationFn: ({ date, outfitId }) => setTripDayOutfit(id, date, outfitId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tripDays', id] }),
    });
    const packToggleMutation = useMutation({
        mutationFn: ({ itemId, packed }) => setPackingItemPacked(id, itemId, packed),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tripPacking', id] }),
    });
    useTopBarActions(_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-secondary", onClick: () => window.print(), children: "Print list" }), _jsx("button", { className: "btn-primary", onClick: () => navigate(-1), children: "Done" })] }));
    const toggleExpand = (capsuleId) => {
        setExpandedCapsuleIds((prev) => {
            const next = new Set(prev);
            if (next.has(capsuleId))
                next.delete(capsuleId);
            else
                next.add(capsuleId);
            return next;
        });
    };
    if (isLoading || !trip)
        return _jsx("p", { style: { padding: '28px', color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "Loading\u2026" });
    const linkedCapsuleIds = new Set((trip.capsules ?? []).map((c) => c.id));
    const unlinkableCapsules = allCapsules.filter((c) => !linkedCapsuleIds.has(c.id));
    const outfitOptions = (trip.capsules ?? []).flatMap((c) => c.outfits ?? []);
    const offClimateCapsuleCount = weather?.capsuleSuitability.filter((s) => !s.suitable).length ?? 0;
    const today = new Date();
    const dayOfTrip = Math.min(days.length, Math.max(1, Math.floor((today.getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1));
    return (_jsxs("div", { style: { padding: '28px', maxWidth: '1200px', margin: '0 auto' }, children: [_jsx(Link, { to: "/trips", style: { fontSize: '13px', color: 'var(--ink-tertiary)' }, children: "Trips" }), _jsxs("div", { className: "eyebrow", style: { marginTop: '10px' }, children: ["Trip \u00B7 day ", dayOfTrip, " of ", days.length || '—'] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }, children: trip.name }), weather && _jsxs("span", { className: "pill-green", children: [weather.predictedClimate, " \u00B7 ", Math.round(weather.avgHighF), "\u00B0 / ", Math.round(weather.avgLowF), "\u00B0"] }), offClimateCapsuleCount > 0 && _jsxs("span", { className: "pill-amber", children: [offClimateCapsuleCount, " capsule", offClimateCapsuleCount === 1 ? '' : 's', " off-climate"] })] }), _jsxs("p", { style: { fontSize: '14px', color: 'var(--ink-tertiary)', marginTop: '4px', marginBottom: '22px' }, children: [trip.destination, " \u00B7 ", new Date(trip.startDate).toLocaleDateString(), " \u2013 ", new Date(trip.endDate).toLocaleDateString()] }), _jsxs("div", { style: {
                    borderRadius: '14px', marginBottom: '24px', padding: '16px 20px',
                    background: weather ? CLIMATE_THEME[weather.predictedClimate].gradient : '#fff',
                    border: weather ? 'none' : '1px solid var(--line-strong)',
                }, children: [_jsx("h2", { style: {
                            fontSize: '11px', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.05em',
                            textTransform: 'uppercase', color: weather ? 'rgba(0,0,0,0.5)' : 'var(--ink-tertiary)',
                        }, children: "Expected Weather" }), weatherLoading && _jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "\u2601\uFE0F Checking forecast\u2026" }), weatherError && (_jsxs("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px' }, children: ["\uD83E\uDD37 Couldn't find weather data for \"", trip.destination, "\"."] })), weather && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '14px' }, children: [_jsx("div", { style: { fontSize: '38px', lineHeight: 1 }, children: CLIMATE_THEME[weather.predictedClimate].icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { fontSize: '26px', fontWeight: 800, color: '#2b2b2b', lineHeight: 1.15 }, children: [Math.round(weather.avgHighF), "\u00B0", _jsxs("span", { style: { fontSize: '16px', fontWeight: 600, color: 'rgba(0,0,0,0.45)' }, children: [" / ", Math.round(weather.avgLowF), "\u00B0F"] })] }), _jsxs("div", { style: { fontSize: '13px', color: 'rgba(0,0,0,0.6)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: ["\uD83D\uDCCD ", weather.resolvedLocation] })] }), _jsxs("div", { style: { textAlign: 'right', flexShrink: 0 }, children: [_jsx("span", { style: {
                                            display: 'inline-block', padding: '4px 10px', borderRadius: '999px',
                                            background: 'rgba(255,255,255,0.65)', color: CLIMATE_THEME[weather.predictedClimate].accent,
                                            fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
                                        }, children: weather.predictedClimate }), _jsx("div", { style: { fontSize: '10px', color: 'rgba(0,0,0,0.45)', marginTop: '5px' }, children: weather.source === 'forecast' ? 'Live forecast' : 'Historical avg' })] })] }))] }), trip.autoLogEnabled && (_jsx("div", { style: {
                    background: 'var(--accent-green-tint)', borderRadius: '12px', padding: '14px 18px',
                    marginBottom: '26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 } }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--accent-green-ink)' }, children: "Auto-logging wears while this trip is active" }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--accent-green)' }, children: "Each day's outfit is recorded from your linked capsules. Correct any day in the strip below." })] })] }) })), days.length > 0 && (_jsx("div", { style: { marginBottom: '30px' }, children: _jsx(DayStrip, { days: days, outfitOptions: outfitOptions, onPick: (date, outfitId) => dayPickMutation.mutate({ date, outfitId }) }) })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '26px', marginBottom: '32px' }, children: [_jsx(PackingList, { rows: packing, onToggle: (itemId, packed) => packToggleMutation.mutate({ itemId, packed }) }), _jsxs("div", { children: [_jsx("div", { className: "section-label", style: { marginBottom: '10px' }, children: "From your last trips" }), _jsxs("div", { style: { border: '1px solid var(--line-soft)', borderRadius: '11px', padding: '16px' }, children: [suggestions.length === 0 ? (_jsx("p", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "No suggestions yet \u2014 wear a few items first." })) : (suggestions.map((s) => (_jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("div", { style: { fontSize: '13.5px', fontWeight: 500, color: 'var(--ink-primary)' }, children: s.name }), _jsx("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: s.reason })] }, s.itemId)))), _jsx("p", { style: { fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '10px' }, children: "Built from what you actually wore, not what you packed." })] })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }, children: [_jsx("span", { className: "section-label", children: "Capsules" }), _jsx("button", { className: "btn-secondary", onClick: () => setSheetOpen(true), children: "Link capsule" })] }), (trip.capsules ?? []).length === 0 && (_jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px', marginBottom: '20px' }, children: "No capsules linked yet." })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }, children: (trip.capsules ?? []).map((capsule) => {
                    const isExpanded = expandedCapsuleIds.has(capsule.id);
                    const items = capsule.items ?? [];
                    const suitability = weather?.capsuleSuitability.find((c) => c.capsuleId === capsule.id);
                    return (_jsxs("div", { style: { border: '1px solid var(--line-soft)', borderRadius: '10px', overflow: 'hidden' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }, onClick: () => toggleExpand(capsule.id), children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: '14px', color: 'var(--ink-primary)' }, children: capsule.name }), suitability && suitability.itemClimates.length > 0 && weather && (_jsx(Tooltip, { content: suitability.suitable
                                                            ? `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, which matches the ${weather.predictedClimate} conditions expected for this trip.`
                                                            : `This capsule's items are tagged for ${suitability.itemClimates.join(', ')} weather, but this trip is expected to be ${weather.predictedClimate}. You may want to swap in different items.`, children: _jsx("span", { className: suitability.suitable ? 'pill-green' : 'pill-amber', style: { cursor: 'help' }, children: suitability.suitable ? '✓ Good fit' : '⚠ Mismatch' }) }))] }), _jsxs("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', marginTop: '2px' }, children: [items.length, " item", items.length !== 1 ? 's' : ''] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); unlinkMutation.mutate(capsule.id); }, className: "btn-secondary", style: { height: '28px', padding: '0 12px', fontSize: '12px' }, children: "Unlink" }), _jsx("span", { style: { fontSize: '12px', color: 'var(--ink-tertiary)' }, children: isExpanded ? '▲' : '▼' })] })] }), isExpanded && (_jsx("div", { style: { padding: '0 16px 14px', borderTop: '1px solid var(--line-hairline)' }, children: items.length === 0 ? (_jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px', paddingTop: '10px' }, children: "No items in this capsule." })) : (_jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px' }, children: items.map((item) => (_jsx(Tooltip, { content: describeItem(item), children: _jsx("div", { style: {
                                                width: '52px', height: '52px', borderRadius: '8px',
                                                background: item.photoUrl ? undefined : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                                border: '1px solid var(--line-strong)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden',
                                                cursor: 'help',
                                            }, children: item.photoUrl
                                                ? _jsx("img", { src: item.photoUrl, alt: item.name, style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                                : '👕' }) }, item.id))) })) }))] }, capsule.id));
                }) }), _jsx("button", { onClick: () => deleteMutation.mutate(), disabled: deleteMutation.isPending, style: { background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '13px', padding: 0, cursor: 'pointer' }, children: deleteMutation.isPending ? 'Deleting…' : 'Delete trip' }), _jsx(BottomSheet, { isOpen: sheetOpen, onClose: () => setSheetOpen(false), title: "Link a Capsule", children: unlinkableCapsules.length === 0 ? (_jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '14px' }, children: "All capsules are already linked." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: unlinkableCapsules.map((capsule) => (_jsxs("button", { onClick: () => linkMutation.mutate(capsule.id), disabled: linkMutation.isPending, style: { textAlign: 'left', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line-strong)', background: '#fff', cursor: 'pointer' }, children: [_jsx("div", { style: { fontWeight: 500 }, children: capsule.name }), capsule.description && _jsx("div", { style: { fontSize: '12px', color: 'var(--ink-tertiary)', marginTop: '2px' }, children: capsule.description })] }, capsule.id))) })) })] }));
}
