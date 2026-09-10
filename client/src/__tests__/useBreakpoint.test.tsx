import { render, screen } from '@testing-library/react';
import { useBreakpoint, useIsMobile } from '../lib/useIsMobile';
import { installMatchMedia } from './helpers/matchMedia';

function Probe() {
  return <div data-testid="bp">{useBreakpoint()}</div>;
}

function MobileProbe() {
  return <div data-testid="im">{String(useIsMobile())}</div>;
}

describe('useBreakpoint', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    mm?.restore();
  });

  it.each([
    [375, 'mobile'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
  ])('returns %s -> "%s"', (px, expected) => {
    mm = installMatchMedia(px as number);
    render(<Probe />);
    expect(screen.getByTestId('bp')).toHaveTextContent(expected as string);
  });

  it('re-renders when the matching media query changes', () => {
    mm = installMatchMedia(1024);
    render(<Probe />);
    expect(screen.getByTestId('bp')).toHaveTextContent('desktop');

    mm.setWidth(375);
    expect(screen.getByTestId('bp')).toHaveTextContent('mobile');

    mm.setWidth(800);
    expect(screen.getByTestId('bp')).toHaveTextContent('tablet');
  });

  it('useIsMobile is retained and mirrors useBreakpoint() === "mobile"', () => {
    mm = installMatchMedia(375);
    render(<MobileProbe />);
    expect(screen.getByTestId('im')).toHaveTextContent('true');

    mm.setWidth(1024);
    expect(screen.getByTestId('im')).toHaveTextContent('false');
  });
});
