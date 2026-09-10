import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useSyncExternalStore } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClosetItem, updateClosetItem, deleteClosetItem, uploadPhoto, getItemCapsules, getItemWearHistory, logItemWear, undoItemWear, } from '../lib/api';
import StatStrip from '../components/StatStrip';
import { useBreakpoint } from '../lib/useIsMobile';
/**
 * True while the viewport is narrower than `maxPx`. Used for the sub-mobile
 * (`< 400px`) rule where the Wore-it / Edit pair must stack full-width — a
 * threshold finer than the shared breakpoint contract exposes.
 */
function useMaxWidth(maxPx) {
    const query = `(max-width: ${maxPx - 1}px)`;
    return useSyncExternalStore((onChange) => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
            return () => { };
        const mql = window.matchMedia(query);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false), () => false);
}
function wearSourceLabel(h) {
    if (h.corrected)
        return 'Corrected';
    return h.source === 'trip_auto' ? 'Trip auto-log' : 'Tapped wore it';
}
const inputStyle = {
    height: '40px',
    padding: '0 13px',
    borderRadius: '9px',
    border: '1px solid var(--line-default)',
    background: '#FFFFFF',
    fontSize: '14px',
    width: '100%',
};
const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--ink-tertiary)',
    display: 'block',
    marginBottom: '6px',
};
// Wear dates are stored as UTC midnight ("the calendar day this was worn"),
// not a local wall-clock instant — so day comparisons and display must stay
// in UTC too, or a user west of UTC sees "today's" wear as yesterday.
function isSameUTCDate(a, b) {
    return (a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate());
}
function formatLastWorn(item) {
    if (!item.lastWornAt)
        return '—';
    const days = Math.floor((Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0)
        return 'Today';
    if (days === 1)
        return '1 day';
    return `${days} days`;
}
export default function ItemDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    const stackActions = useMaxWidth(400);
    const [editing, setEditing] = useState(false);
    const touchTargetStyle = isMobile ? { minHeight: '44px' } : undefined;
    const heroHeight = isMobile ? 'min(60vh, 380px)' : '470px';
    // >= 16px keeps iOS Safari from auto-zooming when an input takes focus.
    const editInputStyle = isMobile ? { ...inputStyle, fontSize: '16px' } : inputStyle;
    const { data: item, isLoading } = useQuery({
        queryKey: ['item', id],
        queryFn: () => getClosetItem(id),
        enabled: !!id,
    });
    const { data: capsules = [] } = useQuery({
        queryKey: ['itemCapsules', id],
        queryFn: () => getItemCapsules(id),
        enabled: !!id,
    });
    const { data: history = [] } = useQuery({
        queryKey: ['itemWearHistory', id],
        queryFn: () => getItemWearHistory(id),
        enabled: !!id,
    });
    const wornToday = item?.lastWornAt
        ? isSameUTCDate(new Date(item.lastWornAt), new Date())
        : false;
    const wearMutation = useMutation({
        mutationFn: () => (wornToday ? undoItemWear(id) : logItemWear(id)),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['item', id] });
            qc.invalidateQueries({ queryKey: ['itemWearHistory', id] });
            qc.invalidateQueries({ queryKey: ['closetItems'] });
            qc.invalidateQueries({ queryKey: ['closetStats'] });
        },
    });
    const [form, setForm] = useState({
        name: '', category: 'tops', color: '',
        climate: '', size: '', brand: '', notes: '', pricePaid: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const startEdit = () => {
        if (!item)
            return;
        setForm({
            name: item.name,
            category: item.category,
            color: item.color ?? '',
            climate: item.climate ?? '',
            size: item.size ?? '',
            brand: item.brand ?? '',
            notes: item.notes ?? '',
            pricePaid: item.pricePaid != null ? String(item.pricePaid) : '',
        });
        setPhotoFile(null);
        setPhotoPreview(item.photoUrl ?? null);
        setEditing(true);
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };
    const updateMutation = useMutation({
        mutationFn: async () => {
            let photoUrl;
            if (photoFile) {
                setUploading(true);
                const { key } = await uploadPhoto(photoFile);
                photoUrl = key;
                setUploading(false);
            }
            return updateClosetItem(id, {
                ...form,
                color: form.color || undefined,
                climate: form.climate || undefined,
                size: form.size || undefined,
                brand: form.brand || undefined,
                notes: form.notes || undefined,
                pricePaid: form.pricePaid ? Number(form.pricePaid) : undefined,
                ...(photoUrl ? { photoUrl } : {}),
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['item', id] });
            qc.invalidateQueries({ queryKey: ['closetItems'] });
            setEditing(false);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: () => deleteClosetItem(id),
        onSuccess: () => navigate('/'),
    });
    if (isLoading || !item)
        return _jsx("p", { style: { padding: '28px', color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "Loading\u2026" });
    const stats = [
        { key: 'Wears', value: `${item.wearCount ?? 0}`, sub: item.dormant ? 'Dormant' : 'Active' },
        { key: 'Cost per wear', value: item.costPerWear != null ? `$${item.costPerWear.toFixed(2)}` : '—', sub: item.pricePaid != null ? `paid $${item.pricePaid.toFixed(2)}` : 'no price logged' },
        { key: 'Last worn', value: formatLastWorn(item), sub: item.lastWornAt ? 'ago' : 'never worn' },
        { key: 'In capsules', value: `${item.capsuleCount ?? 0}`, sub: (item.capsuleCount ?? 0) === 1 ? 'capsule' : 'capsules' },
    ];
    return (_jsxs("div", { style: { padding: '28px', maxWidth: '1100px', margin: '0 auto' }, children: [_jsx(Link, { to: "/", style: { fontSize: '13px', color: 'var(--ink-tertiary)' }, children: "Closet" }), editing ? (_jsxs("form", { onSubmit: (e) => { e.preventDefault(); updateMutation.mutate(); }, style: { marginTop: '20px', maxWidth: '460px' }, children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: labelStyle, children: "Photo" }), photoPreview && (_jsx("img", { src: photoPreview, alt: "Preview", style: { width: '80px', height: '80px', objectFit: 'cover',
                                    borderRadius: '8px', marginBottom: '8px', display: 'block' } })), _jsx("input", { type: "file", accept: "image/*", onChange: handleFileChange })] }), [
                        { label: 'Name', key: 'name', type: 'text' },
                        { label: 'Color', key: 'color', type: 'text' },
                        { label: 'Size', key: 'size', type: 'text' },
                        { label: 'Brand', key: 'brand', type: 'text' },
                    ].map(({ label, key, type }) => (_jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: labelStyle, children: label }), _jsx("input", { type: type, style: editInputStyle, value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) })] }, key))), _jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: labelStyle, children: "Category" }), _jsx("select", { style: editInputStyle, value: form.category, onChange: (e) => setForm((f) => ({ ...f, category: e.target.value })), children: ['tops', 'bottoms', 'dresses', 'shoes', 'accessories', 'outerwear'].map((c) => (_jsx("option", { value: c, children: c.charAt(0).toUpperCase() + c.slice(1) }, c))) })] }), _jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: labelStyle, children: "Climate band" }), _jsxs("select", { style: editInputStyle, value: form.climate, onChange: (e) => setForm((f) => ({ ...f, climate: e.target.value })), children: [_jsx("option", { value: "", children: "\u2014" }), ['tropical', 'temperate', 'cold', 'layering'].map((c) => (_jsx("option", { value: c, children: c.charAt(0).toUpperCase() + c.slice(1) }, c)))] })] }), _jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: labelStyle, children: "Price paid" }), _jsx("input", { type: "number", min: "0", step: "0.01", style: editInputStyle, value: form.pricePaid, onChange: (e) => setForm((f) => ({ ...f, pricePaid: e.target.value })) }), _jsx("span", { style: { fontSize: '11.5px', color: 'var(--ink-tertiary)' }, children: "Used for cost per wear" })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: labelStyle, children: "Notes" }), _jsx("textarea", { style: { ...editInputStyle, height: '80px', padding: '10px 13px', resize: 'vertical' }, value: form.notes, onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })) })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx("button", { type: "submit", className: "btn-primary", style: touchTargetStyle, disabled: updateMutation.isPending, children: uploading ? 'Uploading…' : updateMutation.isPending ? 'Saving…' : 'Save' }), _jsx("button", { type: "button", className: "btn-secondary", style: touchTargetStyle, onClick: () => setEditing(false), children: "Cancel" })] })] })) : (_jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: bp === 'desktop' ? '400px 1fr' : '1fr',
                    gap: isMobile ? '20px' : '36px',
                    marginTop: '16px',
                }, children: [_jsx("div", { children: item.photoUrl ? (_jsx("img", { src: item.photoUrl, alt: item.name, style: { width: '100%', height: heroHeight, objectFit: 'cover', borderRadius: '12px' } })) : (_jsx("div", { style: {
                                width: '100%', height: heroHeight, borderRadius: '12px',
                                background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                border: '1px solid var(--line-strong)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px',
                            }, children: "\uD83D\uDC55" })) }), _jsxs("div", { children: [_jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: '40px', fontWeight: 400, lineHeight: 1.05, color: 'var(--ink-primary)' }, children: item.name }), _jsx("p", { style: { fontSize: '14px', color: 'var(--ink-tertiary)', marginTop: '4px' }, children: [item.brand, item.category, item.size, item.color, item.notes].filter(Boolean).join(' · ') }), _jsxs("div", { style: { display: 'flex', gap: '10px', marginTop: '18px', flexDirection: stackActions ? 'column' : 'row' }, children: [_jsx("button", { className: "btn-positive", style: { ...touchTargetStyle, ...(stackActions ? { width: '100%' } : null) }, onClick: () => wearMutation.mutate(), disabled: wearMutation.isPending, children: wornToday ? 'Undo — worn today' : 'Wore it today' }), _jsx("button", { className: "btn-secondary", style: { ...touchTargetStyle, ...(stackActions ? { width: '100%' } : null) }, onClick: startEdit, children: "Edit" })] }), _jsx("div", { style: { marginTop: '24px', marginBottom: '26px' }, children: _jsx(StatStrip, { stats: stats }) }), _jsx("div", { className: "section-label", style: { marginBottom: '10px' }, children: "In these capsules" }), capsules.length === 0 ? (_jsx("p", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)', marginBottom: '26px' }, children: "Not in any capsules yet." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '26px' }, children: capsules.map((c) => (_jsxs(Link, { to: `/capsules/${c.id}`, style: {
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        border: '1px solid var(--line-soft)', borderRadius: '10px', padding: '11px 14px',
                                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }, children: c.name }), _jsxs("div", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: [c.itemCount, " items \u00B7 ", c.tripLabel] })] }), _jsx("span", { className: c.suitable ? 'pill-green' : 'pill-amber', children: c.suitable ? 'Matches climate' : 'Too light for climate' })] }, c.id))) })), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }, children: [_jsx("span", { className: "section-label", children: "Wear history" }), _jsxs("span", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: [history.length, " total"] })] }), history.length === 0 ? (_jsx("p", { style: { fontSize: '12.5px', color: 'var(--ink-tertiary)' }, children: "No wears logged yet." })) : (_jsx("div", { style: { border: '1px solid var(--line-soft)', borderRadius: '10px', overflow: 'hidden' }, children: history.map((h, i) => {
                                    const dateLabel = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                                    const borderTop = i === 0 ? 'none' : '1px solid var(--line-hairline)';
                                    if (isMobile) {
                                        return (_jsxs("div", { "data-testid": "wear-history-row", style: { padding: '11px 14px', fontSize: '12.5px', borderTop }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)' }, children: dateLabel }), _jsx("span", { style: { fontWeight: 500, color: 'var(--ink-primary)' }, children: h.outfitName ?? item.name })] }), _jsxs("div", { style: { marginTop: '3px', color: 'var(--ink-tertiary)' }, children: [(h.context ?? '—'), " \u00B7 ", wearSourceLabel(h)] })] }, h.id));
                                    }
                                    return (_jsxs("div", { "data-testid": "wear-history-row", style: {
                                            display: 'grid', gridTemplateColumns: '110px 1fr 150px 120px', gap: '12px',
                                            padding: '11px 14px', fontSize: '12.5px', borderTop,
                                        }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)' }, children: dateLabel }), _jsx("span", { style: { fontWeight: 500, color: 'var(--ink-primary)' }, children: h.outfitName ?? item.name }), _jsx("span", { style: { color: 'var(--ink-tertiary)' }, children: h.context ?? '—' }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)' }, children: wearSourceLabel(h) })] }, h.id));
                                }) })), _jsx("button", { onClick: () => deleteMutation.mutate(), disabled: deleteMutation.isPending, style: {
                                    marginTop: '26px', background: 'none', border: 'none', color: 'var(--accent-amber)',
                                    fontSize: '13px', padding: isMobile ? '11px 0' : 0,
                                    minHeight: isMobile ? '44px' : undefined,
                                    display: 'block', textAlign: 'left', cursor: 'pointer',
                                }, children: deleteMutation.isPending ? 'Deleting…' : 'Delete item' })] })] }))] }));
}
