import { render, screen, cleanup } from '@testing-library/react';
import ClosetGrid from '../components/ClosetGrid';
import { installMatchMedia } from './helpers/matchMedia';
import type { ClosetItem } from '@capsule/shared';

const item = (over: Partial<ClosetItem>): ClosetItem => ({
  id: 'i1',
  closetId: 'c1',
  name: 'White Tee',
  photoUrl: null,
  category: 'tops',
  color: null,
  climate: null,
  size: null,
  brand: null,
  notes: null,
  pricePaid: null,
  createdAt: new Date().toISOString(),
  capsuleCount: 0,
  ...over,
});

/** The shelf row is the flex container that holds the ItemCard buttons. */
function shelfRow(): HTMLElement {
  const card = screen.getAllByRole('button')[0];
  return card.parentElement as HTMLElement;
}

describe('ClosetGrid — responsive shelf rows (issue #4)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('always enables horizontal scroll-snap on the shelf row', () => {
    mm = installMatchMedia(1280);
    render(<ClosetGrid items={[item({ id: 'a' }), item({ id: 'b' })]} />);
    const row = shelfRow();
    expect(row.style.scrollSnapType).toBe('x mandatory');
    expect(row.style.overflowX).toBe('auto');
  });

  it('bleeds the shelf to the full viewport width at mobile with matching padding', () => {
    mm = installMatchMedia(375);
    render(<ClosetGrid items={[item({ id: 'a' }), item({ id: 'b' })]} />);
    const row = shelfRow();
    expect(row.style.marginLeft).toBe('-16px');
    expect(row.style.marginRight).toBe('-16px');
    expect(row.style.paddingLeft).toBe('16px');
    expect(row.style.paddingRight).toBe('16px');
  });

  it('does not add the negative-margin bleed at desktop', () => {
    mm = installMatchMedia(1280);
    render(<ClosetGrid items={[item({ id: 'a' })]} />);
    const row = shelfRow();
    expect(row.style.marginLeft).toBe('');
    expect(row.style.marginRight).toBe('');
  });
});
