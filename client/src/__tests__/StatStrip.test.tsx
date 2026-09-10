import { render, screen } from '@testing-library/react';
import StatStrip, { type Stat } from '../components/StatStrip';
import { installMatchMedia } from './helpers/matchMedia';

const stats: Stat[] = [
  { key: 'items', value: '48', sub: 'in closet' },
  { key: 'capsules', value: '3', sub: 'active' },
  { key: 'trips', value: '2', sub: 'planned' },
  { key: 'cost per wear', value: '$1.20', sub: 'avg' },
];

describe('StatStrip', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => mm?.restore());

  it('uses a 2-column grid and a 24px serif value at mobile', () => {
    mm = installMatchMedia(375);
    const { container } = render(<StatStrip stats={stats} />);
    expect(container.firstChild).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
    expect(screen.getByText('48')).toHaveStyle({ fontSize: '24px' });
  });

  it('is unchanged at >= 768px', () => {
    mm = installMatchMedia(1024);
    const { container } = render(<StatStrip stats={stats} />);
    expect(container.firstChild).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    });
    expect(screen.getByText('48')).toHaveStyle({ fontSize: '32px' });
  });
});
