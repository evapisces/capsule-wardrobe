import { render, screen, cleanup } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CapsuleBuilderPage from '../pages/CapsuleBuilderPage';
import * as api from '../lib/api';

vi.mock('../lib/api');

const board = {
  id: 'cap1',
  name: 'Weekend',
  climate: 'temperate',
  tempHighF: null,
  tempLowF: null,
  climateLabel: 'Temperate',
  tripLabel: 'Standing capsule',
  offClimateCount: 0,
  items: [],
  outfits: [],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/capsules/cap1']}>
        <Routes>
          <Route path="/capsules/:id" element={<CapsuleBuilderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCapsuleBoard).mockResolvedValue(board as never);
  vi.mocked(api.getCapsuleDrawer).mockResolvedValue([] as never);
});

afterEach(() => cleanup());

describe('CapsuleBuilderPage — zero-closet guard (issue #25)', () => {
  it('shows a "create a closet first" message with a link to / when the user has no closets', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([]);
    renderPage();

    await screen.findByText(/create a closet first/i);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders the normal capsule board when the user has a closet', async () => {
    vi.mocked(api.getClosets).mockResolvedValue([
      { id: 'closet_1', userId: 'u1', name: 'Main', description: null, createdAt: new Date().toISOString() },
    ] as never);
    renderPage();

    await screen.findByTestId('board-canvas');
    expect(screen.queryByText(/create a closet first/i)).not.toBeInTheDocument();
  });
});
