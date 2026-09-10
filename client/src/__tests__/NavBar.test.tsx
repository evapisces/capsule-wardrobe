import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NavBar, { searchInputStyle } from '../components/NavBar';
import { installMatchMedia } from './helpers/matchMedia';

const DESTINATIONS = ['Closet', 'Capsules', 'Trips', 'Insights'];

function renderNav() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  );
}

describe('NavBar', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    mm?.restore();
  });

  describe('mobile (< 768px)', () => {
    beforeEach(() => {
      mm = installMatchMedia(375);
    });

    it('renders a single Menu trigger instead of four inline links', () => {
      renderNav();
      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      DESTINATIONS.forEach((label) => {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      });
    });

    it('opens a stacked list of the four destinations and reflects aria-expanded', async () => {
      renderNav();
      const trigger = screen.getByRole('button', { name: 'Menu' });
      await userEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      for (const label of DESTINATIONS) {
        const link = screen.getByRole('link', { name: label });
        expect(link).toBeInTheDocument();
        expect(link).toHaveStyle({ minHeight: '44px' });
      }
    });

    it('closes the menu after a destination is selected', async () => {
      renderNav();
      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
      await userEvent.click(screen.getByRole('link', { name: 'Capsules' }));

      expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('link', { name: 'Capsules' })).not.toBeInTheDocument();
    });

    it('gives the Menu trigger a 44x44 minimum hit area', () => {
      renderNav();
      expect(screen.getByRole('button', { name: 'Menu' })).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });
  });

  describe('tablet and desktop (>= 768px)', () => {
    it('renders four inline links and no hamburger at tablet width', () => {
      mm = installMatchMedia(768);
      renderNav();
      expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
      DESTINATIONS.forEach((label) => {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
      });
    });

    it('renders four inline links and no hamburger at desktop width', () => {
      mm = installMatchMedia(1280);
      renderNav();
      expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
      DESTINATIONS.forEach((label) => {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
      });
    });
  });

  it('searchInputStyle is fluid rather than a fixed 220px', () => {
    expect(searchInputStyle.width).toBe('100%');
    expect(searchInputStyle.maxWidth).toBe('220px');
  });
});
