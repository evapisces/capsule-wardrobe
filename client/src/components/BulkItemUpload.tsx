import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClosetItem, uploadPhoto, suggestItemMetadata } from '../lib/api';
import BulkItemCard, { AiField, BulkCardFields, BulkCardState } from './BulkItemCard';
import type { ItemSuggestion } from '@capsule/shared';

interface Props {
  closetId: string;
  onDone: () => void;
  onBack: () => void;
}

const AI_FIELDS: AiField[] = ['name', 'category', 'color', 'brand', 'climate'];

let uidCounter = 0;
function nextId(): string {
  uidCounter += 1;
  return `bulk_${Date.now()}_${uidCounter}`;
}

const emptyFields: BulkCardFields = {
  name: '',
  category: 'tops',
  color: '',
  brand: '',
  climate: '',
  size: '',
  pricePaid: '',
};

function applySuggestion(suggestion: ItemSuggestion | null | undefined): {
  fields: BulkCardFields;
  aiFields: Partial<Record<AiField, true>>;
} {
  if (!suggestion) return { fields: { ...emptyFields }, aiFields: {} };
  const aiFields: Partial<Record<AiField, true>> = {};
  const fields: BulkCardFields = { ...emptyFields };
  if (suggestion.name) { fields.name = suggestion.name; aiFields.name = true; }
  if (suggestion.category) { fields.category = suggestion.category; aiFields.category = true; }
  if (suggestion.color) { fields.color = suggestion.color; aiFields.color = true; }
  if (suggestion.brand) { fields.brand = suggestion.brand; aiFields.brand = true; }
  if (suggestion.climate) { fields.climate = suggestion.climate; aiFields.climate = true; }
  return { fields, aiFields };
}

export default function BulkItemUpload({ closetId, onDone, onBack }: Props) {
  const qc = useQueryClient();
  const [cards, setCards] = useState<BulkCardState[]>([]);

  const patchCard = (id: string, patch: Partial<BulkCardState>) => {
    setCards((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const processCard = (id: string, file: File) => {
    uploadPhoto(file)
      .then(({ key }) => patchCard(id, { photoStatus: 'uploaded', photoKey: key }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Upload failed';
        patchCard(id, { photoStatus: 'error', photoError: message });
      });

    suggestItemMetadata(file)
      .then((res) => {
        if (!res.suggestionsAvailable) {
          patchCard(id, { suggestStatus: 'failed', suggestionNote: 'AI suggestions are turned off' });
          return;
        }
        if (!res.suggestion) {
          patchCard(id, { suggestStatus: 'failed', suggestionNote: res.reason });
          return;
        }
        const { fields, aiFields } = applySuggestion(res.suggestion);
        patchCard(id, { suggestStatus: 'ready', fields, aiFields });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Suggestion failed';
        patchCard(id, { suggestStatus: 'failed', suggestionNote: message });
      });
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    const newCards: BulkCardState[] = files.map((file) => ({
      id: nextId(),
      file,
      previewUrl: URL.createObjectURL(file),
      photoStatus: 'uploading',
      photoKey: null,
      suggestStatus: 'loading',
      aiFields: {},
      fields: { ...emptyFields },
      saveStatus: 'idle',
    }));
    setCards((cur) => [...cur, ...newCards]);
    newCards.forEach((c) => processCard(c.id, c.file));
    e.target.value = '';
  };

  const handleFieldChange = <K extends keyof BulkCardFields>(id: string, field: K, value: BulkCardFields[K]) => {
    setCards((cur) =>
      cur.map((c) => {
        if (c.id !== id) return c;
        const aiFields = { ...c.aiFields };
        if (AI_FIELDS.includes(field as AiField)) delete aiFields[field as AiField];
        return { ...c, fields: { ...c.fields, [field]: value }, aiFields };
      })
    );
  };

  const handleDiscard = (id: string) => {
    setCards((cur) => cur.filter((c) => c.id !== id));
  };

  const saveCard = async (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    patchCard(id, { saveStatus: 'saving', saveError: undefined });
    try {
      await createClosetItem(closetId, {
        name: card.fields.name,
        category: card.fields.category,
        color: card.fields.color || undefined,
        climate: (card.fields.climate as ItemSuggestion['climate']) || undefined,
        size: card.fields.size || undefined,
        brand: card.fields.brand || undefined,
        pricePaid: card.fields.pricePaid ? Number(card.fields.pricePaid) : undefined,
        photoUrl: card.photoKey ?? undefined,
      });
      patchCard(id, { saveStatus: 'saved' });
      qc.invalidateQueries({ queryKey: ['closetItems', closetId] });
      qc.invalidateQueries({ queryKey: ['closetStats', closetId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save — try again';
      patchCard(id, { saveStatus: 'error', saveError: message });
    }
  };

  const handleSaveAll = () => {
    cards
      .filter((c) => c.saveStatus === 'idle' || c.saveStatus === 'error')
      .forEach((c) => saveCard(c.id));
  };

  const savableCount = cards.filter((c) => c.saveStatus === 'idle' || c.saveStatus === 'error').length;

  return (
    <div style={{ width: '100%', maxWidth: '880px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '20px 26px', borderBottom: '1px solid var(--line-soft)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--ink-primary)' }}>
          Add multiple photos
        </h2>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Use single-item form
        </button>
      </div>

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="bulk-photos" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-body)' }}>
            Select photos
          </label>
          <input
            id="bulk-photos"
            data-testid="bulk-file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            style={{ display: 'block', marginTop: '8px' }}
          />
          <p style={{ fontSize: '11.5px', color: 'var(--ink-tertiary)', marginTop: '6px' }}>
            Each photo is analysed for a suggested name, category, colour, brand, and climate —
            confirm or correct each card, then save it. Nothing is created until you save.
          </p>
        </div>

        {cards.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                disabled={savableCount === 0}
                onClick={handleSaveAll}
              >
                Save all ({savableCount})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cards.map((card, index) => (
                <BulkItemCard
                  key={card.id}
                  card={card}
                  index={index}
                  onFieldChange={(field, value) => handleFieldChange(card.id, field, value)}
                  onSave={() => saveCard(card.id)}
                  onDiscard={() => handleDiscard(card.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{
        display: 'flex', gap: '10px', justifyContent: 'flex-end',
        padding: '18px 26px', borderTop: '1px solid var(--line-soft)',
      }}>
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
