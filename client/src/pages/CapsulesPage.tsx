import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCapsules, createCapsule, archiveCapsule, unarchiveCapsule } from '../lib/api';
import { useTopBarActions } from '../lib/topBarSlot';
import CapsuleCard from '../components/CapsuleCard';
import type { Capsule, Climate } from '@capsule/shared';

type ChipFilter = 'all' | 'trip' | 'standing' | 'hot' | 'archived';

const CHIPS: { key: ChipFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trip', label: 'Trips' },
  { key: 'standing', label: 'Standing' },
  { key: 'hot', label: 'Hot climate' },
  { key: 'archived', label: 'Archived' },
];

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '18px',
};

const modalInputStyle: React.CSSProperties = {
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
  const [chip, setChip] = useState<ChipFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [climate, setClimate] = useState<Climate | ''>('');

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
    mutationFn: (id: string) => archiveCapsule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capsules'] }),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveCapsule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capsules'] }),
  });

  const createMutation = useMutation({
    mutationFn: () => createCapsule({ name, description: description || undefined, climate: climate || undefined }),
    onSuccess: (capsule: Capsule) => {
      qc.invalidateQueries({ queryKey: ['capsules'] });
      setShowCreate(false);
      setName('');
      setDescription('');
      setClimate('');
      navigate(`/capsules/${capsule.id}`);
    },
  });

  useTopBarActions(
    <button className="btn-primary" onClick={() => setShowCreate(true)}>New capsule</button>
  );

  const tripCount = capsules.filter((c) => c.kind === 'trip').length;

  const filtered = isArchivedView
    ? archivedCapsules
    : capsules.filter((c) => {
        if (chip === 'trip') return c.kind === 'trip';
        if (chip === 'standing') return c.kind !== 'trip';
        if (chip === 'hot') return c.climate === 'tropical';
        return true;
      });

  return (
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow">{capsules.length} capsules · {tripCount} tied to trips</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', fontWeight: 400, color: 'var(--ink-primary)', lineHeight: 1 }}>
            Capsules
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className={`chip${chip === c.key ? ' selected' : ''}`}
              onClick={() => setChip(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>}

      <div style={gridStyle}>
        {filtered.map((capsule) => (
          <CapsuleCard
            key={capsule.id}
            capsule={capsule}
            onClick={() => navigate(`/capsules/${capsule.id}`)}
            archived={isArchivedView}
            onArchiveToggle={() =>
              isArchivedView
                ? unarchiveMutation.mutate(capsule.id)
                : archiveMutation.mutate(capsule.id)
            }
          />
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p style={{ color: 'var(--ink-tertiary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
          {isArchivedView ? 'No archived capsules' : 'No capsules yet — create your first one.'}
        </p>
      )}

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(23,21,15,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: 'var(--bg-page)', borderRadius: '14px', padding: '26px', width: '360px', border: '1px solid var(--line-strong)' }}
          >
            <h2 style={{ marginBottom: '18px', fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400 }}>New capsule</h2>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }}>
                Name *
              </label>
              <input
                autoFocus
                style={modalInputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <input
                style={modalInputStyle}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)', display: 'block', marginBottom: '6px' }}>
                Climate band
              </label>
              <select style={modalInputStyle} value={climate} onChange={(e) => setClimate(e.target.value as Climate | '')}>
                <option value="">—</option>
                {['tropical', 'temperate', 'cold', 'layering'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
