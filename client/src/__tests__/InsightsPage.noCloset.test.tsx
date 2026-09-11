import { render, screen, cleanup } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import InsightsPage from '../pages/InsightsPage';
import * as api from '../lib/api';

vi.mock('../lib/api');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getClosetStats).mockResolvedValue(undefined as never);
  vi.mocked(api.getInsights).mockResolvedValue(undefined as never);
});

afterEach(() => cleanup());

describe('InsightsPage — zero-closet guard (issue #25 AC7)', () => {
  it('shows a "create a closet first" message with a link to / when the user has no closets', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    renderPage();

    await screen.findByText(/create a closet first/i);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders the normal insights layout when the user has a closet', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([
      { id: 'closet_1', userId: 'u1', name: 'Main', description: null, createdAt: new Date().toISOString() },
    ]);
    renderPage();

    await screen.findByRole('heading', { name: 'Insights' });
    expect(screen.queryByText(/create a closet first/i)).not.toBeInTheDocument();
  });
});
