import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemCard from '../components/ItemCard';
import { installMatchMedia } from './helpers/matchMedia';
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

  it('marks the card as a scroll-snap target and keeps a >= 44px hit area', () => {
    render(<ItemCard item={baseItem} onClick={() => {}} />);
    const card = screen.getByRole('button');
    expect(card.style.scrollSnapAlign).toBe('start');
    expect(card.style.minWidth).toBe('44px');
    expect(card.style.minHeight).toBe('44px');
  });
});

describe('ItemCard — fluid photo width (issue #4)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('is 156px wide at mobile and keeps the 186:212 photo aspect ratio', () => {
    mm = installMatchMedia(375);
    render(<ItemCard item={baseItem} />);
    const card = screen.getByRole('button');
    const photo = screen.getByText('👕').closest('div') as HTMLElement;
    expect(card.style.width).toBe('156px');
    expect(photo.style.width).toBe('156px');
    expect(photo.style.aspectRatio).toBe('186 / 212');
    expect(photo.style.height).toBe('');
  });

  it('is 186px wide at tablet and desktop', () => {
    mm = installMatchMedia(800);
    const { rerender } = render(<ItemCard item={baseItem} />);
    expect(screen.getByRole('button').style.width).toBe('186px');

    mm.setWidth(1280);
    rerender(<ItemCard item={baseItem} />);
    expect(screen.getByRole('button').style.width).toBe('186px');
  });
});
