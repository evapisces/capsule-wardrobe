## Phase 8: Frontend Project Setup

### Task 10: Client scaffold

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/lib/queryClient.ts`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "capsule-wardrobe-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@capsule/shared': path.resolve(__dirname, '../shared/types'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@capsule/shared": ["../shared/types"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Capsule Wardrobe</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create client/src/test-setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Create client/src/lib/queryClient.ts**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});
```

- [ ] **Step 7: Create client/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 8: Create client/src/index.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #faf9f7;
  color: #2a2018;
}

a { color: inherit; text-decoration: none; }
button { cursor: pointer; }
```

- [ ] **Step 9: Install client deps**

```bash
cd client && npm install
```

- [ ] **Step 10: Commit**

```bash
git add client/
git commit -m "chore: client scaffold (Vite + React + TypeScript)"
```

---

### Task 11: API client

**Files:**
- Create: `client/src/lib/api.ts`

- [ ] **Step 1: Create client/src/lib/api.ts**

```typescript
import type {
  Closet,
  ClosetItem,
  Capsule,
  Trip,
  UploadResponse,
  ItemCategory,
  Climate,
} from '@capsule/shared';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Closets
export const getClosets = () => request<Closet[]>('/closets');
export const getCloset = (id: string) => request<Closet>(`/closets/${id}`);
export const createCloset = (data: { name: string; description?: string }) =>
  request<Closet>('/closets', { method: 'POST', body: JSON.stringify(data) });
