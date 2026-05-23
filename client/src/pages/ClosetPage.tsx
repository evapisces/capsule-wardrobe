import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getClosets, getClosetItems } from '../lib/api';
import ClosetGrid from '../components/ClosetGrid';
import FilterBar, { Filters } from '../components/FilterBar';
import ItemUploadForm from '../components/ItemUploadForm';
import type { ClosetItem } from '@capsule/shared';

export default function ClosetPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: closets = [] } = useQuery({
    queryKey: ['closets'],
    queryFn: getClosets,
  });

  const closetId = closets[0]?.id ?? '';

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['closetItems', closetId, filters],
    queryFn: () => getClosetItems(closetId, filters),
    enabled: !!closetId,
  });

  const handleItemClick = (item: ClosetItem) => {
    navigate(`/items/${item.id}`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
          {closets[0]?.name ?? 'My Closet'}
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          + Add Item
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p style={{ color: '#aaa' }}>Loading…</p>
      ) : (
        <ClosetGrid items={items} onItemClick={handleItemClick} />
      )}

      {showAddForm && closetId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', overflowY: 'auto', maxHeight: '90vh' }}>
            <ItemUploadForm
              closetId={closetId}
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
