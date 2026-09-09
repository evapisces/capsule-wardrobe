import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '../components/ItemCard';
import type { ClosetItem } from '@capsule/shared';

const baseItem: ClosetItem = {
  id: 'item_1',
  closetId: 'closet_1',
  name: 'White Linen Shirt',
  photoUrl: null,
  category: 'tops',
  color: 'white',
  climate: null,
  size: 'S',
  brand: 'Everlane',
  notes: null,
  createdAt: new Date().toISOString(),
  capsuleCount: 0,
};

describe('ItemCard', () => {
  it('renders item name', () => {
    render(<ItemCard item={baseItem} />);
    expect(screen.getByText('White Linen Shirt')).toBeInTheDocument();
  });

  it('shows green border on the photo when isInActiveCapsule is true', () => {
    render(<ItemCard item={baseItem} isInActiveCapsule />);
    const photo = screen.getByText('👕').closest('div') as HTMLElement;
    expect(photo.style.border).toContain('var(--accent-green)');
  });

  it('shows orange badge when capsuleCount > 0 and not in active capsule', () => {
    render(<ItemCard item={{ ...baseItem, capsuleCount: 3 }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ItemCard item={baseItem} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(baseItem);
  });
});
