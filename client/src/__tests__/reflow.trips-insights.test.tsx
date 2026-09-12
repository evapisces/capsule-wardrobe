import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Trip, InsightsSummary, ClosetStats, Closet } from '@capsule/shared';
import TripsPage, { modalFormStyle } from '../pages/TripsPage';
import TripDetailPage from '../pages/TripDetailPage';
import InsightsPage, { panelGridColumns } from '../pages/InsightsPage';
import { useTopBarSlotContent } from '../lib/topBarSlot';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';

vi.mock('../lib/api');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

/** Mirrors how NavBar renders whatever the page registers for the top bar. */
function Slot() {
  return <>{useTopBarSlotContent()}</>;
}

function renderWithProviders(ui: ReactNode, initialEntries: string[] = ['/']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Slot />
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const trips: Trip[] = [
  { id: 't1', userId: 'u1', name: 'Lisbon', destination: 'Lisbon, PT', startDate: '2026-05-01', endDate: '2026-05-08', createdAt: '2026-01-01' },
];

const insights: InsightsSummary = {
  loggedWears: 12,
  unloggedDays: 3,
  mostWorn: [{ itemId: 'm1', name: 'Grey Tee', photoUrl: null, wearCount: 6, costPerWear: 2 }],
  sittingIdle: [{ itemId: 's1', name: 'Wool Coat', photoUrl: null, reason: 'Not worn in 120 days', actionLabel: 'Plan a wear', action: { kind: 'suggest-outfit' } }],
  capsuleEfficiency: [{ capsuleId: 'c1', name: 'Spring Core', efficiency: 72 }],
};

const stats: ClosetStats = {
  wornThisMonth: 5, totalItems: 40, closetUtilisation: 0.4, closetUtilisationDelta: 0,
  dormantCount: 2, dormantCoolCount: 0, dormantThresholdDays: 90, avgCostPerWear: 3.2,
};

const closets: Closet[] = [{ id: 'cl1', userId: 'u1', name: 'Main' } as Closet];

let mm: ReturnType<typeof installMatchMedia>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getTrips).mockResolvedValue(trips);
  vi.mocked(api.createTrip).mockResolvedValue(trips[0]);
  vi.mocked(api.getTrip).mockResolvedValue({ ...trips[0], autoLogEnabled: false, capsules: [] });
  vi.mocked(api.getTripWeather).mockRejectedValue(new Error('no weather'));
  vi.mocked(api.getTripDays).mockResolvedValue([]);
  vi.mocked(api.getTripPacking).mockResolvedValue([]);
  vi.mocked(api.getPackingSuggestions).mockResolvedValue([]);
  vi.mocked(api.getAllCapsules).mockResolvedValue([]);
  vi.mocked(api.getClosets).mockResolvedValue(closets);
  vi.mocked(api.getClosetStats).mockResolvedValue(stats);
  vi.mocked(api.getInsights).mockResolvedValue(insights);
});

afterEach(() => {
  cleanup();
  mm?.restore();
});

describe('TripsPage reflow', () => {
  it('page padding is 16px at mobile and 20px at tablet (AC1 contract)', () => {
    mm = installMatchMedia(375);
    const { container } = renderWithProviders(<TripsPage />);
    expect(container.querySelector('div')).toHaveStyle({ padding: '16px' });

    cleanup();
    mm.restore();
    mm = installMatchMedia(800);
    const tablet = renderWithProviders(<TripsPage />);
    expect(tablet.container.querySelector('div')).toHaveStyle({ padding: '20px' });
  });

  it('the New trip modal is fluid-width, scrollable and capped at 90dvh (AC9)', () => {
    expect(modalFormStyle.width).toBe('min(380px, calc(100vw - 32px))');
    expect(modalFormStyle.maxHeight).toBe('90dvh');
    expect(modalFormStyle.overflowY).toBe('auto');
  });

  it('at mobile, modal inputs use font-size >= 16px so iOS Safari does not auto-zoom (AC9)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<TripsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'New trip' }));

    const textInputs = screen.getAllByRole('textbox') as HTMLElement[];
    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLElement[];
    [...textInputs, ...dateInputs].forEach((input) => {
      expect(Number.parseFloat(input.style.fontSize)).toBeGreaterThanOrEqual(16);
    });
  });

  it('below 400px the start/end date pair stacks vertically (AC9)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<TripsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'New trip' }));

    const startInput = document.querySelector('input[type="date"]') as HTMLElement;
    const pair = startInput.parentElement!.parentElement as HTMLElement;
    expect(pair).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });

  it('at >= 400px the date pair stays side by side (AC9)', async () => {
    mm = installMatchMedia(420);
    renderWithProviders(<TripsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'New trip' }));

    const startInput = document.querySelector('input[type="date"]') as HTMLElement;
    const pair = startInput.parentElement!.parentElement as HTMLElement;
    expect(pair).toHaveStyle({ flexDirection: 'row' });
  });

  it('trip rows are >= 64px tall and stack the date range under the destination below 480px (AC10)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<TripsPage />);
    const row = await screen.findByRole('button', { name: /Lisbon/ });
    expect(row).toHaveStyle({ minHeight: '64px', flexDirection: 'column', alignItems: 'flex-start' });
  });

  it('trip rows keep the name/date split at >= 480px (AC10)', async () => {
    mm = installMatchMedia(520);
    renderWithProviders(<TripsPage />);
    const row = await screen.findByRole('button', { name: /Lisbon/ });
    expect(row).toHaveStyle({ flexDirection: 'row' });
  });
});