export const updateCloset = (id: string, data: Partial<Closet>) =>
  request<Closet>(`/closets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCloset = (id: string) =>
  request<void>(`/closets/${id}`, { method: 'DELETE' });

// Closet Items
export const getClosetItems = (
  closetId: string,
  filters?: { category?: ItemCategory; color?: string; climate?: Climate }
) => {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.color) params.set('color', filters.color);
  if (filters?.climate) params.set('climate', filters.climate);
  const qs = params.toString();
  return request<ClosetItem[]>(`/closets/${closetId}/items${qs ? `?${qs}` : ''}`);
};
export const createClosetItem = (closetId: string, data: Partial<ClosetItem>) =>
  request<ClosetItem>(`/closets/${closetId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const getClosetItem = (id: string) => request<ClosetItem>(`/items/${id}`);
export const updateClosetItem = (id: string, data: Partial<ClosetItem>) =>
  request<ClosetItem>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClosetItem = (id: string) =>
  request<void>(`/items/${id}`, { method: 'DELETE' });

// Photo upload
export const uploadPhoto = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

// Capsules
export const getCapsules = () => request<Capsule[]>('/capsules');
export const createCapsule = (data: { name: string; description?: string }) =>
  request<Capsule>('/capsules', { method: 'POST', body: JSON.stringify(data) });
export const getCapsule = (id: string) => request<Capsule>(`/capsules/${id}`);
export const updateCapsule = (id: string, data: Partial<Capsule>) =>
  request<Capsule>(`/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCapsule = (id: string) =>
  request<void>(`/capsules/${id}`, { method: 'DELETE' });
export const addItemToCapsule = (capsuleId: string, closetItemId: string) =>
  request<void>(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'POST' });
export const removeItemFromCapsule = (capsuleId: string, closetItemId: string) =>
  request<void>(`/capsules/${capsuleId}/items/${closetItemId}`, { method: 'DELETE' });

// Trips
export const getTrips = () => request<Trip[]>('/trips');
export const createTrip = (data: {
  name: string; destination: string; startDate: string; endDate: string;
}) => request<Trip>('/trips', { method: 'POST', body: JSON.stringify(data) });
export const getTrip = (id: string) => request<Trip>(`/trips/${id}`);
export const updateTrip = (id: string, data: Partial<Trip>) =>
  request<Trip>(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTrip = (id: string) =>
  request<void>(`/trips/${id}`, { method: 'DELETE' });
export const linkCapsuleToTrip = (tripId: string, capsuleId: string) =>
  request<void>(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'POST' });
export const unlinkCapsuleFromTrip = (tripId: string, capsuleId: string) =>
  request<void>(`/trips/${tripId}/capsules/${capsuleId}`, { method: 'DELETE' });
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/api.ts
git commit -m "feat: typed API client"
```

---

### Task 12: Router + NavBar + page shells

**Files:**
- Create: `client/src/App.tsx`
- Create: `client/src/components/NavBar.tsx`
- Create all page shell files

- [ ] **Step 1: Create client/src/components/NavBar.tsx**

```tsx
import { NavLink } from 'react-router-dom';

const navStyle: React.CSSProperties = {
  display: 'flex', gap: '24px', padding: '12px 24px',
  background: '#fff', borderBottom: '1px solid #e8e0d8',
  position: 'sticky', top: 0, zIndex: 100,
};

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontWeight: isActive ? 700 : 400,
  color: isActive ? '#0bcddb' : '#2a2018',
  fontSize: '15px',
});

export default function NavBar() {
  return (
    <nav style={navStyle}>
      <span style={{ fontWeight: 700, marginRight: 'auto', color: '#2a2018' }}>
        🧳 Capsule
      </span>
      <NavLink to="/" style={linkStyle}>Closet</NavLink>
      <NavLink to="/capsules" style={linkStyle}>Capsules</NavLink>
      <NavLink to="/trips" style={linkStyle}>Trips</NavLink>
    </nav>
  );
}
```

- [ ] **Step 2: Create page shells**

`client/src/pages/ClosetPage.tsx`:
```tsx
export default function ClosetPage() {
  return <div style={{ padding: '24px' }}>Closet</div>;
}
```

`client/src/pages/ItemDetailPage.tsx`:
```tsx
export default function ItemDetailPage() {
  return <div style={{ padding: '24px' }}>Item Detail</div>;
}
```

`client/src/pages/CapsulesPage.tsx`:
```tsx
export default function CapsulesPage() {
  return <div style={{ padding: '24px' }}>Capsules</div>;
}
```

`client/src/pages/CapsuleBuilderPage.tsx`:
```tsx
export default function CapsuleBuilderPage() {
  return <div style={{ padding: '24px' }}>Capsule Builder</div>;
}
```

`client/src/pages/TripsPage.tsx`:
```tsx
export default function TripsPage() {
  return <div style={{ padding: '24px' }}>Trips</div>;
}
```

`client/src/pages/TripDetailPage.tsx`:
```tsx
export default function TripDetailPage() {
  return <div style={{ padding: '24px' }}>Trip Detail</div>;
}
```

- [ ] **Step 3: Create client/src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import ClosetPage from './pages/ClosetPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CapsulesPage from './pages/CapsulesPage';
import CapsuleBuilderPage from './pages/CapsuleBuilderPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';

export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<ClosetPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/capsules" element={<CapsulesPage />} />
          <Route path="/capsules/:id" element={<CapsuleBuilderPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
        </Routes>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Verify app renders**

```bash
# In one terminal:
cd server && npm run dev
# In another:
cd client && npm run dev
# Open http://localhost:5173 — nav should show Closet / Capsules / Trips
```

- [ ] **Step 5: Commit**

```bash
git add client/src/
git commit -m "feat: routing, NavBar, page shells"
```

---

## Phase 9: Closet UI

### Task 13: ItemCard + ClosetGrid

**Files:**
- Create: `client/src/components/ItemCard.tsx`
- Create: `client/src/components/ClosetGrid.tsx`
- Create: `client/src/__tests__/ItemCard.test.tsx`

- [ ] **Step 1: Write failing ItemCard test**

Create `client/src/__tests__/ItemCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '../components/ItemCard';
import type { ClosetItem } from '@capsule/shared';

const baseItem: ClosetItem = {
  id: 'item_1',
  closetId: 'closet_1',
  name: 'White Linen Shirt',
  photoUrl: null,
  category: 'tops',
  color: 'white',
  climate: null,
  size: 'S',
  brand: 'Everlane',
  notes: null,
  createdAt: new Date().toISOString(),
  capsuleCount: 0,
};

describe('ItemCard', () => {
  it('renders item name', () => {
    render(<ItemCard item={baseItem} />);
    expect(screen.getByText('White Linen Shirt')).toBeInTheDocument();
  });

  it('shows green border when isInActiveCapsule is true', () => {
    const { container } = render(<ItemCard item={baseItem} isInActiveCapsule />);
    const card = container.firstChild as HTMLElement;
    expect(card.style.border).toContain('2px solid');
  });

  it('shows orange badge when capsuleCount > 0 and not in active capsule', () => {
    render(<ItemCard item={{ ...baseItem, capsuleCount: 3 }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ItemCard item={baseItem} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(baseItem);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd client && npm test -- ItemCard
```

- [ ] **Step 3: Create client/src/components/ItemCard.tsx**

```tsx
import type { ClosetItem } from '@capsule/shared';

interface Props {
  item: ClosetItem;
  isInActiveCapsule?: boolean;
  onClick?: (item: ClosetItem) => void;
}

export default function ItemCard({ item, isInActiveCapsule, onClick }: Props) {
  const showBadge = (item.capsuleCount ?? 0) > (isInActiveCapsule ? 1 : 0);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f0ebe3',
    border: isInActiveCapsule ? '2px solid #2a9d8f' : '2px solid transparent',
    cursor: onClick ? 'pointer' : 'default',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: '#f4a261',
    color: '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  const photoStyle: React.CSSProperties = {
    flex: 1,
    background: '#e0d8cc',
    backgroundImage: item.photoUrl ? `url(${item.photoUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  };

  const labelStyle: React.CSSProperties = {
    padding: '4px 6px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <button
      style={cardStyle}
      onClick={() => onClick?.(item)}
      title={item.name}
      aria-label={item.name}
    >
      <div style={photoStyle}>{!item.photoUrl && '👕'}</div>
      <div style={labelStyle}>{item.name}</div>
      {showBadge && <span style={badgeStyle}>{item.capsuleCount}</span>}
    </button>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd client && npm test -- ItemCard
```

- [ ] **Step 5: Create client/src/components/ClosetGrid.tsx**

```tsx
import type { ClosetItem } from '@capsule/shared';
import ItemCard from './ItemCard';

interface Props {
  items: ClosetItem[];
  activeCapsuleItemIds?: Set<string>;
  onItemClick?: (item: ClosetItem) => void;
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '12px',
};

export default function ClosetGrid({ items, activeCapsuleItemIds, onItemClick }: Props) {
  if (items.length === 0) {
    return (
      <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>
        No items yet.
      </p>
    );
  }

  return (
    <div style={gridStyle}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isInActiveCapsule={activeCapsuleItemIds?.has(item.id)}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ItemCard.tsx client/src/components/ClosetGrid.tsx client/src/__tests__/ItemCard.test.tsx
git commit -m "feat: ItemCard with capsule badges + ClosetGrid"
```

---

### Task 14: FilterBar

**Files:**
- Create: `client/src/components/FilterBar.tsx`
- Create: `client/src/__tests__/FilterBar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `client/src/__tests__/FilterBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../components/FilterBar';

describe('FilterBar', () => {
  it('renders category, color, climate controls', () => {
    render(<FilterBar filters={{}} onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/color/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /climate/i })).toBeInTheDocument();
  });

  it('calls onChange with updated category', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{}} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'tops');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category: 'tops' }));
  });

  it('calls onChange with updated color text', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{}} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/color/i), 'blue');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ color: 'blue' }));
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd client && npm test -- FilterBar
```

- [ ] **Step 3: Create client/src/components/FilterBar.tsx**

```tsx
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd client && npm test -- FilterBar
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/FilterBar.tsx client/src/__tests__/FilterBar.test.tsx
git commit -m "feat: FilterBar (category, color, climate)"
```

---

### Task 15: ItemUploadForm

**Files:**
- Create: `client/src/components/ItemUploadForm.tsx`
- Create: `client/src/__tests__/ItemUploadForm.test.tsx`

- [ ] **Step 1: Write failing test**

Create `client/src/__tests__/ItemUploadForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import ItemUploadForm from '../components/ItemUploadForm';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('ItemUploadForm', () => {
  it('renders required fields', () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('disables save when name is empty', () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables save when name is filled', async () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/name/i), 'Blue Top');
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd client && npm test -- ItemUploadForm
```

- [ ] **Step 3: Create client/src/components/ItemUploadForm.tsx**

```tsx
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd client && npm test -- ItemUploadForm
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ItemUploadForm.tsx client/src/__tests__/ItemUploadForm.test.tsx
git commit -m "feat: ItemUploadForm with photo upload + all item fields"
```

---

### Task 16: ClosetPage (full implementation)

**Files:**
- Modify: `client/src/pages/ClosetPage.tsx`

- [ ] **Step 1: Replace ClosetPage shell with full implementation**

```tsx
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
```

- [ ] **Step 2: Verify in browser**

```bash
# With server running:
# 1. Navigate to http://localhost:5173
# 2. Click "+ Add Item" — modal should appear
# 3. Fill in name + category, click Save
# 4. Item appears in grid
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ClosetPage.tsx
git commit -m "feat: ClosetPage with item grid, filters, and add form"
```

---

### Task 17: ItemDetailPage

**Files:**
- Modify: `client/src/pages/ItemDetailPage.tsx`

- [ ] **Step 1: Replace shell with full implementation**

```tsx
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

      {/* Photo */}
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
```

- [ ] **Step 2: Verify in browser**

```bash
# 1. Click an item in the closet grid
# 2. Item detail page opens with photo, attributes, capsule count
# 3. Click Edit → fields become editable, save updates item
# 4. Click Delete → item removed and redirected to /
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ItemDetailPage.tsx
git commit -m "feat: ItemDetailPage with view/edit/delete"
```
