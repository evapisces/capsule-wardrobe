import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { PackingRow } from '@capsule/shared';
import PackingList from '../components/PackingList';
import { installMatchMedia } from './helpers/matchMedia';

const rows: PackingRow[] = [
  {
    itemId: 'i1',
    name: 'Linen Shirt',
    category: 'tops',
    photoUrl: null,
    packed: false,
    quantity: 2,
    neededByOutfits: ['Beach Day', 'Dinner'],
  },
];

describe('PackingList', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('at mobile: a row stacks into checkbox + thumbnail + a block of name/category/needed-by/quantity (AC5, AC12)', () => {
    mm = installMatchMedia(375);
    render(<PackingList rows={rows} onToggle={() => {}} />);

    const row = screen.getByRole('button', { name: 'Mark Linen Shirt packed' }).parentElement as HTMLElement;
    expect(row).toHaveStyle({ display: 'flex' });
    // No 5-column grid on the row at mobile.
    expect(row.style.gridTemplateColumns).toBe('');

    expect(screen.getByText('Linen Shirt')).toBeInTheDocument();
    expect(screen.getByText('tops')).toBeInTheDocument();
    expect(screen.getByText('Beach Day, Dinner')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('at mobile: the toggle keeps an 18px visible box but grows its hit area to >= 44px (AC6)', () => {
    mm = installMatchMedia(375);
    render(<PackingList rows={rows} onToggle={() => {}} />);

    const toggle = screen.getByRole('button', { name: 'Mark Linen Shirt packed' });
    expect(toggle).toHaveStyle({ padding: '13px' }); // 18 + 13*2 = 44

    const box = toggle.querySelector('span') as HTMLElement;
    expect(box).toHaveStyle({ width: '18px', height: '18px' });
  });

  it('keeps its accessible name based on packed state (AC6)', () => {
    mm = installMatchMedia(375);
    const packedRows: PackingRow[] = [{ ...rows[0], packed: true }];
    render(<PackingList rows={packedRows} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Mark Linen Shirt unpacked' })).toBeInTheDocument();
  });

  it('at desktop: the row keeps the original 5-column grid (regression)', () => {
    mm = installMatchMedia(1024);
    render(<PackingList rows={rows} onToggle={() => {}} />);
    const row = screen.getByRole('button', { name: 'Mark Linen Shirt packed' }).parentElement as HTMLElement;
    expect(row).toHaveStyle({ gridTemplateColumns: '26px 52px 1fr 200px 36px' });
  });

  it('toggling calls onToggle with the item id and the negated packed flag', () => {
    mm = installMatchMedia(375);
    const onToggle = vi.fn();
    render(<PackingList rows={rows} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Linen Shirt packed' }));
    expect(onToggle).toHaveBeenCalledWith('i1', true);
  });
});
