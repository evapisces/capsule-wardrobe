import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClosetItem, updateClosetItem, deleteClosetItem } from '../lib/api';
import type { ItemCategory, Climate } from '@capsule/shared';

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '6px',
  border: '1px solid #d8d0c8', fontSize: '14px', width: '100%',
};

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

  const [form, setForm] = useState({
    name: '', category: 'tops' as ItemCategory, color: '',
    climate: '' as Climate | '', size: '', brand: '', notes: '',
  });

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
    });
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: () => updateClosetItem(id!, {
      ...form,
      color: form.color || undefined,
      climate: (form.climate as Climate) || undefined,
      size: form.size || undefined,
      brand: form.brand || undefined,
      notes: form.notes || undefined,
    }),
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

  if (isLoading || !item) return <p style={{ padding: '24px', color: '#aaa' }}>Loading…</p>;

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)}
        style={{ marginBottom: '16px', background: 'none', border: 'none', color: '#0bcddb', fontWeight: 600 }}>
        ← Back
      </button>

      {item.photoUrl ? (
        <img src={item.photoUrl} alt={item.name}
          style={{ width: '100%', maxHeight: '320px', objectFit: 'contain',
            borderRadius: '10px', background: '#f0ebe3', marginBottom: '20px' }} />
      ) : (
        <div style={{ width: '100%', height: '200px', background: '#f0ebe3',
          borderRadius: '10px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '48px', marginBottom: '20px' }}>
          👕
        </div>
      )}

      {!editing ? (
        <>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{item.name}</h1>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
            {item.brand && `${item.brand} · `}{item.category}
            {item.size && ` · ${item.size}`}
            {item.color && ` · ${item.color}`}
            {item.climate && ` · ${item.climate}`}
          </p>
          {item.notes && <p style={{ color: '#555', marginBottom: '16px' }}>{item.notes}</p>}
          {(item.capsuleCount ?? 0) > 0 && (
            <p style={{ color: '#f4a261', fontSize: '13px', marginBottom: '16px' }}>
              In {item.capsuleCount} capsule{item.capsuleCount !== 1 ? 's' : ''}
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={startEdit}
              style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 600 }}>
              Edit
            </button>
            <button onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{ padding: '8px 18px', background: '#e63946', color: '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 600 }}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}>
          {[
            { label: 'Name', key: 'name', type: 'text' },
            { label: 'Color', key: 'color', type: 'text' },
            { label: 'Size', key: 'size', type: 'text' },
            { label: 'Brand', key: 'brand', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                {label}
              </label>
              <input type={type} style={inputStyle}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
              Category
            </label>
            <select style={inputStyle} value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ItemCategory }))}>
              {['tops','bottoms','dresses','shoes','accessories','outerwear'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
              Climate
            </label>
            <select style={inputStyle} value={form.climate}
              onChange={(e) => setForm((f) => ({ ...f, climate: e.target.value as Climate | '' }))}>
              <option value="">—</option>
              {['tropical','temperate','cold','layering'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit"
              disabled={updateMutation.isPending}
              style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 600 }}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              style={{ padding: '8px 18px', background: '#fff', border: '1px solid #d8d0c8', borderRadius: '6px' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
