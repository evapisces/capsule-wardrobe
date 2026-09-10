import { render, screen, cleanup, within } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ClosetItem, WearHistoryEntry } from '@capsule/shared';
import ItemDetailPage from '../pages/ItemDetailPage';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';

vi.mock('../lib/api');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ id: 'item_1' }) };
});

const item: ClosetItem = {
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
  pricePaid: null,
  createdAt: new Date().toISOString(),
  capsuleCount: 0,
  wearCount: 2,
};

const history: WearHistoryEntry[] = [
  {
    id: 'w1',
    date: '2024-05-04T00:00:00.000Z',
    outfitName: 'Spring layers',
    context: 'Office',
    source: 'trip_auto',
    corrected: false,
  },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ItemDetailPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getClosetItem).mockResolvedValue(item);
  vi.mocked(api.getItemCapsules).mockResolvedValue([]);
  vi.mocked(api.getItemWearHistory).mockResolvedValue(history);
});

describe('ItemDetailPage — responsive layout (issue #4)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('renders each wear-history entry as a stacked block (no 4-column grid) at mobile', async () => {
    mm = installMatchMedia(375);
    renderPage();

    const row = await screen.findByTestId('wear-history-row');
    expect(row.style.display).not.toBe('grid');
    expect(row.style.gridTemplateColumns).toBe('');

    // First line: date + outfit name.
    expect(within(row).getByText('May 4')).toBeInTheDocument();
    expect(within(row).getByText('Spring layers')).toBeInTheDocument();
    // Second line: context and source together.
    expect(within(row).getByText(/Office · Trip auto-log/)).toBeInTheDocument();
  });

  it('keeps the 4-column wear-history grid at desktop', async () => {
    mm = installMatchMedia(1280);
    renderPage();

    const row = await screen.findByTestId('wear-history-row');
    expect(row.style.display).toBe('grid');
    expect(row.style.gridTemplateColumns).toBe('110px 1fr 150px 120px');
  });

  it('collapses the photo/details grid below desktop and shrinks the hero photo at mobile', async () => {
    mm = installMatchMedia(375);
    renderPage();

    const heading = await screen.findByRole('heading', { name: 'White Linen Shirt' });
    // photo column + details column share one grid; its parent is that grid.
    const grid = heading.parentElement?.parentElement as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('1fr');

    const placeholder = screen.getByText('👕');
    expect(placeholder.style.height).toBe('min(60vh, 380px)');
  });

  it('gives the primary actions >= 44px height and stacks them full-width below 400px', async () => {
    mm = installMatchMedia(375);
    renderPage();

    const wore = await screen.findByRole('button', { name: /wore it today/i });
    const edit = screen.getByRole('button', { name: 'Edit' });
    const del = screen.getByRole('button', { name: 'Delete item' });

    expect(wore.style.minHeight).toBe('44px');
    expect(edit.style.minHeight).toBe('44px');
    expect(del.style.minHeight).toBe('44px');

    expect(wore.style.width).toBe('100%');
    expect(edit.style.width).toBe('100%');
    expect((wore.parentElement as HTMLElement).style.flexDirection).toBe('column');
  });

  it('keeps the primary actions side by side at 414px (mobile but >= 400px)', async () => {
    mm = installMatchMedia(414);
    renderPage();

    const wore = await screen.findByRole('button', { name: /wore it today/i });
    expect(wore.style.minHeight).toBe('44px');
    expect(wore.style.width).toBe('');
    expect((wore.parentElement as HTMLElement).style.flexDirection).toBe('row');
  });
});
