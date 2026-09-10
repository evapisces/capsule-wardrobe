import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar, { searchInputStyle } from '../components/NavBar';
import BottomSheet from '../components/BottomSheet';
import StatStrip from '../components/StatStrip';
import Tooltip from '../components/Tooltip';
import { useBreakpoint } from '../lib/useIsMobile';
import { useTopBarActions } from '../lib/topBarSlot';
import { installMatchMedia } from './helpers/matchMedia';

// jsdom runs no layout, so we cannot measure `document.documentElement.scrollWidth`
// vs `.clientWidth` the way a real browser does (see the PR "How to test" for the
// manual reproduction). The CI-enforceable proxies for AC 9 are:
//   1. NavBar renders the mobile (hamburger) layout below 768px, so the wide
//      non-wrapping desktop row can never be shown on a phone.
//   2. No shell component carries an inline px `width` / `minWidth` wider than the
//      narrowest supported viewport (320px) — the exact class of bug that the
//      pre-fix `searchInputStyle.width = '220px'` belonged to.

/** Narrowest viewport this project supports; nothing fixed may exceed it. */
const NARROWEST_TARGET = 320;

function pxValue(raw: unknown): number | null {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(String(raw ?? ''));
  return match ? Number(match[1]) : null;
}

/** Flags any inline width/minWidth in px wider than the narrowest supported viewport. */
function auditFixedWidths(root: ParentNode): string[] {
  const offenders: string[] = [];
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    (['width', 'minWidth'] as const).forEach((prop) => {
      const px = pxValue(el.style[prop]);
      if (px != null && px > NARROWEST_TARGET) {
        offenders.push(`<${el.tagName.toLowerCase()}> ${prop}: ${el.style[prop]}`);
      }
    });
  });
  return offenders;
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

describe('NavBar picks the right layout per breakpoint (AC 6-9 CI proxy)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('at mobile: renders the hamburger and NOT the desktop inline destination list', () => {
    mm = installMatchMedia(375);
    render(
      <MemoryRouter>
        <ClosetLikeSlot />
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    // The four inline destinations only exist in the desktop layout; on mobile
    // they are hidden behind the (closed) hamburger menu.
    ['Closet', 'Capsules', 'Trips', 'Insights'].forEach((label) => {
      expect(screen.queryByRole('link', { name: label })).toBeNull();
    });
  });

  it.each([
    [768, 'tablet'],
    [1024, 'desktop'],
  ])('at %ipx (%s): renders the inline destination list and NO hamburger', (px) => {
    mm = installMatchMedia(px as number);
    render(
      <MemoryRouter>
        <ClosetLikeSlot />
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    ['Closet', 'Capsules', 'Trips', 'Insights'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
  });

  it('carries no inline px width/minWidth wider than the narrowest viewport (320px), menu open or closed', () => {
    mm = installMatchMedia(320);
    const { container } = render(
      <MemoryRouter>
        <ClosetLikeSlot />
        <NavBar />
      </MemoryRouter>
    );

    expect(auditFixedWidths(container)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(auditFixedWidths(container)).toEqual([]);
  });
});

describe('searchInputStyle is fluid, not a fixed 220px (AC 7)', () => {
  it('uses a percentage width capped by maxWidth, with no fixed px width', () => {
    // Pre-fix this object was `{ ...styles, width: '220px' }` with no maxWidth —
    // that would fail every assertion below.
    expect(searchInputStyle.width).toBe('100%');

    const widthPx = pxValue(searchInputStyle.width);
    const maxWidthPx = pxValue(searchInputStyle.maxWidth);

    expect(widthPx).toBeNull();
    expect(maxWidthPx).not.toBeNull();
    if (widthPx != null && maxWidthPx != null) {
      expect(widthPx).toBeLessThanOrEqual(maxWidthPx);
    }
  });
});

describe('shared primitives carry no viewport-busting fixed widths at mobile', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('BottomSheet', () => {
    mm = installMatchMedia(320);
    const { container } = render(
      <BottomSheet isOpen title="Filter" onClose={() => {}}>
        <p>Sheet body content</p>
      </BottomSheet>
    );
    expect(auditFixedWidths(container)).toEqual([]);
    expect(auditFixedWidths(document.body)).toEqual([]);
  });

  it('StatStrip', () => {
    mm = installMatchMedia(320);
    const { container } = render(<StatStrip stats={STATS} />);
    expect(auditFixedWidths(container)).toEqual([]);
  });

  it('an open Tooltip', () => {
    mm = installMatchMedia(320);
    const { container } = render(
      <Tooltip content="Cost per wear is price paid divided by times worn, a long-ish label.">
        <button type="button">info</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('info').parentElement as HTMLElement);
    expect(auditFixedWidths(container)).toEqual([]);
    expect(auditFixedWidths(document.body)).toEqual([]);
  });
});

describe('useBreakpoint reflects the live viewport on mount and after resize (defect #1 regression guard)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  function Probe() {
    return <span data-testid="bp">{useBreakpoint()}</span>;
  }

  it('reads "mobile" on mount at 375px, then re-renders as "desktop" after the viewport changes', () => {
    mm = installMatchMedia(375);
    render(<Probe />);
    // Pre-fix, a stale first read with no follow-up `change` event left the hook
    // stuck here forever; useSyncExternalStore re-derives from readBreakpoint().
    expect(screen.getByTestId('bp')).toHaveTextContent('mobile');

    mm.setWidth(1280);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('bp')).toHaveTextContent('desktop');

    mm.setWidth(800);
    expect(screen.getByTestId('bp')).toHaveTextContent('tablet');
  });
});
