import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTrips, createTrip } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import type { Trip } from '@capsule/shared';

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' };
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
};
const inputStyle: React.CSSProperties = {
  height: '40px', padding: '0 13px', borderRadius: '9px',
  border: '1px solid var(--line-default)', fontSize: '14px', width: '100%', boxSizing: 'border-box',
};

function tripLength(startDate: string, endDate: string): string {
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
    onSuccess: (trip: Trip) => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      setShowCreate(false);
      setForm({ name: '', destination: '', startDate: '', endDate: '' });
      navigate(`/trips/${trip.id}`);
    },
  });

  useTopBarActions(
    <button className="btn-primary" onClick={() => setShowCreate(true)}>New trip</button>
  );

  const isValid = form.name && form.destination && form.startDate && form.endDate;

  return (
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '22px' }}>
        <div className="eyebrow">{trips.length} trip{trips.length === 1 ? '' : 's'}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }}>
          Trips
        </h1>
      </div>

      {isLoading && <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            style={{
              textAlign: 'left', padding: '18px 22px',
              border: '1px solid var(--line-strong)', borderRadius: '12px',
              background: 'var(--bg-raised)', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'border-color 120ms ease-out',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--ink-primary)', lineHeight: 1.1 }}>
                {trip.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-tertiary)', marginTop: '3px' }}>
                {trip.destination} · {tripLength(trip.startDate, trip.endDate)}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)', textAlign: 'right' }}>
              <div>{new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div>– {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          </button>
        ))}
      </div>

      {trips.length === 0 && !isLoading && (
        <p style={{ color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
          No trips yet — plan your first one.
        </p>
      )}

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(23,21,15,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: 'var(--bg-page)', borderRadius: '14px', padding: '26px', width: '380px', border: '1px solid var(--line-strong)' }}
          >
            <h2 style={{ marginBottom: '18px', fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: 'var(--ink-primary)' }}>
              New trip
            </h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>Name *</label>
              <input autoFocus style={inputStyle} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Destination *</label>
              <input style={inputStyle} value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Start date *</label>
                <input type="date" style={inputStyle} value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>End date *</label>
                <input type="date" style={inputStyle} value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!isValid || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
