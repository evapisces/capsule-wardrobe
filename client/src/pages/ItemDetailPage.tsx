import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClosetItem, updateClosetItem, deleteClosetItem, uploadPhoto,
  getItemCapsules, getItemWearHistory, logItemWear, undoItemWear,
} from '../lib/api';
import StatStrip, { type Stat } from '../components/StatStrip';
import type { ItemCategory, Climate } from '@capsule/shared';

const inputStyle: React.CSSProperties = {
  height: '40px',
  padding: '0 13px',
  borderRadius: '9px',
  border: '1px solid var(--line-default)',
  background: '#FFFFFF',
  fontSize: '14px',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
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
function isSameUTCDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function formatLastWorn(item: { lastWornAt?: string | null }): string {
  if (!item.lastWornAt) return '—';
  const days = Math.floor((Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => getClosetItem(id!),
    enabled: !!id,
  });

  const { data: capsules = [] } = useQuery({
    queryKey: ['itemCapsules', id],
    queryFn: () => getItemCapsules(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['itemWearHistory', id],
    queryFn: () => getItemWearHistory(id!),
    enabled: !!id,
  });

  const wornToday = item?.lastWornAt
    ? isSameUTCDate(new Date(item.lastWornAt), new Date())
    : false;

  const wearMutation = useMutation({
    mutationFn: () => (wornToday ? undoItemWear(id!) : logItemWear(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item', id] });
      qc.invalidateQueries({ queryKey: ['itemWearHistory', id] });
      qc.invalidateQueries({ queryKey: ['closetItems'] });
      qc.invalidateQueries({ queryKey: ['closetStats'] });
    },
  });

  const [form, setForm] = useState({
    name: '', category: 'tops' as ItemCategory, color: '',
    climate: '' as Climate | '', size: '', brand: '', notes: '', pricePaid: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = () => {
    if (!item) return;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploading(true);
        const { key } = await uploadPhoto(photoFile);
        photoUrl = key;
        setUploading(false);
      }
      return updateClosetItem(id!, {
        ...form,
        color: form.color || undefined,
        climate: (form.climate as Climate) || undefined,
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
    mutationFn: () => deleteClosetItem(id!),
    onSuccess: () => navigate('/'),
  });

  if (isLoading || !item) return <p style={{ padding: '28px', color: 'var(--ink-tertiary)', fontSize: '13px' }}>Loading…</p>;

  const stats: Stat[] = [
    { key: 'Wears', value: `${item.wearCount ?? 0}`, sub: item.dormant ? 'Dormant' : 'Active' },
    { key: 'Cost per wear', value: item.costPerWear != null ? `$${item.costPerWear.toFixed(2)}` : '—', sub: item.pricePaid != null ? `paid $${item.pricePaid.toFixed(2)}` : 'no price logged' },
    { key: 'Last worn', value: formatLastWorn(item), sub: item.lastWornAt ? 'ago' : 'never worn' },
    { key: 'In capsules', value: `${item.capsuleCount ?? 0}`, sub: (item.capsuleCount ?? 0) === 1 ? 'capsule' : 'capsules' },
  ];

  return (
    <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>Closet</Link>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} style={{ marginTop: '20px', maxWidth: '460px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Photo</label>
            {photoPreview && (
              <img src={photoPreview} alt="Preview"
                style={{ width: '80px', height: '80px', objectFit: 'cover',
                  borderRadius: '8px', marginBottom: '8px', display: 'block' }} />
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          {[
            { label: 'Name', key: 'name', type: 'text' },
            { label: 'Color', key: 'color', type: 'text' },
            { label: 'Size', key: 'size', type: 'text' },
            { label: 'Brand', key: 'brand', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{label}</label>
              <input type={type} style={inputStyle}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ItemCategory }))}>
              {['tops','bottoms','dresses','shoes','accessories','outerwear'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Climate band</label>
            <select style={inputStyle} value={form.climate}
              onChange={(e) => setForm((f) => ({ ...f, climate: e.target.value as Climate | '' }))}>
              <option value="">—</option>
              {['tropical','temperate','cold','layering'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Price paid</label>
            <input type="number" min="0" step="0.01" style={inputStyle}
              value={form.pricePaid}
              onChange={(e) => setForm((f) => ({ ...f, pricePaid: e.target.value }))} />
            <span style={{ fontSize: '11.5px', color: 'var(--ink-tertiary)' }}>Used for cost per wear</span>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, height: '80px', padding: '10px 13px', resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {uploading ? 'Uploading…' : updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '36px', marginTop: '16px' }}>
          <div>
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name}
                style={{ width: '100%', height: '470px', objectFit: 'cover', borderRadius: '12px' }} />
            ) : (
              <div style={{
                width: '100%', height: '470px', borderRadius: '12px',
                background: 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                border: '1px solid var(--line-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px',
              }}>
                👕
              </div>
            )}
          </div>

          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '40px', fontWeight: 400, lineHeight: 1.05, color: 'var(--ink-primary)' }}>
              {item.name}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
              {[item.brand, item.category, item.size, item.color, item.notes].filter(Boolean).join(' · ')}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button className="btn-positive" onClick={() => wearMutation.mutate()} disabled={wearMutation.isPending}>
                {wornToday ? 'Undo — worn today' : 'Wore it today'}
              </button>
              <button className="btn-secondary" onClick={startEdit}>Edit</button>
            </div>

            <div style={{ marginTop: '24px', marginBottom: '26px' }}>
              <StatStrip stats={stats} />
            </div>

            <div className="section-label" style={{ marginBottom: '10px' }}>In these capsules</div>
            {capsules.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)', marginBottom: '26px' }}>Not in any capsules yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '26px' }}>
                {capsules.map((c) => (
                  <Link key={c.id} to={`/capsules/${c.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: '1px solid var(--line-soft)', borderRadius: '10px', padding: '11px 14px',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>{c.itemCount} items · {c.tripLabel}</div>
                    </div>
                    <span className={c.suitable ? 'pill-green' : 'pill-amber'}>
                      {c.suitable ? 'Matches climate' : 'Too light for climate'}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="section-label">Wear history</span>
              <span style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>{history.length} total</span>
            </div>
            {history.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--ink-tertiary)' }}>No wears logged yet.</p>
            ) : (
              <div style={{ border: '1px solid var(--line-soft)', borderRadius: '10px', overflow: 'hidden' }}>
                {history.map((h, i) => (
                  <div key={h.id} style={{
                    display: 'grid', gridTemplateColumns: '110px 1fr 150px 120px', gap: '12px',
                    padding: '11px 14px', fontSize: '12.5px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-hairline)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-tertiary)' }}>
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </span>
                    <span style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>{h.outfitName ?? item.name}</span>
                    <span style={{ color: 'var(--ink-tertiary)' }}>{h.context ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)' }}>
                      {h.corrected ? 'Corrected' : h.source === 'trip_auto' ? 'Trip auto-log' : 'Tapped wore it'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{ marginTop: '26px', background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '13px', padding: 0 }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete item'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
