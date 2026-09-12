import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import BottomSheet from './BottomSheet';
import { getOutfitSuggestion, createCapsule, addItemToCapsule, createOutfit } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  closetId: string;
  range: '6m' | 'all';
}

const thumbStyle = (photoUrl: string | null): React.CSSProperties => ({
  width: '44px',
  height: '52px',
  borderRadius: '6px',
  flexShrink: 0,
  border: '1px solid var(--line-strong)',
  background: photoUrl
    ? `center/cover no-repeat url(${photoUrl})`
    : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
});

/**
 * Sitting-idle "Suggest an outfit" surface (issue #33). Fetches a rule-based
 * suggestion for one dormant item, shows the seed + 2-3 complementary picks
 * with short reasons, and lets the user turn it into a real capsule + outfit.
 */
export default function OutfitSuggestionPanel({ isOpen, onClose, itemId, closetId, range }: Props) {
  const qc = useQueryClient();

  const {
    data: suggestion,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['outfitSuggestion', itemId],
    queryFn: () => getOutfitSuggestion(itemId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!suggestion) throw new Error('No suggestion loaded');
      const suggestedIds = suggestion.suggestions.map((s) => s.itemId);
      const capsule = await createCapsule({ name: `${suggestion.seed.name} outfit` });
      await addItemToCapsule(capsule.id, suggestion.seed.itemId);
      for (const suggestedId of suggestedIds) {
        await addItemToCapsule(capsule.id, suggestedId);
      }
      await createOutfit(capsule.id, `${suggestion.seed.name} outfit`, [suggestion.seed.itemId, ...suggestedIds]);
      return capsule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights', closetId, range] });
    },
  });

  const handleClose = () => {
    createMutation.reset();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Suggest an outfit">
      {isLoading && (
        <p style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>Finding pieces that work with this item…</p>
      )}

      {isError && (
        <div>
          <p style={{ fontSize: '13px', color: '#B3261E', marginBottom: '10px' }}>
            Couldn&apos;t load a suggestion — try again.
          </p>
          <button className="btn-secondary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && suggestion && suggestion.suggestions.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>
          Not enough compatible items in your closet yet to build an outfit around this piece.
        </p>
      )}

      {!isLoading && !isError && suggestion && suggestion.suggestions.length > 0 && (
        <div>
          {createMutation.isSuccess ? (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--ink-primary)', marginBottom: '10px' }}>
                Created &ldquo;{`${suggestion.seed.name} outfit`}&rdquo; as a new capsule.
              </p>
              <Link to={`/capsules/${createMutation.data!.id}`} className="btn-primary" style={{ display: 'inline-block' }}>
                Open capsule
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={thumbStyle(suggestion.seed.photoUrl)} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{suggestion.seed.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>Dormant item</div>
                  </div>
                </div>
                {suggestion.suggestions.map((s) => (
                  <div key={s.itemId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={thumbStyle(s.photoUrl)} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>{s.reason}</div>
                    </div>
                  </div>
                ))}
              </div>

              {createMutation.isError && (
                <p style={{ fontSize: '12.5px', color: '#B3261E', marginBottom: '8px' }}>
                  Couldn&apos;t create the capsule — try again.
                </p>
              )}

              <button
                className="btn-primary"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Creating…' : 'Create capsule from this outfit'}
              </button>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
