import '@testing-library/jest-dom';

// jsdom has no matchMedia. Default every suite to the desktop breakpoint so
// components that call useBreakpoint render their wide layout unless a test
// installs its own controllable stub.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: /min-width:\s*1024px/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