describe('TripDetailPage reflow', () => {
  it('collapses the 1fr/320px content-rail grid to a single column below 1024px (AC1)', async () => {
    mm = installMatchMedia(768);
    renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetailPage />} />
      </Routes>,
      ['/trips/t1']
    );
    await screen.findByRole('heading', { name: 'Lisbon' });
    const packingHeading = screen.getByText('Packing list');
    const grid = packingHeading.closest('div')!.parentElement!.parentElement as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: '1fr' });
  });

  it('keeps the two-column grid at desktop and uses 28px padding (AC1)', async () => {
    mm = installMatchMedia(1280);
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetailPage />} />
      </Routes>,
      ['/trips/t1']
    );
    await screen.findByRole('heading', { name: 'Lisbon' });
    expect(container.querySelector('div')).toHaveStyle({ padding: '28px' });
    const grid = screen.getByText('Packing list').closest('div')!.parentElement!.parentElement as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: '1fr 320px' });
  });
});

describe('InsightsPage reflow', () => {
  it('uses an auto-fit panel grid that collapses to one column below ~660px (AC7)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<InsightsPage />);
    await screen.findByText('Most worn');
    expect(panelGridColumns).toBe('repeat(auto-fit, minmax(min(320px, 100%), 1fr))');
  });

  it('page padding is 16px at mobile (AC7 -> AC1 contract)', async () => {
    mm = installMatchMedia(375);
    const { container } = renderWithProviders(<InsightsPage />);
    await screen.findByText('Most worn');
    expect(container.querySelector('div')).toHaveStyle({ padding: '16px' });
  });

  it('stacks capsule-efficiency rows at mobile: name + right-aligned % above a full-width bar (AC8)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<InsightsPage />);
    const name = await screen.findByText('Spring Core');
    const block = name.closest('div')!.parentElement as HTMLElement;
    // Not the desktop 3-column grid.
    expect(block.style.gridTemplateColumns).toBe('');
    // percentage present and bar present
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('keeps the 120px/1fr/26px capsule-efficiency grid at desktop (AC8)', async () => {
    mm = installMatchMedia(1280);
    renderWithProviders(<InsightsPage />);
    const name = await screen.findByText('Spring Core');
    const row = name.parentElement as HTMLElement;
    expect(row).toHaveStyle({ gridTemplateColumns: '120px 1fr 26px' });
  });

  it('the per-row sitting-idle action button is >= 44px tall at mobile (AC8)', async () => {
    mm = installMatchMedia(375);
    renderWithProviders(<InsightsPage />);
    const btn = await screen.findByRole('button', { name: 'Plan a wear' });
    expect(btn).toHaveStyle({ minHeight: '44px' });
  });
});

describe('no horizontal overflow at the documented viewports (AC11)', () => {
  const widths = [320, 375, 390, 768, 1024];

  it.each(widths)('/trips at %ipx (modal closed and open)', async (w) => {
    mm = installMatchMedia(w);
    renderWithProviders(<TripsPage />);
    await screen.findByRole('button', { name: /Lisbon/ });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);

    await userEvent.click(screen.getByRole('button', { name: 'New trip' }));
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });

  it.each(widths)('/insights at %ipx', async (w) => {
    mm = installMatchMedia(w);
    renderWithProviders(<InsightsPage />);
    await screen.findByText('Most worn');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });

  it.each(widths)('/trips/:id at %ipx', async (w) => {
    mm = installMatchMedia(w);
    renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetailPage />} />
      </Routes>,
      ['/trips/t1']
    );
    await screen.findByRole('heading', { name: 'Lisbon' });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  });
});
