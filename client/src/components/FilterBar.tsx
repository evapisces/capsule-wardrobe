import type { ItemCategory, Climate } from '@capsule/shared';

export interface Filters {
  category?: ItemCategory;
  color?: string;
  climate?: Climate;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const barStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '6px',
  border: '1px solid #d8d0c8', background: '#fff', fontSize: '13px',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle, minWidth: '120px',
};

export default function FilterBar({ filters, onChange }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div style={barStyle}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#888' }}>
        Category
        <select
          aria-label="Category"
          style={selectStyle}
          value={filters.category ?? ''}
          onChange={(e) => update({ category: (e.target.value as ItemCategory) || undefined })}
        >
          <option value="">All</option>
          <option value="tops">Tops</option>
          <option value="bottoms">Bottoms</option>
          <option value="dresses">Dresses</option>
          <option value="shoes">Shoes</option>
          <option value="accessories">Accessories</option>
          <option value="outerwear">Outerwear</option>
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#888' }}>
        Color
        <input
          style={inputStyle}
          placeholder="Color..."
          value={filters.color ?? ''}
          onChange={(e) => update({ color: e.target.value || undefined })}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#888' }}>
        Climate
        <select
          aria-label="Climate"
          style={selectStyle}
          value={filters.climate ?? ''}
          onChange={(e) => update({ climate: (e.target.value as Climate) || undefined })}
        >
          <option value="">All</option>
          <option value="tropical">Tropical</option>
          <option value="temperate">Temperate</option>
          <option value="cold">Cold</option>
          <option value="layering">Layering</option>
        </select>
      </label>
    </div>
  );
}
