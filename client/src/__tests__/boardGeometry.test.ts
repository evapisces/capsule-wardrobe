import { describe, it, expect } from 'vitest';
import {
  nextChipPlacement,
  nextOpenChipPlacement,
  itemPixelRect,
  rectsOverlap,
  BOARD_FALLBACK_WIDTH,
  BOARD_FALLBACK_HEIGHT,
} from '../lib/boardGeometry';
import type { BoardItem } from '@capsule/shared';

const asItem = (x: number, y: number): BoardItem => ({
  id: `${x}-${y}`,
  name: 'x',
  photoUrl: null,
  climate: null,
  wearCount: 0,
  onBoard: true,
  x,
  y,
  outfitId: null,
  offClimate: false,
});

describe('nextChipPlacement', () => {
  it('produces N non-overlapping chip rects for N sequential placements', () => {
    const width = BOARD_FALLBACK_WIDTH;
    const height = BOARD_FALLBACK_HEIGHT;
    const N = 25;

    const rects = Array.from({ length: N }, (_, i) => {
      const { x, y } = nextChipPlacement(i, width, height);
      return itemPixelRect(asItem(x, y), width, height);
    });

    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        expect(rectsOverlap(rects[a], rects[b])).toBe(false);
      }
    }
  });

  it('is deterministic for the same inputs', () => {
    expect(nextChipPlacement(7)).toEqual(nextChipPlacement(7));
    expect(nextChipPlacement(0)).toEqual({ x: 0, y: 0 });
  });

  it('does not hardcode the old 0.1 / 0.1 coordinate', () => {
    for (let i = 0; i < 10; i++) {
      const p = nextChipPlacement(i);
      expect(p).not.toEqual({ x: 0.1, y: 0.1 });
    }
  });

  it('walks left-to-right then wraps to a new row', () => {
    const first = nextChipPlacement(0);
    const second = nextChipPlacement(1);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBe(first.y);

    // Far enough along, y must have advanced past row 0.
    const later = nextChipPlacement(20);
    expect(later.y).toBeGreaterThan(0);
  });

  it('falls back to sane board dimensions when passed zero', () => {
    expect(nextChipPlacement(3, 0, 0)).toEqual(nextChipPlacement(3));
  });
});

describe('nextOpenChipPlacement', () => {
  const width = BOARD_FALLBACK_WIDTH;
  const height = BOARD_FALLBACK_HEIGHT;

  const place = (items: BoardItem[]): BoardItem[] => {
    const { x, y } = nextOpenChipPlacement(items, width, height);
    return [...items, asItem(x, y)];
  };

  const assertNoOverlap = (items: BoardItem[]) => {
    const rects = items.map((i) => itemPixelRect(i, width, height));
    for (let a = 0; a < rects.length; a++) {
      for (let b = a + 1; b < rects.length; b++) {
        expect(rectsOverlap(rects[a], rects[b])).toBe(false);
      }
    }
  };

  it('matches nextChipPlacement for a deletion-free sequence', () => {
    let items: BoardItem[] = [];
    for (let i = 0; i < 12; i++) {
      const open = nextOpenChipPlacement(items, width, height);
      expect(open).toEqual(nextChipPlacement(i, width, height));
      items = [...items, asItem(open.x, open.y)];
    }
  });

  it('reuses a hole left by a removed chip instead of colliding', () => {
    // Fill 6 slots, then remove slots 1 and 3.
    let items: BoardItem[] = [];
    for (let i = 0; i < 6; i++) items = place(items);
    const removed1 = items[1];
    const removed3 = items[3];
    items = items.filter((i) => i !== removed1 && i !== removed3);

    // Next placement should land back in the lowest freed slot (slot 1).
    const first = nextOpenChipPlacement(items, width, height);
    expect(first).toEqual(nextChipPlacement(1, width, height));
    items = [...items, asItem(first.x, first.y)];
    assertNoOverlap(items);

    const second = nextOpenChipPlacement(items, width, height);
    expect(second).toEqual(nextChipPlacement(3, width, height));
    items = [...items, asItem(second.x, second.y)];
    assertNoOverlap(items);
  });

  it('keeps every rect non-overlapping through an interleaved add/remove sequence', () => {
    let items: BoardItem[] = [];
    // add 8
    for (let i = 0; i < 8; i++) items = place(items);
    assertNoOverlap(items);
    // remove a scattered few
    items = items.filter((_, idx) => ![0, 2, 5, 6].includes(idx));
    assertNoOverlap(items);
    // add 10 more, checking non-overlap after each insert
    for (let i = 0; i < 10; i++) {
      items = place(items);
      assertNoOverlap(items);
    }
  });

  it('avoids a freely-dragged chip that is not on a grid slot', () => {
    const dragged = asItem(0.05, 0.04); // arbitrary desktop drop, overlaps slot 0
    const next = nextOpenChipPlacement([dragged], width, height);
    const nextRect = itemPixelRect(asItem(next.x, next.y), width, height);
    expect(rectsOverlap(nextRect, itemPixelRect(dragged, width, height))).toBe(false);
  });
});
