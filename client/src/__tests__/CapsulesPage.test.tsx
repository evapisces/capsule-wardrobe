import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Capsule } from '@capsule/shared';
import CapsulesPage from '../pages/CapsulesPage';
import { useTopBarSlotContent } from '../lib/topBarSlot';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';

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

// Stateful fake so archive/unarchive actually move a capsule between the two
// lists — lets tests assert the user-visible outcome, not just the mutation call.
let store: Capsule[];

function seedStore() {
  store = [
    baseCapsule({ id: 'active_1', name: 'Active One' }),
    baseCapsule({ id: 'archived_1', name: 'Archived One', archivedAt: new Date().toISOString() }),
  ];
}

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
  seedStore();
  vi.mocked(api.getCapsules).mockImplementation((archivedArg?: boolean) =>
    Promise.resolve(store.filter((c) => (archivedArg ? c.archivedAt : !c.archivedAt)))
  );
  vi.mocked(api.archiveCapsule).mockImplementation((id: string) => {
    store = store.map((c) => (c.id === id ? { ...c, archivedAt: new Date().toISOString() } : c));
    return Promise.resolve(store.find((c) => c.id === id)!);
  });
  vi.mocked(api.unarchiveCapsule).mockImplementation((id: string) => {
    store = store.map((c) => (c.id === id ? { ...c, archivedAt: null } : c));
    return Promise.resolve(store.find((c) => c.id === id)!);
  });
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
    store = [baseCapsule({ id: 'active_1', name: 'Active One' })];
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

  it('removes the card from the active grid and surfaces it under Archived after invalidation', async () => {
    renderPage();
    const card = (await screen.findByText('Active One')).closest('[role="button"]') as HTMLElement;

    await userEvent.click(within(card).getByRole('button', { name: 'Capsule actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));

    // Card leaves the active grid without a manual reload.
    await waitFor(() => expect(screen.queryByText('Active One')).not.toBeInTheDocument());

    // …and shows up in the Archived view.
    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('Active One')).toBeInTheDocument();
  });

  it('reads "Unarchive" in the Archived view and brings the capsule back under All', async () => {
    renderPage();
    await screen.findByText('Active One');
    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));

    const card = (await screen.findByText('Archived One')).closest('[role="button"]') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: 'Capsule actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unarchive' }));

    await waitFor(() => expect(api.unarchiveCapsule).toHaveBeenCalledWith('archived_1'));
    expect(mockNavigate).not.toHaveBeenCalled();

    // Leaves the Archived grid…
    await waitFor(() => expect(screen.queryByText('Archived One')).not.toBeInTheDocument());
    // …and reappears under All.
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(await screen.findByText('Archived One')).toBeInTheDocument();
  });
});

describe('CapsuleCard overflow menu — dismissal', () => {
  it('closes on outside click and on Escape without archiving', async () => {
    renderPage();
    const card = (await screen.findByText('Active One')).closest('[role="button"]') as HTMLElement;
    const trigger = within(card).getByRole('button', { name: 'Capsule actions' });

    await userEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();

    // Outside click dismisses.
    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument());

    // Escape dismisses.
    await userEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument());

    expect(api.archiveCapsule).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

function TopBarProbe() {
  return <>{useTopBarSlotContent()}</>;
}

function renderPageWithTopBar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CapsulesPage />
        <TopBarProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CapsulesPage — responsive layout (AC 1, 2)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    mm?.restore();
  });

  it('the card grid minimum track never exceeds the viewport', async () => {
    mm = installMatchMedia(320);
    renderPage();
    const card = (await screen.findByText('Active One')).closest('[role="button"]') as HTMLElement;
    const grid = card.parentElement as HTMLElement;

    expect(grid.style.gridTemplateColumns).toBe(
      'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'
    );
    // No fixed 360px track anywhere on the grid.
    expect(grid.style.gridTemplateColumns).not.toContain('360px');
  });

  it('the "New capsule" modal is viewport-bounded and its actions are touch-sized and stacked at mobile', async () => {
    mm = installMatchMedia(375);
    renderPageWithTopBar();
    await screen.findByText('Active One');

    await userEvent.click(screen.getByRole('button', { name: 'New capsule' }));

    const form = document.querySelector('form') as HTMLFormElement;
    // jsdom's CSSOM reserialises min() with stray tokens, so match on the parts.
    expect(form.style.width).toMatch(/^min\(/);
    expect(form.style.width).toContain('360px');
    expect(form.style.width).toContain('calc(100vw - 32px)');
    expect(form.style.width).not.toBe('360px');
    expect(form.style.maxHeight).toBe('90dvh');
    expect(form.style.overflowY).toBe('auto');

    const actionRow = screen.getByRole('button', { name: 'Cancel' }).parentElement as HTMLElement;
    expect(actionRow.style.flexDirection).toBe('column');

    for (const label of ['Cancel', 'Create']) {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.minHeight).toBe('44px');
      expect(btn.style.width).toBe('100%');
    }
  });

  it('the modal action row is a row (not stacked) at desktop', async () => {
    mm = installMatchMedia(1280);
    renderPageWithTopBar();
    await screen.findByText('Active One');

    await userEvent.click(screen.getByRole('button', { name: 'New capsule' }));
    const actionRow = screen.getByRole('button', { name: 'Cancel' }).parentElement as HTMLElement;
    expect(actionRow.style.flexDirection).toBe('row');
  });
});

describe('CapsuleCard — touch target (AC 3)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    mm?.restore();
  });

  it('the archive/unarchive control is at least 44x44', async () => {
    mm = installMatchMedia(375);
    renderPage();
    const card = (await screen.findByText('Active One')).closest('[role="button"]') as HTMLElement;
    const trigger = within(card).getByRole('button', { name: 'Capsule actions' });

    expect(trigger.style.minWidth).toBe('44px');
    expect(trigger.style.minHeight).toBe('44px');
  });

  it('thumbnails shrink to 64x76 at mobile and the name column can shrink below its content', async () => {
    store = [
      baseCapsule({
        id: 'active_1',
        name: 'A Very Long Capsule Name That Would Otherwise Push The Card Wide',
        itemCount: 1,
        thumbnails: [{ id: 't1', name: 'Tee', photoUrl: null }],
      }),
    ];
    mm = installMatchMedia(375);
    renderPage();
    const nameEl = await screen.findByText(/A Very Long Capsule Name/);
    const card = nameEl.closest('[role="button"]') as HTMLElement;

    const nameColumn = nameEl.parentElement as HTMLElement;
    expect(nameColumn.style.minWidth).toBe('0');

    const thumb = Array.from(card.querySelectorAll('div')).find((d) => d.style.width === '64px');
    expect(thumb).toBeTruthy();
    expect(thumb!.style.height).toBe('76px');
  });
});
