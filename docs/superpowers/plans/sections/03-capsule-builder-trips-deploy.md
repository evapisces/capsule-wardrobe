## Phase 12: Capsule List Page

### Task 18: CapsulesPage

**Files:**
- Modify: `client/src/pages/CapsulesPage.tsx`

- [ ] **Step 1: Replace shell with full implementation**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCapsules, createCapsule } from '../lib/api';
import type { Capsule } from '@capsule/shared';

export default function CapsulesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: capsules = [], isLoading } = useQuery({
    queryKey: ['capsules'],
    queryFn: getCapsules,
  });

  const createMutation = useMutation({
    mutationFn: () => createCapsule({ name, description: description || undefined }),
    onSuccess: (capsule: Capsule) => {
      qc.invalidateQueries({ queryKey: ['capsules'] });
      setShowCreate(false);
      setName('');
      setDescription('');
      navigate(`/capsules/${capsule.id}`);
    },
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Capsules</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          + New Capsule
        </button>
      </div>

      {isLoading && <p style={{ color: '#aaa' }}>Loading…</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {capsules.map((capsule) => (
          <button
            key={capsule.id}
            onClick={() => navigate(`/capsules/${capsule.id}`)}
            style={{
              textAlign: 'left', padding: '16px', borderRadius: '10px',
              border: '1px solid #e0d8cc', background: '#fff', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{capsule.name}</div>
            {capsule.description && (
              <div style={{ fontSize: '12px', color: '#888' }}>{capsule.description}</div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
              {new Date(capsule.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>

      {capsules.length === 0 && !isLoading && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
          No capsules yet — create your first one.
        </p>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '360px' }}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>New Capsule</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                Name *
              </label>
              <input
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                Description
              </label>
              <input
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', border: '1px solid #d8d0c8', borderRadius: '6px', background: '#fff' }}>
                Cancel
              </button>
              <button type="submit" disabled={!name || createMutation.isPending}
                style={{ padding: '8px 16px', background: '#0bcddb', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```
1. Navigate to /capsules
2. Click "+ New Capsule", fill name, click Create
3. Redirects to /capsules/:id (builder page shell for now)
4. Back to /capsules — card appears in grid
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/CapsulesPage.tsx
git commit -m "feat: CapsulesPage with list + create"
```

---

## Phase 13: Capsule Builder

### Task 19: BottomSheet component

**Files:**
- Create: `client/src/components/BottomSheet.tsx`
- Create: `client/src/__tests__/BottomSheet.test.tsx`

- [ ] **Step 1: Write failing test**

Create `client/src/__tests__/BottomSheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomSheet from '../components/BottomSheet';

describe('BottomSheet', () => {
  it('renders children when open', () => {
    render(
      <BottomSheet isOpen title="Test Sheet" onClose={() => {}}>
        <p>Sheet content</p>
      </BottomSheet>
    );
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <BottomSheet isOpen={false} title="Test Sheet" onClose={() => {}}>
        <p>Hidden content</p>
      </BottomSheet>
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen title="Test Sheet" onClose={onClose}>
        <p>Content</p>
      </BottomSheet>
    );
    await userEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd client && npm test -- BottomSheet
```

- [ ] **Step 3: Create client/src/components/BottomSheet.tsx**

```tsx
import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: Props) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
  };

  const sheetStyle: React.CSSProperties = {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '640px',
    background: '#fff', borderRadius: '16px 16px 0 0',
    maxHeight: '75vh', display: 'flex', flexDirection: 'column',
    zIndex: 301,
    boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
  };

  const handleStyle: React.CSSProperties = {
    width: '36px', height: '4px', background: '#ddd',
    borderRadius: '2px', margin: '12px auto 0',
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 20px 12px',
    borderBottom: '1px solid #f0ebe3',
    fontSize: '16px', fontWeight: 700,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '16px 20px',
    overflowY: 'auto', flex: 1,
  };

  return (
    <>
      <div
        data-testid="sheet-backdrop"
        style={backdropStyle}
        onClick={onClose}
      />
      <div style={sheetStyle} role="dialog" aria-modal="true" aria-label={title}>
        <div style={handleStyle} />
        <div style={headerStyle}>{title}</div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd client && npm test -- BottomSheet
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/BottomSheet.tsx client/src/__tests__/BottomSheet.test.tsx
git commit -m "feat: BottomSheet slide-up drawer component"
```

---

### Task 20: CapsuleTray component

**Files:**
- Create: `client/src/components/CapsuleTray.tsx`
- Create: `client/src/__tests__/CapsuleTray.test.tsx`

- [ ] **Step 1: Write failing test**

Create `client/src/__tests__/CapsuleTray.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CapsuleTray from '../components/CapsuleTray';
import type { Capsule } from '@capsule/shared';

const mockCapsule: Capsule = {
  id: 'cap_1',
  userId: 'user_1',
  name: 'Japan Trip',
  description: null,
  createdAt: new Date().toISOString(),
  items: [
    {
      id: 'item_1', closetId: 'c1', name: 'White Shirt',
      photoUrl: null, category: 'tops', color: null,
      climate: null, size: null, brand: null, notes: null,
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('CapsuleTray', () => {
  it('renders capsule name', () => {
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={() => {}} />);
    expect(screen.getByText('Japan Trip')).toBeInTheDocument();
  });

  it('renders items', () => {
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={() => {}} />);
    expect(screen.getByTitle('White Shirt')).toBeInTheDocument();
  });

  it('calls onRemoveItem when × is clicked', async () => {
    const onRemove = vi.fn();
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={onRemove} onAddClick={() => {}} />);
    await userEvent.click(screen.getByLabelText('Remove White Shirt'));
    expect(onRemove).toHaveBeenCalledWith('item_1');
  });

  it('calls onAddClick when + is clicked', async () => {
    const onAdd = vi.fn();
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(onAdd).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd client && npm test -- CapsuleTray
```

- [ ] **Step 3: Create client/src/components/CapsuleTray.tsx**

```tsx
import type { Capsule, ClosetItem } from '@capsule/shared';

interface Props {
  capsule: Capsule;
  onRemoveItem: (itemId: string) => void;
  onAddClick: () => void;
}

export default function CapsuleTray({ capsule, onRemoveItem, onAddClick }: Props) {
  const items: ClosetItem[] = capsule.items ?? [];

  const trayStyle: React.CSSProperties = {
    position: 'sticky', top: '57px', zIndex: 50,
    background: '#fff', borderBottom: '1px solid #e0d8cc',
    padding: '14px 24px',
  };

  const scrollRowStyle: React.CSSProperties = {
    display: 'flex', gap: '8px', overflowX: 'auto',
    paddingBottom: '4px',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'relative', flexShrink: 0,
    width: '52px', height: '52px', borderRadius: '8px',
    background: '#e0d8cc', overflow: 'visible',
  };

  const imgStyle: React.CSSProperties = {
    width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px',
    background: '#e0d8cc',
  };

  const removeStyle: React.CSSProperties = {
    position: 'absolute', top: '-5px', right: '-5px',
    width: '16px', height: '16px',
    background: '#e63946', color: '#fff', border: 'none',
    borderRadius: '50%', fontSize: '9px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', lineHeight: 1, padding: 0,
  };

  const addBtnStyle: React.CSSProperties = {
    flexShrink: 0, width: '52px', height: '52px',
    borderRadius: '8px', border: '2px dashed #0bcddb',
    background: 'transparent', color: '#0bcddb',
    fontSize: '22px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  };

  return (
    <div style={trayStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>{capsule.name}</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={scrollRowStyle}>
        {items.map((item) => (
          <div key={item.id} style={thumbStyle}>
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} title={item.name} style={imgStyle} />
            ) : (
              <div title={item.name}
                style={{ ...imgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                👕
              </div>
            )}
            <button
              style={removeStyle}
              onClick={() => onRemoveItem(item.id)}
              aria-label={`Remove ${item.name}`}
              title={`Remove ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
        <button style={addBtnStyle} onClick={onAddClick} aria-label="Add item to capsule" title="Add item">
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd client && npm test -- CapsuleTray
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/CapsuleTray.tsx client/src/__tests__/CapsuleTray.test.tsx
git commit -m "feat: CapsuleTray with item thumbnails, remove, and add button"
```

---

### Task 21: CapsuleBuilderPage (full implementation)

**Files:**
- Modify: `client/src/pages/CapsuleBuilderPage.tsx`

- [ ] **Step 1: Replace shell with full implementation**

```tsx
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
```

- [ ] **Step 2: Verify in browser**

```
1. Navigate to /capsules, create a capsule, click it
2. CapsuleTray appears at top (empty), closet grid below
3. Click an item in the grid — it appears in the tray with green border
4. Click the + button in tray — BottomSheet slides up with search/filter
5. Click an item in the sheet — it adds to tray, sheet closes
6. Click × on a tray item — it's removed
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/CapsuleBuilderPage.tsx
git commit -m "feat: CapsuleBuilderPage — capsule-first layout with tray and bottom sheet"
```

---

## Phase 14: Trip Management

### Task 22: TripsPage

**Files:**
- Modify: `client/src/pages/TripsPage.tsx`

- [ ] **Step 1: Replace shell with full implementation**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTrips, createTrip } from '../lib/api';
import type { Trip } from '@capsule/shared';

export default function TripsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', destination: '', startDate: '', endDate: '' });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
  });

  const createMutation = useMutation({
    mutationFn: () => createTrip(form),
    onSuccess: (trip: Trip) => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      setShowCreate(false);
      setForm({ name: '', destination: '', startDate: '', endDate: '' });
      navigate(`/trips/${trip.id}`);
    },
  });

  const fieldStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px',
  };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#666' };
  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8d0c8',
    fontSize: '14px', width: '100%',
  };

  const isValid = form.name && form.destination && form.startDate && form.endDate;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Trips</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          + New Trip
        </button>
      </div>

      {isLoading && <p style={{ color: '#aaa' }}>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            style={{
              textAlign: 'left', padding: '16px 20px',
              border: '1px solid #e0d8cc', borderRadius: '10px',
              background: '#fff', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{trip.name}</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{trip.destination}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'right' }}>
              <div>{new Date(trip.startDate).toLocaleDateString()}</div>
              <div>→ {new Date(trip.endDate).toLocaleDateString()}</div>
            </div>
          </button>
        ))}
      </div>

      {trips.length === 0 && !isLoading && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
          No trips yet — plan your first one.
        </p>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '380px' }}
          >
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>New Trip</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>Name *</label>
              <input autoFocus style={inputStyle} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Destination *</label>
              <input style={inputStyle} value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" style={inputStyle} value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>End Date *</label>
                <input type="date" style={inputStyle} value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', border: '1px solid #d8d0c8', borderRadius: '6px', background: '#fff' }}>
                Cancel
              </button>
              <button type="submit" disabled={!isValid || createMutation.isPending}
                style={{ padding: '8px 16px', background: '#0bcddb', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 600,
                  opacity: (!isValid || createMutation.isPending) ? 0.6 : 1 }}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```
1. Navigate to /trips
2. Click "+ New Trip", fill all fields, click Create
3. Redirects to /trips/:id (detail page shell for now)
4. Back to /trips — trip card appears with destination and dates
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/TripsPage.tsx
git commit -m "feat: TripsPage with list + create"
```

---

### Task 23: TripDetailPage

**Files:**
- Modify: `client/src/pages/TripDetailPage.tsx`

- [ ] **Step 1: Replace shell with full implementation**

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrip, getCapsules, linkCapsuleToTrip,
  unlinkCapsuleFromTrip, deleteTrip,
} from '../lib/api';
import BottomSheet from '../components/BottomSheet';
import type { Capsule, ClosetItem } from '@capsule/shared';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedCapsuleIds, setExpandedCapsuleIds] = useState<Set<string>>(new Set());

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTrip(id!),
    enabled: !!id,
  });

  const { data: allCapsules = [] } = useQuery({
    queryKey: ['capsules'],
    queryFn: getCapsules,
    enabled: sheetOpen,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['trip', id] });

  const linkMutation = useMutation({
    mutationFn: (capsuleId: string) => linkCapsuleToTrip(id!, capsuleId),
    onSuccess: () => { invalidate(); setSheetOpen(false); },
  });

  const unlinkMutation = useMutation({
    mutationFn: (capsuleId: string) => unlinkCapsuleFromTrip(id!, capsuleId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id!),
    onSuccess: () => navigate('/trips'),
  });

  const toggleExpand = (capsuleId: string) => {
    setExpandedCapsuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(capsuleId)) next.delete(capsuleId);
      else next.add(capsuleId);
      return next;
    });
  };

  if (isLoading || !trip) return <p style={{ padding: '24px', color: '#aaa' }}>Loading…</p>;

  const linkedCapsuleIds = new Set((trip.capsules ?? []).map((c) => c.id));
  const unlinkCapsules = allCapsules.filter((c) => !linkedCapsuleIds.has(c.id));

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)}
        style={{ marginBottom: '16px', background: 'none', border: 'none', color: '#0bcddb', fontWeight: 600 }}>
        ← Back
      </button>

      {/* Trip header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{trip.name}</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          {trip.destination} · {new Date(trip.startDate).toLocaleDateString()} → {new Date(trip.endDate).toLocaleDateString()}
        </p>
      </div>

      {/* Capsules section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Capsules</h2>
        <button
          onClick={() => setSheetOpen(true)}
          style={{ padding: '6px 14px', background: '#0bcddb', color: '#fff',
            border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}
        >
          + Link Capsule
        </button>
      </div>

      {(trip.capsules ?? []).length === 0 && (
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
          No capsules linked yet.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {(trip.capsules ?? []).map((capsule: Capsule) => {
          const isExpanded = expandedCapsuleIds.has(capsule.id);
          const items: ClosetItem[] = capsule.items ?? [];
          return (
            <div key={capsule.id}
              style={{ border: '1px solid #e0d8cc', borderRadius: '10px', background: '#fff', overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => toggleExpand(capsule.id)}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{capsule.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); unlinkMutation.mutate(capsule.id); }}
                    style={{ padding: '4px 10px', fontSize: '12px', color: '#e63946',
                      border: '1px solid #e63946', borderRadius: '4px', background: '#fff' }}
                  >
                    Unlink
                  </button>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid #f0ebe3', padding: '12px 16px' }}>
                  {items.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '13px' }}>No items in this capsule.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                      {items.map((item: ClosetItem) => (
                        <div key={item.id} style={{ textAlign: 'center' }}>
                          <div style={{
                            width: '100%', aspectRatio: '1', borderRadius: '6px',
                            background: '#f0ebe3', backgroundImage: item.photoUrl ? `url(${item.photoUrl})` : undefined,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                          }}>
                            {!item.photoUrl && '👕'}
                          </div>
                          <p style={{ fontSize: '10px', marginTop: '3px', color: '#555',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Danger zone */}
      <div style={{ borderTop: '1px solid #f0ebe3', paddingTop: '20px' }}>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          style={{ padding: '8px 18px', background: '#e63946', color: '#fff',
            border: 'none', borderRadius: '6px', fontWeight: 600 }}
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete Trip'}
        </button>
      </div>

      {/* Link capsule sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Link a Capsule">
        {unlinkCapsules.length === 0 ? (
          <p style={{ color: '#aaa', padding: '20px 0', textAlign: 'center' }}>
            All capsules are already linked.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unlinkCapsules.map((capsule: Capsule) => (
              <button
                key={capsule.id}
                onClick={() => linkMutation.mutate(capsule.id)}
                disabled={linkMutation.isPending}
                style={{
                  textAlign: 'left', padding: '12px 14px',
                  border: '1px solid #e0d8cc', borderRadius: '8px',
                  background: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{capsule.name}</div>
                {capsule.description && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{capsule.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```
1. Navigate to /trips, click a trip
2. Trip header shows name, destination, dates
3. Click "+ Link Capsule" — bottom sheet shows unlinked capsules
4. Click a capsule to link it — appears as a card on the trip
5. Click the capsule card to expand — items show as a grid
6. Click "Unlink" to remove the capsule from the trip
7. Click "Delete Trip" — trip deleted, redirected to /trips
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/TripDetailPage.tsx
git commit -m "feat: TripDetailPage with capsule linking, expansion, and delete"
```

---

## Phase 15: Deployment

### Task 24: Deployment config + README

**Files:**
- Create: `.do/app.yaml`
- Create: `client/public/_redirects`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create .do/app.yaml**

```yaml
name: capsule-wardrobe-api
region: nyc

services:
  - name: api
    source_dir: server
    github:
      repo: your-github-username/capsule-wardrobe
      branch: main
      deploy_on_push: true
    build_command: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
    run_command: npm start
    http_port: 3001
    health_check:
      http_path: /health
    envs:
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCOUNT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCESS_KEY_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_SECRET_ACCESS_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_BUCKET_NAME
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: CLIENT_URL
        scope: RUN_AND_BUILD_TIME
        value: https://your-app.pages.dev
      - key: NODE_ENV
        scope: RUN_AND_BUILD_TIME
        value: production
```

- [ ] **Step 2: Create client/public/_redirects**

```
/* /index.html 200
```

This tells Cloudflare Pages to serve `index.html` for all routes, enabling React Router's client-side navigation.

- [ ] **Step 3: Create root .env.example**

```
# Server
DATABASE_URL=postgresql://user:password@localhost:5432/capsule_wardrobe
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/capsule_wardrobe_test
PORT=3001
CLIENT_URL=http://localhost:5173

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=capsule-wardrobe-photos
```

- [ ] **Step 4: Create README.md**

```markdown
# Capsule Wardrobe

A personal app for managing your clothing closet and building travel capsule wardrobes.

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Backend:** Node.js + Express → DigitalOcean App Platform
- **Database:** PostgreSQL + Prisma
- **Photos:** Cloudflare R2

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL running locally

### Setup

```bash
# Install all dependencies
npm install          # root
cd server && npm install
cd ../client && npm install

# Configure environment
cp .env.example server/.env
# Edit server/.env with your local database URL and R2 credentials

# Run database migrations + seed
cd server
npx prisma migrate dev
npm run db:seed

# Start both servers
cd ..
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

### Running tests

```bash
# Backend tests (requires DATABASE_URL_TEST in server/.env)
cd server && npm test

# Frontend tests
cd client && npm test
```

## Deployment

### Backend → DigitalOcean App Platform
1. Push `.do/app.yaml` to your repo
2. Create app in DO dashboard, point to this repo
3. Add secrets: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
4. Set `CLIENT_URL` to your Cloudflare Pages URL

### Frontend → Cloudflare Pages
1. Connect your GitHub repo in Cloudflare Pages
2. Set build command: `cd client && npm install && npm run build`
3. Set output directory: `client/dist`
4. Add env var: `VITE_API_URL` (optional if proxying)
```

- [ ] **Step 5: Run all tests one final time**

```bash
cd server && npm test
cd ../client && npm test
```

Expected: all suites pass.

- [ ] **Step 6: Final commit**

```bash
git add .do/ client/public/_redirects .env.example README.md
git commit -m "chore: deployment config, _redirects, README"
```

---

## Verification Checklist

After completing all tasks, verify end-to-end:

- [ ] `GET /health` returns `{"ok":true}`
- [ ] Add a closet item with a photo — photo appears in grid
- [ ] Filter closet by category — grid updates correctly
- [ ] Click item → item detail page → edit name → saved
- [ ] Create a capsule → capsule builder opens
- [ ] Add items via tray "+" (bottom sheet) and by clicking in grid — both work
- [ ] Remove item from tray via × — removed
- [ ] Create a trip → link a capsule → expand capsule → items visible
- [ ] Unlink capsule from trip — removed
- [ ] `npm test` in both `server/` and `client/` — all pass
