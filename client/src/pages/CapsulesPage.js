import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCapsules, createCapsule, archiveCapsule, unarchiveCapsule } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import CapsuleCard from '../components/CapsuleCard';
const CHIPS = [
    { key: 'all', label: 'All' },
    { key: 'trip', label: 'Trips' },
    { key: 'standing', label: 'Standing' },
    { key: 'hot', label: 'Hot climate' },
    { key: 'archived', label: 'Archived' },
];
const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '18px',
};
const modalInputStyle = {
    width: '100%',
    height: '40px',
    padding: '0 13px',
    borderRadius: '9px',
    border: '1px solid var(--line-default)',
    fontSize: '14px',
};
export default function CapsulesPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [chip, setChip] = useState('all');
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [climate, setClimate] = useState('');
    const isArchivedView = chip === 'archived';
    const { data: capsules = [], isLoading: activeLoading } = useQuery({
        queryKey: ['capsules'],
        queryFn: () => getCapsules(),
    });
    const { data: archivedCapsules = [], isLoading: archivedLoading } = useQuery({
        queryKey: ['capsules', 'archived'],
        queryFn: () => getCapsules(true),
        enabled: isArchivedView,
    });
    const isLoading = isArchivedView ? archivedLoading : activeLoading;
    const archiveMutation = useMutation({
        mutationFn: (id) => archiveCapsule(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['capsules'] }),
    });
    const unarchiveMutation = useMutation({
        mutationFn: (id) => unarchiveCapsule(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['capsules'] }),
    });
    const createMutation = useMutation({
        mutationFn: () => createCapsule({ name, description: description || undefined, climate: climate || undefined }),
        onSuccess: (capsule) => {
            qc.invalidateQueries({ queryKey: ['capsules'] });
            setShowCreate(false);
            setName('');
            setDescription('');
            setClimate('');
            navigate(`/capsules/${capsule.id}`);
        },
    });
    useTopBarActions(_jsx("button", { className: "btn-primary", onClick: () => setShowCreate(true), children: "New capsule" }));
    const tripCount = capsules.filter((c) => c.kind === 'trip').length;
    const filtered = isArchivedView
        ? archivedCapsules
        : capsules.filter((c) => {
            if (chip === 'trip')
                return c.kind === 'trip';
            if (chip === 'standing')
                return c.kind !== 'trip';
            if (chip === 'hot')
                return c.climate === 'tropical';
            return true;
        });
    return (_jsxs("div", { style: { padding: '28px', maxWidth: '1280px', margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }, children: [_jsxs("div", { children: [_jsxs("div", { className: "eyebrow", children: [capsules.length, " capsules \u00B7 ", tripCount, " tied to trips"] }), _jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }, children: "Capsules" })] }), _jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: CHIPS.map((c) => (_jsx("button", { className: `chip${chip === c.key ? ' selected' : ''}`, onClick: () => setChip(c.key), children: c.label }, c.key))) })] }), isLoading && _jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "Loading\u2026" }), _jsx("div", { style: gridStyle, children: filtered.map((capsule) => (_jsx(CapsuleCard, { capsule: capsule, onClick: () => navigate(`/capsules/${capsule.id}`), archived: isArchivedView, onArchiveToggle: () => isArchivedView
                        ? unarchiveMutation.mutate(capsule.id)
                        : archiveMutation.mutate(capsule.id) }, capsule.id))) }), filtered.length === 0 && !isLoading && (_jsx("p", { style: { color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }, children: isArchivedView ? 'No archived capsules' : 'No capsules yet — create your first one.' })), showCreate && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, background: 'rgba(23,21,15,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
                }, children: _jsxs("form", { onSubmit: (e) => { e.preventDefault(); createMutation.mutate(); }, style: { background: 'var(--bg-page)', borderRadius: '14px', padding: '26px', width: '360px', border: '1px solid var(--line-strong)' }, children: [_jsx("h2", { style: { marginBottom: '18px', fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400 }, children: "New capsule" }), _jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }, children: "Name *" }), _jsx("input", { autoFocus: true, style: modalInputStyle, value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { style: { marginBottom: '14px' }, children: [_jsx("label", { style: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }, children: "Description" }), _jsx("input", { style: modalInputStyle, value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }, children: "Climate band" }), _jsxs("select", { style: modalInputStyle, value: climate, onChange: (e) => setClimate(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), ['tropical', 'temperate', 'cold', 'layering'].map((c) => (_jsx("option", { value: c, children: c.charAt(0).toUpperCase() + c.slice(1) }, c)))] })] }), _jsxs("div", { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' }, children: [_jsx("button", { type: "button", className: "btn-secondary", onClick: () => setShowCreate(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn-primary", disabled: !name || createMutation.isPending, children: createMutation.isPending ? 'Creating…' : 'Create' })] })] }) }))] }));
}
