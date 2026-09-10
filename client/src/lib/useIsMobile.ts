import { useEffect, useState } from 'react';

/**
 * Project-wide responsive breakpoints, defined once here:
 *   mobile  `< 768px`
 *   tablet  `768px – 1023px`
 *   desktop `>= 1024px`
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

function readBreakpoint(): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // SSR / non-browser: assume the roomiest layout.
    return 'desktop';
  }
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'mobile';
}

/**
 * Returns the current breakpoint and re-renders when the active media query
 * changes. Uses `MediaQueryList.addEventListener('change', ...)` rather than a
 * `resize` listener so we only wake up on an actual breakpoint crossing.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(readBreakpoint);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const lists = [window.matchMedia(TABLET_QUERY), window.matchMedia(DESKTOP_QUERY)];
    const onChange = () => setBreakpoint(readBreakpoint());

    // Sync once in case the viewport changed between first render and effect.
    onChange();
    lists.forEach((list) => list.addEventListener('change', onChange));
    return () => lists.forEach((list) => list.removeEventListener('change', onChange));
  }, []);

  return breakpoint;
}

/** Backwards-compatible helper: true below the 768px mobile breakpoint. */
export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}
