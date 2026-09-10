import { useSyncExternalStore } from 'react';
const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_QUERY = '(min-width: 1024px)';
const QUERIES = [MOBILE_QUERY, TABLET_QUERY, DESKTOP_QUERY];
function canMatchMedia() {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}
function readBreakpoint() {
    if (!canMatchMedia()) {
        // SSR / non-browser: assume the roomiest layout.
        return 'desktop';
    }
    if (window.matchMedia(DESKTOP_QUERY).matches)
        return 'desktop';
    if (window.matchMedia(TABLET_QUERY).matches)
        return 'tablet';
    return 'mobile';
}
/**
 * Subscribes to every breakpoint boundary by listening on all three media
 * queries' `change` events. Combined with `useSyncExternalStore` re-deriving
 * the snapshot from a live `readBreakpoint()` read, this covers every viewport
 * transition without a `resize` listener.
 */
function subscribe(onStoreChange) {
    if (!canMatchMedia())
        return () => { };
    const lists = QUERIES.map((q) => window.matchMedia(q));
    lists.forEach((list) => list.addEventListener('change', onStoreChange));
    return () => {
        lists.forEach((list) => list.removeEventListener('change', onStoreChange));
    };
}
function getServerSnapshot() {
    return 'desktop';
}
/**
 * Returns the current breakpoint and re-renders whenever the viewport crosses
 * a breakpoint boundary. Implemented with `useSyncExternalStore` so the value
 * is always re-derived from a live `readBreakpoint()` read.
 */
export function useBreakpoint() {
    return useSyncExternalStore(subscribe, readBreakpoint, getServerSnapshot);
}
/** Backwards-compatible helper: true below the 768px mobile breakpoint. */
export function useIsMobile() {
    return useBreakpoint() === 'mobile';
}
