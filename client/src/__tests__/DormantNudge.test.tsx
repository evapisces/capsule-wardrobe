import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DormantNudge from '../components/DormantNudge';
import type { ClosetItem } from '@capsule/shared';

afterEach(() => cleanup());

function makeItem(overrides: Partial<ClosetItem>): ClosetItem {
  return {
    id: 'item_1',
    closetId: 'closet_1',
    name: 'Item',
    photoUrl: null,
    category: 'tops',
    color: null,
    climate: null,
    size: null,
    brand: null,
    notes: null,
    pricePaid: null,
    createdAt: new Date().toISOString(),
    dormant: false,
    lastWornAt: null,
    ...overrides,
  };
}

function renderNudge(items: ClosetItem[], onShowDormant = vi.fn()) {
  return render(
    <MemoryRouter>
      <DormantNudge items={items} thresholdDays={90} onShowDormant={onShowDormant} />
    </MemoryRouter>
  );
}

describe('DormantNudge', () => {
  it('renders nothing when there are no dormant items', () => {
    const items = [makeItem({ id: 'a', dormant: false })];
    renderNudge(items);
    expect(screen.queryByTestId('dormant-nudge')).not.toBeInTheDocument();
  });

  it('names up to 3 dormant items, oldest-lastWornAt-first, never-worn last', () => {
    const items = [
      makeItem({ id: 'never', name: 'Never Worn Hat', dormant: true, lastWornAt: null }),
      makeItem({ id: 'recent-dormant', name: 'Old Jeans', dormant: true, lastWornAt: '2026-01-01T00:00:00.000Z' }),
      makeItem({ id: 'oldest-dormant', name: 'Ancient Scarf', dormant: true, lastWornAt: '2025-06-01T00:00:00.000Z' }),
      makeItem({ id: 'fourth-dormant', name: 'Dusty Boots', dormant: true, lastWornAt: '2025-09-01T00:00:00.000Z' }),
      makeItem({ id: 'worn', name: 'Active Shirt', dormant: false }),
    ];
    renderNudge(items);

    const banner = screen.getByTestId('dormant-nudge');
    expect(banner).toHaveTextContent('4 items');
    expect(banner).toHaveTextContent('90+ days');
    expect(banner).toHaveTextContent('Ancient Scarf');
    expect(banner).toHaveTextContent('Dusty Boots');
    expect(banner).toHaveTextContent('Old Jeans');
    expect(banner).not.toHaveTextContent('Never Worn Hat');
    expect(banner).toHaveTextContent('+1 more');
    expect(screen.queryByText('Active Shirt')).not.toBeInTheDocument();
  });

  it('uses the given thresholdDays rather than a hardcoded 90', () => {
    const items = [makeItem({ id: 'a', name: 'Coat', dormant: true, lastWornAt: null })];
    render(
      <MemoryRouter>
        <DormantNudge items={items} thresholdDays={60} onShowDormant={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dormant-nudge')).toHaveTextContent('60+ days');
  });

  it('links each named item to its item detail page', () => {
    const items = [makeItem({ id: 'item_42', name: 'Blue Coat', dormant: true, lastWornAt: null })];
    renderNudge(items);
    expect(screen.getByRole('link', { name: 'Blue Coat' })).toHaveAttribute('href', '/items/item_42');
  });

  it('clicking the action calls onShowDormant', async () => {
    const onShowDormant = vi.fn();
    const items = [makeItem({ id: 'a', name: 'Coat', dormant: true, lastWornAt: null })];
    const user = userEvent.setup();
    renderNudge(items, onShowDormant);

    await user.click(screen.getByRole('button', { name: /show dormant items/i }));
    expect(onShowDormant).toHaveBeenCalledTimes(1);
  });

  it('dismissing hides the banner for the session', async () => {
    const items = [makeItem({ id: 'a', name: 'Coat', dormant: true, lastWornAt: null })];
    const user = userEvent.setup();
    renderNudge(items);

    expect(screen.getByTestId('dormant-nudge')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('dormant-nudge')).not.toBeInTheDocument();
  });
});
