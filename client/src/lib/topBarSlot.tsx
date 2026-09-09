import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

// A tiny external store, not React context: updating the top bar's content
// must not re-render the page that owns it, or a page whose content differs
// by reference every render (any inline JSX) re-triggers its own effect on
// every commit — an infinite render loop. Only NavBar (via
// useTopBarSlotContent) re-renders when this changes.
let content: ReactNode = null;
const listeners = new Set<() => void>();

function setTopBarContent(next: ReactNode) {
  content = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Kept as a plain passthrough for call-site compatibility; no provider state needed. */
export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Reads whatever the current page has registered for the top bar's right side. */
export function useTopBarSlotContent(): ReactNode {
  return useSyncExternalStore(subscribe, () => content);
}

/**
 * Registers `content` as the top bar's right-side contextual area (search
 * field + primary action) for as long as the calling page is mounted.
 */
export function useTopBarActions(node: ReactNode) {
  useEffect(() => {
    setTopBarContent(node);
    return () => setTopBarContent(null);
  });
}
