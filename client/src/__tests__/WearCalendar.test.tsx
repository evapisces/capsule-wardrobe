import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import WearHistoryPage from '../pages/WearHistoryPage';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';
import type { ClosetWearDay } from '@capsule/shared';

vi.mock('../lib/api');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WearHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const MARCH_DAY: ClosetWearDay = {
  date: '2026-03-10',
  events: [
    {
      id: 'evt_1',
      outfitName: 'Weekend Casual',
      context: null,
      source: 'manual',
      corrected: false,
      items: [
        { id: 'item_1', name: 'Blue Shirt', photoUrl: null },
        { id: 'item_2', name: 'Denim Jeans', photoUrl: null },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  vi.mocked(api.getClosets).mockResolvedValue([
    { id: 'closet_1', userId: 'u1', name: 'Main', description: null, createdAt: new Date().toISOString() },
  ]);
  vi.mocked(api.getClosetWearHistory).mockResolvedValue([MARCH_DAY]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WearHistoryPage — calendar (desktop)', () => {
  it('renders days with wears distinctly from days without wears', async () => {
    renderPage();

    const wornDay = await screen.findByText('Weekend Casual');
    const wornCell = wornDay.closest('[data-testid="wear-day-2026-03-10"]');
    expect(wornCell).toHaveAttribute('data-has-wears', 'true');

    const emptyDay = screen.getByTestId('wear-day-2026-03-01');
    expect(emptyDay).toHaveAttribute('data-has-wears', 'false');
  });

  it('fetches the current month by default', async () => {
    renderPage();
    await screen.findByText('Weekend Casual');
    expect(api.getClosetWearHistory).toHaveBeenCalledWith('closet_1', '2026-03-01', '2026-03-31');
  });

  it('month navigation refetches the new range', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();
    await screen.findByText('Weekend Casual');

    await user.click(screen.getByRole('button', { name: /next month/i }));

    await waitFor(() => {
      expect(api.getClosetWearHistory).toHaveBeenCalledWith('closet_1', '2026-04-01', '2026-04-30');
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('April 2026');

    await user.click(screen.getByRole('button', { name: /previous month/i }));
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    await waitFor(() => {
      expect(api.getClosetWearHistory).toHaveBeenCalledWith('closet_1', '2026-02-01', '2026-02-28');
    });
  });

  it('selecting a day reveals its full event detail with item links', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    const wornEvent = await screen.findByText('Weekend Casual');
    const wornCell = wornEvent.closest('[data-testid="wear-day-2026-03-10"]') as HTMLElement;
    await user.click(wornCell);

    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    const itemLink = screen.getByRole('link', { name: 'Blue Shirt' });
    expect(itemLink).toHaveAttribute('href', '/items/item_1');
  });
});

describe('WearHistoryPage — mobile timeline', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => mm?.restore());

  it('renders a vertical timeline instead of the 7-column grid', async () => {
    mm = installMatchMedia(375);
    renderPage();

    const wornEvent = await screen.findByText('Weekend Casual');
    expect(screen.queryByTestId('wear-calendar-grid')).not.toBeInTheDocument();
    expect(wornEvent.closest('[data-testid="wear-timeline-day-2026-03-10"]')).not.toBeNull();
  });
});
