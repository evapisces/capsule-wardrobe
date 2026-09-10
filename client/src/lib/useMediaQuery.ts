import { useSyncExternalStore } from 'react';

/**
 * Generic media-query hook for the handful of sub-breakpoint thresholds that
 * don't map onto the project's mobile/tablet/desktop contract (e.g. the 400px
 * and 480px reflow points on the Trips screen). For the standard breakpoints,
 * use `useBreakpoint()` from `./useIsMobile` instead.
 */
export function useMediaQuery(query: string): boolean {
  const canMatch = typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  return useSyncExternalStore(
    (onStoreChange) => {
      if (!canMatch) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => (canMatch ? window.matchMedia(query).matches : false),
    () => false,
  );
}
