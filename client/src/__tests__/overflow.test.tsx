import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar, { searchInputStyle } from '../components/NavBar';
import BottomSheet from '../components/BottomSheet';
import StatStrip from '../components/StatStrip';
import Tooltip from '../components/Tooltip';
import { useBreakpoint } from '../lib/useIsMobile';
import { useTopBarActions } from '../lib/topBarSlot';
import { installMatchMedia } from './helpers/matchMedia';
import { StubAuthProvider } from './helpers/auth';

// SCOPE: this is a *component style contract* suite, NOT a layout/overflow check.
//
// jsdom runs no layout, so it cannot measure `document.documentElement.scrollWidth`
// vs `.clientWidth` — the real "no horizontal overflow at 320/375/390/768" criterion
// from #3–#6. That is now covered for real by the headless-Chromium suite in
// `client/e2e/overflow.e2e.ts` (`npm run test:e2e --prefix client`); see issue #13.
//
// What THIS file still guards (fast, runner-local, and genuinely load-bearing):
//   1. NavBar picks the mobile (hamburger) layout below 768px, so the wide
//      non-wrapping desktop row can never be mounted on a phone in the first place.
//   2. No shell component hard-codes an inline px `width` / `minWidth` wider than
//      the narrowest supported viewport (320px) — the exact class of bug that the
//      pre-fix `searchInputStyle.width = '220px'` belonged to.
//   3. `useBreakpoint` re-derives from a live read on every viewport change.
// None of these prove "the page does not overflow"; that assertion lives in the e2e suite.

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

describe('NavBar picks the right layout per breakpoint (component style contract, not layout)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('at mobile: renders the hamburger and NOT the desktop inline destination list', () => {
    mm = installMatchMedia(375);
    render(
      <StubAuthProvider>
        <MemoryRouter>
          <ClosetLikeSlot />
          <NavBar />
        </MemoryRouter>
      </StubAuthProvider>
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
      <StubAuthProvider>
        <MemoryRouter>
          <ClosetLikeSlot />
          <NavBar />
        </MemoryRouter>
      </StubAuthProvider>
    );

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    ['Closet', 'Capsules', 'Trips', 'Insights'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
  });

  it('carries no inline px width/minWidth wider than the narrowest viewport (320px), menu open or closed', () => {
    mm = installMatchMedia(320);
    const { container } = render(
      <StubAuthProvider>
        <MemoryRouter>
          <ClosetLikeSlot />
          <NavBar />
        </MemoryRouter>
      </StubAuthProvider>
    );

    expect(auditFixedWidths(container)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(auditFixedWidths(container)).toEqual([]);
  });
});

describe('searchInputStyle is fluid, not a fixed 220px (component style contract, not layout)', () => {
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
