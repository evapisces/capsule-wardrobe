import { render, screen, fireEvent } from '@testing-library/react';
import Tooltip from '../components/Tooltip';
import { installMatchMedia } from './helpers/matchMedia';

function renderTooltip(content = 'Cost per wear is price paid divided by times worn.') {
  render(
    <Tooltip content={content}>
      <button type="button">info</button>
    </Tooltip>
  );
  return screen.getByText('info').parentElement as HTMLElement;
}

describe('Tooltip', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    mm?.restore();
  });

  it('opens on hover and shows the content bubble', () => {
    mm = installMatchMedia(1280);
    const trigger = renderTooltip('Hello world');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('dismisses on window scroll', () => {
    mm = installMatchMedia(1280);
    const trigger = renderTooltip('Scroll me away');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Scroll me away')).toBeInTheDocument();

    fireEvent.scroll(window);
    expect(screen.queryByText('Scroll me away')).not.toBeInTheDocument();
  });

  it('dismisses on window resize', () => {
    mm = installMatchMedia(1280);
    const trigger = renderTooltip('Resize me away');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Resize me away')).toBeInTheDocument();

    fireEvent(window, new Event('resize'));
    expect(screen.queryByText('Resize me away')).not.toBeInTheDocument();
  });

  it('clamps maxWidth to the viewport edge at the mobile breakpoint', () => {
    mm = installMatchMedia(375);
    const trigger = renderTooltip('Clamped on mobile');
    fireEvent.mouseEnter(trigger);
    const bubble = screen.getByText('Clamped on mobile');
    expect(bubble).toHaveStyle({ maxWidth: 'min(220px, calc(100vw - 16px))' });
  });

  it('uses a plain 220px maxWidth above the mobile breakpoint', () => {
    mm = installMatchMedia(1280);
    const trigger = renderTooltip('Wide screen');
    fireEvent.mouseEnter(trigger);
    const bubble = screen.getByText('Wide screen');
    expect(bubble).toHaveStyle({ maxWidth: '220px' });
  });
});
