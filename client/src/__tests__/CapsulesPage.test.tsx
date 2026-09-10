import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Capsule } from '@capsule/shared';
import CapsulesPage from '../pages/CapsulesPage';
import * as api from '../lib/api';

vi.mock('../lib/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseCapsule = (over: Partial<Capsule>): Capsule => ({
  id: 'c0',
  userId: 'user_1',
  name: 'Capsule',
  description: null,
  kind: 'standing',
  climate: null,
  createdAt: new Date().toISOString(),
  archivedAt: null,
  thumbnails: [],
  itemCount: 0,
  outfitCount: 0,
  tripLabel: 'Standing capsule',
  climateLabel: null,
  climateSuitable: true,
  efficiency: 0,
  efficiencyReason: '',
  ...over,
});

const active = [baseCapsule({ id: 'active_1', name: 'Active One' })];
const archived = [
  baseCapsule({ id: 'archived_1', name: 'Archived One', archivedAt: new Date().toISOString() }),
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CapsulesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCapsules).mockImplementation((archivedArg?: boolean) =>
    Promise.resolve(archivedArg ? archived : active)
  );
  vi.mocked(api.archiveCapsule).mockResolvedValue(active[0]);
  vi.mocked(api.unarchiveCapsule).mockResolvedValue(archived[0]);
});

describe('CapsulesPage — Archived chip', () => {
  it('switches from the active list to the archived list with a distinct fetch', async () => {
    renderPage();
    expect(await screen.findByText('Active One')).toBeInTheDocument();
    expect(api.getCapsules).toHaveBeenCalledWith();

    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));

    expect(await screen.findByText('Archived One')).toBeInTheDocument();
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
    expect(api.getCapsules).toHaveBeenCalledWith(true);
  });

  it('shows an archive-specific empty state when there are no archived capsules', async () => {
    vi.mocked(api.getCapsules).mockImplementation((archivedArg?: boolean) =>
      Promise.resolve(archivedArg ? [] : active)
    );
    renderPage();
    await screen.findByText('Active One');

    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));

    expect(await screen.findByText('No archived capsules')).toBeInTheDocument();
  });

  it('counts active capsules only in the header count line', async () => {
    renderPage();
    await screen.findByText('Active One');
    expect(screen.getByText('1 capsules · 0 tied to trips')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));
    await screen.findByText('Archived One');
    expect(screen.getByText('1 capsules · 0 tied to trips')).toBeInTheDocument();
  });
});

describe('CapsulesPage — archive action', () => {
  it('fires the archive mutation without navigating to the detail page', async () => {
    renderPage();
    const card = (await screen.findByText('Active One')).closest('[role="button"]') as HTMLElement;

    await userEvent.click(within(card).getByRole('button', { name: 'Capsule actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));

    await waitFor(() => expect(api.archiveCapsule).toHaveBeenCalledWith('active_1'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reads "Unarchive" in the Archived view and calls unarchiveCapsule', async () => {
    renderPage();
    await screen.findByText('Active One');
    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));

    const card = (await screen.findByText('Archived One')).closest('[role="button"]') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: 'Capsule actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unarchive' }));

    await waitFor(() => expect(api.unarchiveCapsule).toHaveBeenCalledWith('archived_1'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
