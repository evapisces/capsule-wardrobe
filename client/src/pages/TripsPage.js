import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTrips, createTrip } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' };
const labelStyle = {
    fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
};
const inputStyle = {
    height: '40px', padding: '0 13px', borderRadius: '9px',
    border: '1px solid var(--line-default)', fontSize: '14px', width: '100%', boxSizing: 'border-box',
};
function tripLength(startDate, endDate) {
    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    return `${days} day${days === 1 ? '' : 's'}`;
}
export default function TripsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' });
    const { data: trips = [], isLoading } = useQuery({
        queryKey: ['trips'],
        queryFn: getTrips,
    });
    const createMutation = useMutation({
        mutationFn: () => createTrip(form),
        onSuccess: (trip) => {
            qc.invalidateQueries({ queryKey: ['trips'] });
            setShowCreate(false);
            setForm({ name: '', destination: '', startDate: '', endDate: '' });
            navigate(`/trips/${trip.id}`);
        },
    });
    useTopBarActions(_jsx("button", { className: "btn-primary", onClick: () => setShowCreate(true), children: "New trip" }));
    const isValid = form.name && form.destination && form.startDate && form.endDate;
    return (_jsxs("div", { style: { padding: '28px', maxWidth: '1280px', margin: '0 auto' }, children: [_jsxs("div", { style: { marginBottom: '22px' }, children: [_jsxs("div", { className: "eyebrow", children: [trips.length, " trip", trips.length === 1 ? '' : 's'] }), _jsx("h1", { style: { fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }, children: "Trips" })] }), isLoading && _jsx("p", { style: { color: 'var(--ink-tertiary)', fontSize: '13px' }, children: "Loading\u2026" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: trips.map((trip) => (_jsxs("button", { onClick: () => navigate(`/trips/${trip.id}`), style: {
                        textAlign: 'left', padding: '18px 22px',
                        border: '1px solid var(--line-strong)', borderRadius: '12px',
                        background: 'var(--bg-raised)', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'border-color 120ms ease-out',
                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--ink-primary)', lineHeight: 1.1 }, children: trip.name }), _jsxs("div", { style: { fontSize: '13px', color: 'var(--ink-tertiary)', marginTop: '3px' }, children: [trip.destination, " \u00B7 ", tripLength(trip.startDate, trip.endDate)] })] }), _jsxs("div", { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)', textAlign: 'right' }, children: [_jsx("div", { children: new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }), _jsxs("div", { children: ["\u2013 ", new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] })] })] }, trip.id))) }), trips.length === 0 && !isLoading && (_jsx("p", { style: { color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }, children: "No trips yet \u2014 plan your first one." })), showCreate && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, background: 'rgba(23,21,15,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
                }, children: _jsxs("form", { onSubmit: (e) => { e.preventDefault(); createMutation.mutate(); }, style: { background: 'var(--bg-page)', borderRadius: '14px', padding: '26px', width: '380px', border: '1px solid var(--line-strong)' }, children: [_jsx("h2", { style: { marginBottom: '18px', fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: 'var(--ink-primary)' }, children: "New trip" }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, children: "Name *" }), _jsx("input", { autoFocus: true, style: inputStyle, value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), required: true })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, children: "Destination *" }), _jsx("input", { style: inputStyle, value: form.destination, onChange: (e) => setForm((f) => ({ ...f, destination: e.target.value })), required: true })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsxs("div", { style: { ...fieldStyle, flex: 1 }, children: [_jsx("label", { style: labelStyle, children: "Start date *" }), _jsx("input", { type: "date", style: inputStyle, value: form.startDate, onChange: (e) => setForm((f) => ({ ...f, startDate: e.target.value })), required: true })] }), _jsxs("div", { style: { ...fieldStyle, flex: 1 }, children: [_jsx("label", { style: labelStyle, children: "End date *" }), _jsx("input", { type: "date", style: inputStyle, value: form.endDate, onChange: (e) => setForm((f) => ({ ...f, endDate: e.target.value })), required: true })] })] }), _jsxs("div", { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }, children: [_jsx("button", { type: "button", className: "btn-secondary", onClick: () => setShowCreate(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn-primary", disabled: !isValid || createMutation.isPending, children: createMutation.isPending ? 'Creating…' : 'Create' })] })] }) }))] }));
}
