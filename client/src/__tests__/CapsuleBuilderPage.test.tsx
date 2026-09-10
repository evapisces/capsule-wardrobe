import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CapsuleBuilderPage from '../pages/CapsuleBuilderPage';
import * as api from '../lib/api';
import { installMatchMedia } from './helpers/matchMedia';

vi.mock('../lib/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const drawerItems = [
  {
    id: 'i1',
    name: 'Blue tee',
    photoUrl: null,
    category: 'tops',
    climate: 'temperate',
    wearCount: 0,
    matchesClimate: true,
  },
];

let mm: ReturnType<typeof installMatchMedia>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getClosets).mockResolvedValue([{ id: 'closet1' }] as never);
  vi.mocked(api.getCapsuleBoard).mockResolvedValue(board as never);
  vi.mocked(api.getCapsuleDrawer).mockResolvedValue(drawerItems as never);
  vi.mocked(api.placeBoardItem).mockResolvedValue({} as never);
});

afterEach(() => {
  mm?.restore();
});

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

describe('CapsuleBuilderPage — layout per breakpoint (AC 4, 6, 12)', () => {
  it('renders the vertical outfit list (not the freeform board) at 768px', async () => {
    mm = installMatchMedia(768);
    renderPage();

    expect(await screen.findByTestId('outfit-list')).toBeInTheDocument();
    expect(screen.queryByTestId('board-canvas')).not.toBeInTheDocument();
  });

  it('renders the freeform board (not the list) at 1024px', async () => {
    mm = installMatchMedia(1024);
    renderPage();

    expect(await screen.findByTestId('board-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('outfit-list')).not.toBeInTheDocument();
  });
});

describe('CapsuleBuilderPage — instructional copy reflects the active layout (AC 10)', () => {
  it('does not tell tablet users to drag garments onto the board', async () => {
    mm = installMatchMedia(768);
    renderPage();
    await screen.findByTestId('outfit-list');

    expect(screen.queryByText(/Drag any garment onto the board/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tap "Add item"/i)).toBeInTheDocument();
  });

  it('tells desktop users to drag garments onto the board', async () => {
    mm = installMatchMedia(1024);
    renderPage();
    await screen.findByTestId('board-canvas');

    expect(screen.getByText(/Drag any garment onto the board/i)).toBeInTheDocument();
  });
});

describe('CapsuleBuilderPage — touch placement (AC 9)', () => {
  it('places a tapped drawer item at a computed grid coordinate, not the hardcoded 0.1/0.1', async () => {
    mm = installMatchMedia(768);
    renderPage();
    await screen.findByTestId('outfit-list');

    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await userEvent.click(await screen.findByText('Blue tee'));

    expect(api.placeBoardItem).toHaveBeenCalledWith('cap1', 'i1', 0, 0);
    expect(api.placeBoardItem).not.toHaveBeenCalledWith('cap1', 'i1', 0.1, 0.1);
  });
});
