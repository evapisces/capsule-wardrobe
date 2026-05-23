import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCapsule, getClosets, getClosetItems,
  addItemToCapsule, removeItemFromCapsule,
} from '../lib/api';
import CapsuleTray from '../components/CapsuleTray';
import BottomSheet from '../components/BottomSheet';
import ClosetGrid from '../components/ClosetGrid';
import FilterBar, { Filters } from '../components/FilterBar';
import type { ClosetItem } from '@capsule/shared';

export default function CapsuleBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFilters, setSheetFilters] = useState<Filters>({});

  const { data: capsule, isLoading: loadingCapsule } = useQuery({
    queryKey: ['capsule', id],
    queryFn: () => getCapsule(id!),
    enabled: !!id,
  });

  const { data: closets = [] } = useQuery({
    queryKey: ['closets'],
    queryFn: getClosets,
  });

  const closetId = closets[0]?.id ?? '';

  const { data: allItems = [] } = useQuery({
    queryKey: ['closetItems', closetId],
    queryFn: () => getClosetItems(closetId),
    enabled: !!closetId,
  });

  const { data: sheetItems = [] } = useQuery({
    queryKey: ['closetItems', closetId, sheetFilters],
    queryFn: () => getClosetItems(closetId, sheetFilters),
    enabled: !!closetId && sheetOpen,
  });

  const activeCapsuleItemIds = new Set(
    (capsule?.items ?? []).map((item) => item.id)
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['capsule', id] });

  const addMutation = useMutation({
    mutationFn: (closetItemId: string) => addItemToCapsule(id!, closetItemId),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (closetItemId: string) => removeItemFromCapsule(id!, closetItemId),
    onSuccess: invalidate,
  });

  const handleGridItemClick = (item: ClosetItem) => {
    if (activeCapsuleItemIds.has(item.id)) {
      removeMutation.mutate(item.id);
    } else {
      addMutation.mutate(item.id);
    }
  };

  const handleSheetItemClick = (item: ClosetItem) => {
    if (!activeCapsuleItemIds.has(item.id)) {
      addMutation.mutate(item.id);
    }
    setSheetOpen(false);
  };

  if (loadingCapsule || !capsule) {
    return <p style={{ padding: '24px', color: '#aaa' }}>Loading…</p>;
  }

  return (
    <>
      <CapsuleTray
        capsule={capsule}
        onRemoveItem={(itemId) => removeMutation.mutate(itemId)}
        onAddClick={() => setSheetOpen(true)}
      />

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
          Click any item to add it to this capsule. Click again to remove it.
        </p>
        <ClosetGrid
          items={allItems}
          activeCapsuleItemIds={activeCapsuleItemIds}
          onItemClick={handleGridItemClick}
        />
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add from Closet"
      >
        <FilterBar filters={sheetFilters} onChange={setSheetFilters} />
        <ClosetGrid
          items={sheetItems}
          activeCapsuleItemIds={activeCapsuleItemIds}
          onItemClick={handleSheetItemClick}
        />
      </BottomSheet>
    </>
  );
}
