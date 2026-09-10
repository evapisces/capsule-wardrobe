export const CHIP_WIDTH = 96;
export const CHIP_HEIGHT = 138; // photo + name + wear-count line
const RECT_PADDING = 16; // px, around the tightest bounding box of member chips
export function itemPixelRect(item, boardWidth, boardHeight) {
    const left = (item.x ?? 0) * boardWidth;
    const top = (item.y ?? 0) * boardHeight;
    return { left, top, right: left + CHIP_WIDTH, bottom: top + CHIP_HEIGHT };
}
/** Tight bounding box (in px) around an outfit's member chips, plus padding. */
export function outfitPixelRect(outfit, items, boardWidth, boardHeight) {
    const members = items.filter((i) => outfit.itemIds.includes(i.id) && i.x != null && i.y != null);
    if (members.length === 0)
        return null;
    const rects = members.map((m) => itemPixelRect(m, boardWidth, boardHeight));
    return {
        left: Math.min(...rects.map((r) => r.left)) - RECT_PADDING,
        top: Math.min(...rects.map((r) => r.top)) - RECT_PADDING - 18, // room for the label on the top edge
        right: Math.max(...rects.map((r) => r.right)) + RECT_PADDING,
        bottom: Math.max(...rects.map((r) => r.bottom)) + RECT_PADDING,
    };
}
export function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
export function pointInRect(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
