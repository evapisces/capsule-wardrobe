import { act } from '@testing-library/react';

type ChangeListener = (e: { matches: boolean; media: string }) => void;

interface FakeMql {
  media: string;
  readonly matches: boolean;
  addEventListener: (type: 'change', cb: ChangeListener) => void;
  removeEventListener: (type: 'change', cb: ChangeListener) => void;
  addListener: (cb: ChangeListener) => void;
  removeListener: (cb: ChangeListener) => void;
  dispatchEvent: () => boolean;
  _emit: () => void;
}

/**
 * Installs a controllable `window.matchMedia` backed by a mutable viewport
 * width. `setWidth` re-evaluates every live MediaQueryList and fires its
 * `change` listeners, wrapped in `act` so React re-renders synchronously.
 */
export function installMatchMedia(initialWidth: number) {
  const original = window.matchMedia;
  let width = initialWidth;
  const lists = new Set<FakeMql>();

  const evaluate = (query: string): boolean => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    if (min && width < Number(min[1])) return false;
    if (max && width > Number(max[1])) return false;
    return true;
  };

  window.matchMedia = ((query: string) => {
    const listeners = new Set<ChangeListener>();
    const mql: FakeMql = {
      media: query,
      get matches() {
        return evaluate(query);
      },
      addEventListener: (_type, cb) => listeners.add(cb),
      removeEventListener: (_type, cb) => listeners.delete(cb),
      addListener: (cb) => listeners.add(cb),
      removeListener: (cb) => listeners.delete(cb),
      dispatchEvent: () => true,
      _emit: () => listeners.forEach((cb) => cb({ matches: evaluate(query), media: query })),
    };
    lists.add(mql);
    return mql as unknown as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    setWidth(next: number) {
      act(() => {
        width = next;
        lists.forEach((m) => m._emit());
      });
    },
    restore() {
      window.matchMedia = original;
    },
  };
}
