import type { BoardItem, BoardOutfit } from '@capsule/shared';

export const CHIP_WIDTH = 96;
export const CHIP_HEIGHT = 138; // photo + name + wear-count line
const RECT_PADDING = 16; // px, around the tightest bounding box of member chips

/** Gap left between chips when auto-placing a freshly added garment. */
export const PLACEMENT_GAP = 12;
/**
 * Board dimensions assumed when a real board element isn't mounted. The
 * mobile/tablet list layout never renders the freeform canvas, but items added
 * there still need sensible coordinates for when the capsule is later opened on
 * desktop. Mirrors the desktop canvas' natural size.
 */
export const BOARD_FALLBACK_WIDTH = 900;
export const BOARD_FALLBACK_HEIGHT = 452;

export interface PixelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function itemPixelRect(item: BoardItem, boardWidth: number, boardHeight: number): PixelRect {
  const left = (item.x ?? 0) * boardWidth;
  const top = (item.y ?? 0) * boardHeight;
  return { left, top, right: left + CHIP_WIDTH, bottom: top + CHIP_HEIGHT };
}

/** Tight bounding box (in px) around an outfit's member chips, plus padding. */
export function outfitPixelRect(
  outfit: BoardOutfit,
  items: BoardItem[],
  boardWidth: number,
  boardHeight: number
): PixelRect | null {
  const members = items.filter((i) => outfit.itemIds.includes(i.id) && i.x != null && i.y != null);
  if (members.length === 0) return null;

  const rects = members.map((m) => itemPixelRect(m, boardWidth, boardHeight));
  return {
    left: Math.min(...rects.map((r) => r.left)) - RECT_PADDING,
    top: Math.min(...rects.map((r) => r.top)) - RECT_PADDING - 18, // room for the label on the top edge
    right: Math.max(...rects.map((r) => r.right)) + RECT_PADDING,
    bottom: Math.max(...rects.map((r) => r.bottom)) + RECT_PADDING,
  };
}

export function rectsOverlap(a: PixelRect, b: PixelRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function pointInRect(x: number, y: number, r: PixelRect): boolean {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * Deterministic, non-overlapping placement for a freshly added chip. Walks a
 * grid left-to-right, top-to-bottom whose cells are the chip footprint plus a
 * gap, so N sequential placements (index 0..N-1) yield N chip rects that never
 * overlap per `rectsOverlap`. Rows keep going below the board rather than
 * wrapping back onto earlier chips. Returns normalised (0..1-ish) coordinates.
 */
export function nextChipPlacement(
  index: number,
  boardWidth: number = BOARD_FALLBACK_WIDTH,
  boardHeight: number = BOARD_FALLBACK_HEIGHT
): { x: number; y: number } {
  const safeWidth = boardWidth > 0 ? boardWidth : BOARD_FALLBACK_WIDTH;
  const safeHeight = boardHeight > 0 ? boardHeight : BOARD_FALLBACK_HEIGHT;
  const stepX = CHIP_WIDTH + PLACEMENT_GAP;
  const stepY = CHIP_HEIGHT + PLACEMENT_GAP;
  const columns = Math.max(1, Math.floor(safeWidth / stepX));
  const slot = Math.max(0, Math.floor(index));
  const col = slot % columns;
  const row = Math.floor(slot / columns);
  return {
    x: (col * stepX) / safeWidth,
    y: (row * stepY) / safeHeight,
  };
}

/**
 * Non-overlapping placement for a freshly added chip that is robust to prior
 * removals. Walks the same deterministic grid as `nextChipPlacement`, but skips
 * any grid slot whose chip rect would overlap a chip that is already on the
 * board — so it reuses a hole left by a removed chip instead of colliding with a
 * later one. Deletion-free sequences behave exactly like `nextChipPlacement`.
 */
export function nextOpenChipPlacement(
  items: BoardItem[],
  boardWidth: number = BOARD_FALLBACK_WIDTH,
  boardHeight: number = BOARD_FALLBACK_HEIGHT
): { x: number; y: number } {
  const safeWidth = boardWidth > 0 ? boardWidth : BOARD_FALLBACK_WIDTH;
  const safeHeight = boardHeight > 0 ? boardHeight : BOARD_FALLBACK_HEIGHT;
  const placed = items
    .filter((i) => i.x != null && i.y != null)
    .map((i) => itemPixelRect(i, safeWidth, safeHeight));

  // A freely-dragged chip can straddle a few grid slots, so bound the walk
  // generously; every extra slot past `placed.length` that is free is a valid
  // answer, so this always terminates on an open slot in practice.
  const limit = placed.length * 4 + 4;
  for (let slot = 0; slot <= limit; slot++) {
    const { x, y } = nextChipPlacement(slot, safeWidth, safeHeight);
    const candidate = itemPixelRect({ x, y } as BoardItem, safeWidth, safeHeight);
    if (!placed.some((r) => rectsOverlap(candidate, r))) {
      return { x, y };
    }
  }
  return nextChipPlacement(placed.length, safeWidth, safeHeight);
}
