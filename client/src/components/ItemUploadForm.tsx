import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClosetItem, uploadPhoto, getCapsules, addItemToCapsule } from '../lib/api';
import type { ItemCategory, Climate } from '@capsule/shared';

interface Props {
  closetId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
};
const inputStyle: React.CSSProperties = {
  height: '40px', padding: '0 13px', borderRadius: '9px',
  border: '1px solid var(--line-default)', fontSize: '14px', background: '#FFFFFF',
};
const hintStyle: React.CSSProperties = { fontSize: '11.5px', color: 'var(--ink-tertiary)' };

export default function ItemUploadForm({ closetId, onSuccess, onCancel }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('tops');
  const [color, setColor] = useState('');
  const [climate, setClimate] = useState<Climate | ''>('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);

  const { data: capsules = [] } = useQuery({ queryKey: ['capsules'], queryFn: () => getCapsules() });

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploading(true);
        const { key } = await uploadPhoto(photoFile);
        photoUrl = key;
        setUploading(false);
      }
      const item = await createClosetItem(closetId, {
        name,
        category,
        color: color || undefined,
        climate: (climate as Climate) || undefined,
        size: size || undefined,
        brand: brand || undefined,
        pricePaid: pricePaid ? Number(pricePaid) : undefined,
        photoUrl,
      });
      if (selectedCapsuleId) await addItemToCapsule(selectedCapsuleId, item.id);
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closetItems', closetId] });
      qc.invalidateQueries({ queryKey: ['closetStats', closetId] });
      onSuccess();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ width: '880px', maxWidth: '90vw' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '20px 26px', borderBottom: '1px solid var(--line-soft)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--ink-primary)' }}>
          Add an item
        </h2>
        <span className="eyebrow">Step 2 of 2 · Details</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', padding: '26px' }}>
        <div>
          <label
            htmlFor="photo"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '340px', borderRadius: '11px', cursor: 'pointer',
              border: '1.5px dashed var(--line-dashed-strong)',
              background: photoPreview
                ? `center/cover no-repeat url(${photoPreview})`
                : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
            }}
          >
            {!photoPreview && (
              <>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-body)' }}>Drop a photo</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
                  or paste a product URL
                </span>
              </>
            )}
          </label>
          <input id="photo" type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: '10px' }} />
          <p style={{ ...hintStyle, marginTop: '10px', color: 'var(--ink-secondary)' }}>
            Photos are kept as shot — no background removal, so what you see is your actual garment.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignContent: 'start' }}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="name">Name *</label>
            <input id="name" aria-label="Name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="brand">Brand</label>
            <input id="brand" style={inputStyle} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="category">Category *</label>
            <select id="category" aria-label="Category" style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="shoes">Shoes</option>
              <option value="accessories">Accessories</option>
              <option value="outerwear">Outerwear</option>
            </select>
            <span style={hintStyle}>Layers · Tops · Bottoms · Shoes · Accessories</span>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="size">Size</label>
            <input id="size" style={inputStyle} value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="color">Colour</label>
            <input id="color" style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="climate">Climate band</label>
            <select id="climate" style={inputStyle} value={climate} onChange={(e) => setClimate(e.target.value as Climate | '')}>
              <option value="">—</option>
              <option value="tropical">Tropical</option>
              <option value="temperate">Temperate</option>
              <option value="cold">Cold</option>
              <option value="layering">Layering</option>
            </select>
            <span style={hintStyle}>Drives capsule match warnings</span>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="pricePaid">Price paid</label>
            <input id="pricePaid" type="number" min="0" step="0.01" style={inputStyle} value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} />
            <span style={hintStyle}>Used for cost per wear</span>
          </div>

          <div style={{ gridColumn: '1 / -1', background: 'var(--accent-green-tint)', borderRadius: '11px', padding: '14px 16px', marginTop: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent-green-ink)', marginBottom: '10px' }}>
              Add to a capsule now?
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {capsules.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip${selectedCapsuleId === c.id ? ' selected' : ''}`}
                  onClick={() => setSelectedCapsuleId((cur) => (cur === c.id ? null : c.id))}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                className={`chip${selectedCapsuleId === null ? ' selected' : ''}`}
                onClick={() => setSelectedCapsuleId(null)}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '18px 26px', borderTop: '1px solid var(--line-soft)' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>Back</button>
        <button type="submit" className="btn-primary" disabled={!name || uploading || mutation.isPending}>
          {uploading ? 'Uploading…' : mutation.isPending ? 'Saving…' : 'Save item'}
        </button>
      </div>
      {mutation.isError && (
        <p style={{ color: 'var(--accent-amber)', padding: '0 26px 16px', fontSize: '13px' }}>
          {(mutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
