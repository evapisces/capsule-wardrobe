import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('ClosetPage — first-run create-closet prompt (issue #25)', () => {
  afterEach(() => cleanup());

  it('renders the loading state while closets are still loading, not the prompt or the grid', async () => {
    let resolveClosets!: (v: Awaited<ReturnType<typeof api.getClosets>>) => void;
    vi.mocked(api.getClosets).mockReturnValue(new Promise((resolve) => { resolveClosets = resolve; }));

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ClosetPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/create your closet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add item' })).not.toBeInTheDocument();

    resolveClosets([]);
    await screen.findByText(/create your closet/i);
  });

  it('renders the create-closet prompt when the user has zero closets, and no Add item action', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    renderPage();

    await screen.findByText(/create your closet/i);
    expect(screen.getByLabelText(/closet name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/closet description/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add item' })).not.toBeInTheDocument();
  });

  it('never renders the prompt when the user already has a closet', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/create your closet/i)).not.toBeInTheDocument();
  });

  it('submit button is disabled until a name is typed, and while the request is in flight', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    let resolveCreate!: (v: Awaited<ReturnType<typeof api.createCloset>>) => void;
    vi.mocked(api.createCloset).mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/create your closet/i);
    const submit = screen.getByRole('button', { name: /create closet/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/closet name/i), 'Capsule Basics');
    expect(submit).not.toBeDisabled();

    await user.click(submit);
    expect(submit).toBeDisabled();

    resolveCreate({ id: 'c2', userId: 'u1', name: 'Capsule Basics', description: null, createdAt: new Date().toISOString() });
  });

  it('submits the typed name and description to createCloset', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    vi.mocked(api.createCloset).mockResolvedValue({
      id: 'c2', userId: 'u1', name: 'Capsule Basics', description: 'Work + weekend', createdAt: new Date().toISOString(),
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/create your closet/i);
    await user.type(screen.getByLabelText(/closet name/i), 'Capsule Basics');
    await user.type(screen.getByLabelText(/closet description/i), 'Work + weekend');
    await user.click(screen.getByRole('button', { name: /create closet/i }));

    await waitFor(() => {
      expect(api.createCloset).toHaveBeenCalledWith({ name: 'Capsule Basics', description: 'Work + weekend' });
    });
  });

  it('on success, transitions into the normal closet view for the new closet without a full reload', async () => {
    vi.mocked(api.getClosets).mockResolvedValueOnce([]);
    vi.mocked(api.createCloset).mockResolvedValue({
      id: 'c2', userId: 'u1', name: 'Capsule Basics', description: null, createdAt: new Date().toISOString(),
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/create your closet/i);
    await user.type(screen.getByLabelText(/closet name/i), 'Capsule Basics');
    vi.mocked(api.getClosets).mockResolvedValue([
      { id: 'c2', userId: 'u1', name: 'Capsule Basics', description: null, createdAt: new Date().toISOString() },
    ]);
    await user.click(screen.getByRole('button', { name: /create closet/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Capsule Basics');
    });
    expect(screen.queryByText(/create your closet/i)).not.toBeInTheDocument();
  });

  it('on failure, shows an inline error and preserves the typed values so the user can retry', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    vi.mocked(api.createCloset).mockRejectedValue(new Error('Server exploded'));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/create your closet/i);
    await user.type(screen.getByLabelText(/closet name/i), 'Capsule Basics');
    await user.type(screen.getByLabelText(/closet description/i), 'Work + weekend');
    await user.click(screen.getByRole('button', { name: /create closet/i }));

    await screen.findByText(/server exploded/i);
    expect(screen.getByLabelText(/closet name/i)).toHaveValue('Capsule Basics');
    expect(screen.getByLabelText(/closet description/i)).toHaveValue('Work + weekend');
  });
});
