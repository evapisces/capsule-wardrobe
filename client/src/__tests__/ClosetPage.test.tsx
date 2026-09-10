import { render, screen, cleanup } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ClosetPage from '../pages/ClosetPage';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';

vi.mock('../lib/api');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClosetPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getClosets).mockResolvedValue([
    { id: 'closet_1', userId: 'u1', name: 'Your closet', description: null, createdAt: new Date().toISOString() },
  ]);
  vi.mocked(api.getClosetItems).mockResolvedValue([]);
  vi.mocked(api.getClosetStats).mockResolvedValue(undefined as never);
  vi.mocked(api.getAllCapsules).mockResolvedValue([]);
});

describe('ClosetPage — responsive header (issue #4)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('at mobile: filter chips are their own horizontally scrolling, non-wrapping row', async () => {
    mm = installMatchMedia(375);
    renderPage();

    const chips = await screen.findByTestId('closet-filter-chips');
    expect(chips.style.flexWrap).toBe('nowrap');
    expect(chips.style.overflowX).toBe('auto');
    expect(chips.style.width).toBe('100%');
    // camelCase WebkitOverflowScrolling serialises to the -webkit- property.
    expect(chips.style.getPropertyValue('-webkit-overflow-scrolling')).toBe('touch');

    // Every chip is still present and unclipped (flex: 0 0 auto, nowrap text).
    ['All', 'Worn this month', 'Dormant 90d', 'Hot climate'].forEach((label) => {
      const chip = screen.getByRole('button', { name: label });
      expect(chip.style.flex).toBe('0 0 auto');
      expect(chip.style.whiteSpace).toBe('nowrap');
    });
  });

  it('at mobile: page padding is 16px and the heading scales to 30px', async () => {
    mm = installMatchMedia(375);
    const { container } = renderPage();

    await screen.findByTestId('closet-filter-chips');
    const page = container.firstChild as HTMLElement;
    expect(page.style.padding).toBe('16px');
    expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe('30px');
  });

  it('at tablet: page padding is 20px and the heading scales to 36px', async () => {
    mm = installMatchMedia(800);
    const { container } = renderPage();

    await screen.findByTestId('closet-filter-chips');
    const page = container.firstChild as HTMLElement;
    expect(page.style.padding).toBe('20px');
    expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe('36px');
  });

  it('at desktop: padding stays 28px, heading 42px and chips wrap in-row', async () => {
    mm = installMatchMedia(1280);
    const { container } = renderPage();

    const chips = await screen.findByTestId('closet-filter-chips');
    expect(chips.style.flexWrap).toBe('wrap');
    const page = container.firstChild as HTMLElement;
    expect(page.style.padding).toBe('28px');
    expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe('42px');
  });
});
