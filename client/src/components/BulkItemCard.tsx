import type { ItemCategory, Climate } from '@capsule/shared';

export interface BulkCardFields {
  name: string;
  category: ItemCategory;
  color: string;
  brand: string;
  climate: Climate | '';
  size: string;
  pricePaid: string;
}

export type AiField = 'name' | 'category' | 'color' | 'brand' | 'climate';

export interface BulkCardState {
  id: string;
  file: File;
  previewUrl: string;
  photoStatus: 'uploading' | 'uploaded' | 'error';
  photoKey: string | null;
  photoError?: string;
  suggestStatus: 'loading' | 'ready' | 'failed';
  suggestionNote?: string;
  aiFields: Partial<Record<AiField, true>>;
  fields: BulkCardFields;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string;
}

interface Props {
  card: BulkCardState;
  index: number;
  onFieldChange: <K extends keyof BulkCardFields>(field: K, value: BulkCardFields[K]) => void;
  onSave: () => void;
  onDiscard: () => void;
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
  display: 'flex', alignItems: 'center', gap: '6px',
};
const inputStyle: React.CSSProperties = {
  height: '36px', padding: '0 10px', borderRadius: '8px',
  border: '1px solid var(--line-default)', fontSize: '13px', background: '#FFFFFF',
};
const aiBadgeStyle: React.CSSProperties = {
  fontSize: '9px', fontWeight: 700, color: 'var(--accent-green-ink, #2f6b4f)',
  background: 'var(--accent-green-tint, #E4F1E9)', borderRadius: '999px', padding: '1px 6px',
};

export default function BulkItemCard({ card, index, onFieldChange, onSave, onDiscard }: Props) {
  const { fields } = card;
  const canSave = card.photoStatus !== 'uploading' && card.saveStatus !== 'saving' && card.saveStatus !== 'saved' && !!fields.name;

  return (
    <div
      data-testid={`bulk-card-${index}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: '14px',
        border: '1px solid var(--line-soft)',
        borderRadius: '11px',
        padding: '14px',
        opacity: card.saveStatus === 'saved' ? 0.7 : 1,
      }}
    >
      <div>
        <div
          style={{
            width: '110px', height: '110px', borderRadius: '9px',
            background: `center/cover no-repeat url(${card.previewUrl})`,
            border: '1px solid var(--line-soft)',
          }}
        />
        <p style={{ fontSize: '11px', marginTop: '6px', color: 'var(--ink-tertiary)' }}>
          {card.photoStatus === 'uploading' && 'Uploading…'}
          {card.photoStatus === 'uploaded' && 'Uploaded'}
          {card.photoStatus === 'error' && (card.photoError ?? 'Upload failed')}
        </p>
      </div>

      <div>
        {card.suggestStatus === 'loading' && (
          <p style={{ fontSize: '12px', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>
            Analysing photo…
          </p>
        )}
        {card.suggestStatus === 'failed' && (
          <p role="note" style={{ fontSize: '12px', color: 'var(--accent-amber)', marginBottom: '8px' }}>
            Couldn&apos;t suggest — fill in manually{card.suggestionNote ? ` (${card.suggestionNote})` : ''}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-name-${index}`}>
              Name *{card.aiFields.name && <span style={aiBadgeStyle}>AI</span>}
            </label>
            <input
              id={`bulk-name-${index}`}
              aria-label={`Name ${index}`}
              style={inputStyle}
              value={fields.name}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('name', e.target.value)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-brand-${index}`}>
              Brand{card.aiFields.brand && <span style={aiBadgeStyle}>AI</span>}
            </label>
            <input
              id={`bulk-brand-${index}`}
              aria-label={`Brand ${index}`}
              style={inputStyle}
              value={fields.brand}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('brand', e.target.value)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-category-${index}`}>
              Category *{card.aiFields.category && <span style={aiBadgeStyle}>AI</span>}
            </label>
            <select
              id={`bulk-category-${index}`}
              aria-label={`Category ${index}`}
              style={inputStyle}
              value={fields.category}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('category', e.target.value as ItemCategory)}
            >
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="shoes">Shoes</option>
              <option value="accessories">Accessories</option>
              <option value="outerwear">Outerwear</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-color-${index}`}>
              Colour{card.aiFields.color && <span style={aiBadgeStyle}>AI</span>}
            </label>
            <input
              id={`bulk-color-${index}`}
              aria-label={`Colour ${index}`}
              style={inputStyle}
              value={fields.color}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('color', e.target.value)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-climate-${index}`}>
              Climate band{card.aiFields.climate && <span style={aiBadgeStyle}>AI</span>}
            </label>
            <select
              id={`bulk-climate-${index}`}
              aria-label={`Climate band ${index}`}
              style={inputStyle}
              value={fields.climate}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('climate', e.target.value as Climate | '')}
            >
              <option value="">—</option>
              <option value="tropical">Tropical</option>
              <option value="temperate">Temperate</option>
              <option value="cold">Cold</option>
              <option value="layering">Layering</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor={`bulk-size-${index}`}>Size</label>
            <input
              id={`bulk-size-${index}`}
              aria-label={`Size ${index}`}
              style={inputStyle}
              value={fields.size}
              disabled={card.saveStatus === 'saved'}
              onChange={(e) => onFieldChange('size', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
          {card.saveStatus === 'saved' ? (
            <span style={{ fontSize: '12px', color: 'var(--accent-green-ink, #2f6b4f)', fontWeight: 600 }}>
              Saved
            </span>
          ) : (
            <>
              <button type="button" className="btn-primary" disabled={!canSave} onClick={onSave}>
                {card.saveStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={onDiscard}>
                Discard
              </button>
            </>
          )}
          {card.saveStatus === 'error' && (
            <span style={{ fontSize: '12px', color: 'var(--accent-amber)' }}>
              {card.saveError ?? 'Could not save — try again'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
