import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCapsules, createCapsule } from '../lib/api';
import type { Capsule } from '@capsule/shared';

export default function CapsulesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: capsules = [], isLoading } = useQuery({
    queryKey: ['capsules'],
    queryFn: getCapsules,
  });

  const createMutation = useMutation({
    mutationFn: () => createCapsule({ name, description: description || undefined }),
    onSuccess: (capsule: Capsule) => {
      qc.invalidateQueries({ queryKey: ['capsules'] });
      setShowCreate(false);
      setName('');
      setDescription('');
      navigate(`/capsules/${capsule.id}`);
    },
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Capsules</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          + New Capsule
        </button>
      </div>

      {isLoading && <p style={{ color: '#aaa' }}>Loading…</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {capsules.map((capsule) => (
          <button
            key={capsule.id}
            onClick={() => navigate(`/capsules/${capsule.id}`)}
            style={{
              textAlign: 'left', padding: '16px', borderRadius: '10px',
              border: '1px solid #e0d8cc', background: '#fff', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{capsule.name}</div>
            {capsule.description && (
              <div style={{ fontSize: '12px', color: '#888' }}>{capsule.description}</div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
              {new Date(capsule.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>

      {capsules.length === 0 && !isLoading && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
          No capsules yet — create your first one.
        </p>
      )}

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '360px' }}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>New Capsule</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                Name *
              </label>
              <input
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                Description
              </label>
              <input
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', border: '1px solid #d8d0c8', borderRadius: '6px', background: '#fff' }}>
                Cancel
              </button>
              <button type="submit" disabled={!name || createMutation.isPending}
                style={{ padding: '8px 16px', background: '#0bcddb', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
