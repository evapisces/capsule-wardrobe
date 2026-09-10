import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar, { searchInputStyle } from '../components/NavBar';
import BottomSheet from '../components/BottomSheet';
import StatStrip from '../components/StatStrip';
import Tooltip from '../components/Tooltip';
import { useTopBarActions } from '../lib/topBarSlot';
import { installMatchMedia } from './helpers/matchMedia';

// AC 9 — no horizontal overflow. jsdom does not run layout, so the direct
// scrollWidth read is a smoke check; the load-bearing assertion is the inline
// audit below, which catches fixed px sizes wider than the viewport (the exact
// regression this issue fixed: NavBar's 220px search field at 375px).
const WIDTHS = [320, 375, 390, 768];

function setViewport(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px });
  return installMatchMedia(px);
}

/** Fails if any element carries an inline width/min-width in px wider than the viewport. */
function auditFixedWidths(root: ParentNode, viewport: number) {
  const offenders: string[] = [];
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    (['width', 'minWidth'] as const).forEach((prop) => {
      const raw = el.style[prop];
      const match = /^(\d+(?:\.\d+)?)px$/.exec(raw);
      if (match && Number(match[1]) > viewport) {
        offenders.push(`<${el.tagName.toLowerCase()}> ${prop}: ${raw}`);
      }
    });
  });
  return offenders;
}

function expectNoOverflow(container: HTMLElement, viewport: number) {
  expect(auditFixedWidths(document.body, viewport)).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
  // container is referenced so the shell stays mounted for the assertions above
  expect(container).toBeInTheDocument();
}

/** Mirrors the ClosetPage top-bar slot (search field + primary action) without importing a page. */
function ClosetLikeSlot() {
  useTopBarActions(
    <>
      <input style={searchInputStyle} placeholder="Search items" />
      <button className="btn-primary" type="button">Add item</button>
    </>
  );
  return null;
}

const STATS = [
  { key: 'Items', value: '128', sub: 'in your closet' },
  { key: 'Capsules', value: '6', sub: 'active' },
  { key: 'Cost / wear', value: '$2.40', sub: 'average' },
  { key: 'Trips', value: '3', sub: 'planned' },
];

describe('no horizontal overflow at mobile/tablet widths (AC 9)', () => {
  let mm: ReturnType<typeof installMatchMedia>;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    cleanup();
    mm?.restore();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  });

  describe.each(WIDTHS)('at %ipx', (width) => {
    it('NavBar with the Closet-style top-bar slot does not force a fixed width wider than the viewport', () => {
      mm = setViewport(width);
      const { container } = render(
        <MemoryRouter>
          <ClosetLikeSlot />
          <NavBar />
        </MemoryRouter>
      );
      expectNoOverflow(container, width);
    });

    it('NavBar with the mobile menu open does not force overflow', () => {
      mm = setViewport(width);
      const { container } = render(
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>
      );
      const trigger = screen.queryByRole('button', { name: 'Menu' });
      if (trigger) fireEvent.click(trigger);
      expectNoOverflow(container, width);
    });

    it('BottomSheet does not force overflow', () => {
      mm = setViewport(width);
      const { container } = render(
        <BottomSheet isOpen title="Filter" onClose={() => {}}>
          <p>Sheet body content</p>
        </BottomSheet>
      );
      expectNoOverflow(container, width);
    });

    it('StatStrip does not force overflow', () => {
      mm = setViewport(width);
      const { container } = render(<StatStrip stats={STATS} />);
      expectNoOverflow(container, width);
    });

    it('an open Tooltip does not force overflow', () => {
      mm = setViewport(width);
      const { container } = render(
        <Tooltip content="Cost per wear is price paid divided by times worn, a long-ish label.">
          <button type="button">info</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('info').parentElement as HTMLElement);
      expectNoOverflow(container, width);
    });
  });
});
