import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClosetItem, uploadPhoto } from '../lib/api';
import type { ItemCategory, Climate } from '@capsule/shared';

interface Props {
  closetId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px',
};
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#666' };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '6px',
  border: '1px solid #d8d0c8', fontSize: '14px', background: '#fff',
};

export default function ItemUploadForm({ closetId, onSuccess, onCancel }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('tops');
  const [color, setColor] = useState('');
  const [climate, setClimate] = useState<Climate | ''>('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploading(true);
        const { key } = await uploadPhoto(photoFile);
        photoUrl = key;
        setUploading(false);
      }
      return createClosetItem(closetId, {
        name,
        category,
        color: color || undefined,
        climate: (climate as Climate) || undefined,
        size: size || undefined,
        brand: brand || undefined,
        notes: notes || undefined,
        photoUrl,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closetItems', closetId] });
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
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      style={{ maxWidth: '420px', padding: '20px' }}
    >
      <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>Add Item</h2>

      {/* Photo */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="photo">Photo</label>
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Preview"
            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }}
          />
        )}
        <input id="photo" type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      {/* Name */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="name">Name *</label>
        <input
          id="name"
          aria-label="Name"
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Category */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="category">Category *</label>
        <select
          id="category"
          aria-label="Category"
          style={inputStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value as ItemCategory)}
        >
          <option value="tops">Tops</option>
          <option value="bottoms">Bottoms</option>
          <option value="dresses">Dresses</option>
          <option value="shoes">Shoes</option>
          <option value="accessories">Accessories</option>
          <option value="outerwear">Outerwear</option>
        </select>
      </div>

      {/* Color */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="color">Color</label>
        <input id="color" style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)} />
      </div>

      {/* Climate */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="climate">Climate</label>
        <select id="climate" style={inputStyle} value={climate} onChange={(e) => setClimate(e.target.value as Climate | '')}>
          <option value="">—</option>
          <option value="tropical">Tropical</option>
          <option value="temperate">Temperate</option>
          <option value="cold">Cold</option>
          <option value="layering">Layering</option>
        </select>
      </div>

      {/* Size */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="size">Size</label>
        <input id="size" style={inputStyle} value={size} onChange={(e) => setSize(e.target.value)} />
      </div>

      {/* Brand */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="brand">Brand</label>
        <input id="brand" style={inputStyle} value={brand} onChange={(e) => setBrand(e.target.value)} />
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="notes">Notes</label>
        <textarea id="notes" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d8d0c8', background: '#fff' }}>
          Cancel
        </button>
        <button type="submit"
          disabled={!name || uploading || mutation.isPending}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: '#0bcddb', color: '#fff', fontWeight: 600,
            opacity: (!name || uploading || mutation.isPending) ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {mutation.isError && (
        <p style={{ color: '#e63946', marginTop: '10px', fontSize: '13px' }}>
          {(mutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
