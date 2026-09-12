import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import InsightsPage from '../pages/InsightsPage';
import * as api from '../lib/api';
import type { InsightsSummary } from '@capsule/shared';

vi.mock('../lib/api');

function renderPage(qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const baseInsights: InsightsSummary = {
  loggedWears: 0,
  unloggedDays: 0,
  mostWorn: [],
  sittingIdle: [
    {
      itemId: 'item_1',
      name: 'Cold Sweater',
      photoUrl: null,
      reason: 'Never worn · added Jan 2026',
      actionLabel: 'Add to Cold Weather Capsule',
      action: { kind: 'add-to-capsule', capsuleId: 'capsule_1', capsuleName: 'Cold Weather Capsule' },
    },
    {
      itemId: 'item_2',
      name: 'Odd Shirt',
      photoUrl: null,
      reason: 'Never worn · added Jan 2026',
      actionLabel: 'Suggest an outfit',
      action: { kind: 'suggest-outfit' },
    },
  ],
  capsuleEfficiency: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getClosets).mockResolvedValue([
    { id: 'closet_1', userId: 'u1', name: 'Main', description: null, createdAt: new Date().toISOString() },
  ]);
  vi.mocked(api.getClosetStats).mockResolvedValue(undefined as never);
  vi.mocked(api.getInsights).mockResolvedValue(baseInsights);
});

afterEach(() => cleanup());

describe('InsightsPage — sitting-idle action button (issue #32)', () => {
  it('calls addItemToCapsule exactly once with the row ids when clicked', async () => {
    vi.mocked(api.addItemToCapsule).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Add to Cold Weather Capsule' });
    await user.click(button);

    await waitFor(() => expect(api.addItemToCapsule).toHaveBeenCalledTimes(1));
    expect(api.addItemToCapsule).toHaveBeenCalledWith('capsule_1', 'item_1');
  });

  it('disables the button while the request is in flight', async () => {
    let resolve!: () => void;
    vi.mocked(api.addItemToCapsule).mockReturnValue(
      new Promise((res) => {
        resolve = () => res(undefined as never);
      })
    );
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Add to Cold Weather Capsule' });
    await user.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    resolve();
  });

  it('shows an inline confirmation and invalidates the insights query on success', async () => {
    vi.mocked(api.addItemToCapsule).mockResolvedValue(undefined as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const user = userEvent.setup();
    renderPage(qc);

    const button = await screen.findByRole('button', { name: 'Add to Cold Weather Capsule' });
    await user.click(button);

    await screen.findByText('Added to Cold Weather Capsule');
    expect(screen.queryByRole('button', { name: 'Add to Cold Weather Capsule' })).not.toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['insights', 'closet_1', '6m'] });
  });

  it('shows an inline error and lets the user retry on failure', async () => {
    vi.mocked(api.addItemToCapsule).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Add to Cold Weather Capsule' });
    await user.click(button);

    await screen.findByText(/couldn.t add/i);
    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    expect(retryButton).not.toBeDisabled();

    vi.mocked(api.addItemToCapsule).mockResolvedValueOnce(undefined as never);
    await user.click(retryButton);
    await screen.findByText('Added to Cold Weather Capsule');
    expect(api.addItemToCapsule).toHaveBeenCalledTimes(2);
  });

  it('opens the outfit suggestion panel and never calls addItemToCapsule directly for the suggest-outfit action', async () => {
    vi.mocked(api.getOutfitSuggestion).mockReturnValue(new Promise(() => {})); // stays loading
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Suggest an outfit' });
    expect(button).not.toBeDisabled();
    await user.click(button);

    await screen.findByRole('dialog', { name: 'Suggest an outfit' });
    expect(api.addItemToCapsule).not.toHaveBeenCalled();
  });
});
