import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTrips, createTrip } from '../lib/api';
import type { Trip } from '@capsule/shared';

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

  const fieldStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px',
  };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#666' };
  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8',
    fontSize: '14px', width: '100%',
  };

  const isValid = form.name && form.destination && form.startDate && form.endDate;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Trips</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          + New Trip
        </button>
      </div>

      {isLoading && <p style={{ color: '#aaa' }}>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            style={{
              textAlign: 'left', padding: '16px 20px',
              border: '1px solid #e0d8cc', borderRadius: '10px',
              background: '#fff', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{trip.name}</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{trip.destination}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'right' }}>
              <div>{new Date(trip.startDate).toLocaleDateString()}</div>
              <div>→ {new Date(trip.endDate).toLocaleDateString()}</div>
            </div>
          </button>
        ))}
      </div>

      {trips.length === 0 && !isLoading && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
          No trips yet — plan your first one.
        </p>
      )}

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '380px' }}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>New Trip</h2>

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
                <label style={labelStyle}>Start Date *</label>
                <input type="date" style={inputStyle} value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>End Date *</label>
                <input type="date" style={inputStyle} value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', border: '1px solid #d8d0c8', borderRadius: '6px', background: '#fff' }}>
                Cancel
              </button>
              <button type="submit" disabled={!isValid || createMutation.isPending}
                style={{ padding: '8px 16px', background: '#0bcddb', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 600,
                  opacity: (!isValid || createMutation.isPending) ? 0.6 : 1 }}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
