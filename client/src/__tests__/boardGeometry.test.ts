import { describe, it, expect } from 'vitest';
import {
  nextChipPlacement,
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
