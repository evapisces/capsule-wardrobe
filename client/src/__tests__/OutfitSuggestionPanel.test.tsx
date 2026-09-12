import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OutfitSuggestionPanel from '../components/OutfitSuggestionPanel';
import * as api from '../lib/api';
import type { OutfitSuggestion, Capsule, BoardOutfit } from '@capsule/shared';

vi.mock('../lib/api');

function renderPanel(qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }), overrides: Partial<React.ComponentProps<typeof OutfitSuggestionPanel>> = {}) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OutfitSuggestionPanel
          isOpen
          onClose={vi.fn()}
          itemId="item_1"
          closetId="closet_1"
          range="6m"
          {...overrides}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const baseSuggestion: OutfitSuggestion = {
  seed: { itemId: 'item_1', name: 'Cold Sweater', photoUrl: null, category: 'tops', climate: 'cold' },
  suggestions: [
    { itemId: 'item_2', name: 'Wool Trousers', photoUrl: null, category: 'bottoms', climate: 'cold', reason: 'Rounds out the outfit with a bottom' },
    { itemId: 'item_3', name: 'Boots', photoUrl: null, category: 'shoes', climate: 'cold', reason: 'Rounds out the outfit with a shoe' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('OutfitSuggestionPanel', () => {
  it('shows a loading state while fetching', async () => {
    vi.mocked(api.getOutfitSuggestion).mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(await screen.findByText(/finding pieces/i)).toBeInTheDocument();
  });

  it('shows the seed item and suggested items with reasons, without navigating away', async () => {
    vi.mocked(api.getOutfitSuggestion).mockResolvedValue(baseSuggestion);
    renderPanel();

    await screen.findByText('Cold Sweater');
    expect(screen.getByText('Wool Trousers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
    expect(screen.getByText('Rounds out the outfit with a bottom')).toBeInTheDocument();
    expect(screen.getByText('Rounds out the outfit with a shoe')).toBeInTheDocument();
  });

  it('shows a plain empty state with no action button when there are too few compatible items', async () => {
    vi.mocked(api.getOutfitSuggestion).mockResolvedValue({ seed: baseSuggestion.seed, suggestions: [] });
    renderPanel();

    await screen.findByText(/not enough compatible items/i);
    expect(screen.queryByRole('button', { name: /create capsule/i })).not.toBeInTheDocument();
  });

  it('shows a retryable error on a failed fetch', async () => {
    vi.mocked(api.getOutfitSuggestion).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderPanel();

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    vi.mocked(api.getOutfitSuggestion).mockResolvedValueOnce(baseSuggestion);
    await user.click(retryButton);

    await screen.findByText('Cold Sweater');
  });

  it('persists the suggestion by creating a capsule, adding items, and creating an outfit', async () => {
    vi.mocked(api.getOutfitSuggestion).mockResolvedValue(baseSuggestion);
    vi.mocked(api.createCapsule).mockResolvedValue({ id: 'capsule_new', name: 'Cold Sweater outfit' } as Capsule);
    vi.mocked(api.addItemToCapsule).mockResolvedValue(undefined as never);
    vi.mocked(api.createOutfit).mockResolvedValue({ id: 'outfit_1', name: 'Cold Sweater outfit', itemIds: [] } as BoardOutfit);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText('Cold Sweater');
    await user.click(screen.getByRole('button', { name: /create capsule from this outfit/i }));

    await waitFor(() => expect(api.createOutfit).toHaveBeenCalledTimes(1));
    expect(api.createCapsule).toHaveBeenCalledWith({ name: 'Cold Sweater outfit' });
    expect(api.addItemToCapsule).toHaveBeenCalledWith('capsule_new', 'item_1');
    expect(api.addItemToCapsule).toHaveBeenCalledWith('capsule_new', 'item_2');
    expect(api.addItemToCapsule).toHaveBeenCalledWith('capsule_new', 'item_3');
    expect(api.createOutfit).toHaveBeenCalledWith('capsule_new', 'Cold Sweater outfit', ['item_1', 'item_2', 'item_3']);
  });

  it('confirms success with a link to the new capsule and invalidates the insights query', async () => {
    vi.mocked(api.getOutfitSuggestion).mockResolvedValue(baseSuggestion);
    vi.mocked(api.createCapsule).mockResolvedValue({ id: 'capsule_new', name: 'Cold Sweater outfit' } as Capsule);
    vi.mocked(api.addItemToCapsule).mockResolvedValue(undefined as never);
    vi.mocked(api.createOutfit).mockResolvedValue({ id: 'outfit_1', name: 'Cold Sweater outfit', itemIds: [] } as BoardOutfit);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const user = userEvent.setup();
    renderPanel(qc);

    await screen.findByText('Cold Sweater');
    await user.click(screen.getByRole('button', { name: /create capsule from this outfit/i }));

    const link = await screen.findByRole('link', { name: /open capsule/i });
    expect(link).toHaveAttribute('href', '/capsules/capsule_new');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['insights', 'closet_1', '6m'] });
  });
});
