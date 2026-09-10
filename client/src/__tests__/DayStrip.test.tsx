import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TripDay } from '@capsule/shared';
import DayStrip from '../components/DayStrip';
import { installMatchMedia } from './helpers/matchMedia';

const opts = [
  { id: 'o1', name: 'Outfit One' },
  { id: 'o2', name: 'Outfit Two' },
];

function makeDays(n: number): TripDay[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    dayNumber: i + 1,
    state: 'future' as const,
    outfitId: null,
    outfitName: null,
  }));
}

describe('DayStrip', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('at mobile: a 14-day trip renders a scroll-snap flex row, not 14 equal grid columns (AC2, AC12)', () => {
    mm = installMatchMedia(375);
    const { container } = render(<DayStrip days={makeDays(14)} outfitOptions={opts} onPick={() => {}} />);
    const strip = container.firstChild as HTMLElement;

    expect(strip).toHaveStyle({ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' });
    // The pre-fix `repeat(14, 1fr)` grid must be gone.
    expect(strip.style.gridTemplateColumns).toBe('');
    expect(strip.style.gridTemplateColumns).not.toContain('repeat(14');
  });

  it('at tablet: still a scroll row, not an N-column grid (AC2)', () => {
    mm = installMatchMedia(768);
    const { container } = render(<DayStrip days={makeDays(9)} outfitOptions={opts} onPick={() => {}} />);
    const strip = container.firstChild as HTMLElement;
    expect(strip).toHaveStyle({ display: 'flex', scrollSnapType: 'x mandatory' });
    expect(strip.style.gridTemplateColumns).toBe('');
  });

  it('at desktop: uses an auto-fit minmax(104px, 1fr) grid so long trips wrap (AC2)', () => {
    mm = installMatchMedia(1024);
    const { container } = render(<DayStrip days={makeDays(14)} outfitOptions={opts} onPick={() => {}} />);
    const strip = container.firstChild as HTMLElement;
    expect(strip).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
    });
    expect(strip.style.gridTemplateColumns).not.toContain('repeat(14');
  });

  it('every day card is a >= 44px-tall button whose whole surface opens the picker (AC3)', () => {
    mm = installMatchMedia(375);
    render(<DayStrip days={makeDays(3)} outfitOptions={opts} onPick={() => {}} />);
    const dayButtons = screen.getAllByRole('button');
    expect(dayButtons).toHaveLength(3);
    dayButtons.forEach((b) => expect(b).toHaveStyle({ minHeight: '44px' }));

    fireEvent.click(dayButtons[0]);
    expect(screen.getByRole('button', { name: 'Outfit One' })).toBeInTheDocument();
  });

  it('at mobile: the picker is a full-width list anchored under the card, options >= 44px tall (AC4)', () => {
    mm = installMatchMedia(375);
    render(<DayStrip days={makeDays(5)} outfitOptions={opts} onPick={() => {}} />);
    fireEvent.click(screen.getAllByRole('button')[4]);

    const option = screen.getByRole('button', { name: 'Outfit One' });
    expect(option).toHaveStyle({ minHeight: '44px' });

    const popover = option.parentElement as HTMLElement;
    expect(popover).toHaveStyle({ position: 'absolute', top: '100%', left: '0px', right: '0px' });
  });

  it('at desktop: the picker flips to right:0 for a day in the right half, stays left:0 in the left half (AC4)', () => {
    mm = installMatchMedia(1024);
    render(<DayStrip days={makeDays(14)} outfitOptions={opts} onPick={() => {}} />);
    const dayButtons = screen.getAllByRole('button');

    fireEvent.click(dayButtons[11]);
    let popover = screen.getByRole('button', { name: 'Outfit One' }).parentElement as HTMLElement;
    expect(popover).toHaveStyle({ right: '0px' });
    expect(popover.style.left).toBe('');

    fireEvent.click(dayButtons[11]); // close
    fireEvent.click(dayButtons[2]);
    popover = screen.getByRole('button', { name: 'Outfit One' }).parentElement as HTMLElement;
    expect(popover).toHaveStyle({ left: '0px' });
    expect(popover.style.right).toBe('');
  });

  it('picking an option calls onPick with the day date and outfit id', () => {
    mm = installMatchMedia(1024);
    const onPick = vi.fn();
    render(<DayStrip days={makeDays(3)} outfitOptions={opts} onPick={onPick} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Outfit Two' }));
    expect(onPick).toHaveBeenCalledWith('2026-09-02', 'o2');
  });
});
