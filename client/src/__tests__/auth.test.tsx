import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser, Closet } from '@capsule/shared';
import App from '../App';
import { AuthProvider } from '../lib/auth';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const USER: AuthUser = {
  id: 'user_1',
  email: 'wardrobe.owner@example.com',
  name: 'Wardrobe Owner',
  avatarUrl: null,
};

const CLOSET: Closet = {
  id: 'closet_1',
  userId: 'user_1',
  name: 'Your closet',
  description: null,
  createdAt: new Date().toISOString(),
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Mocks `fetch` (used by the real `client/src/lib/api.ts`) so the tests exercise
 * the actual request/401 handling code, not a stand-in for it. `routes` maps a
 * path *after* `/api` to either a fixed response or a function computing one. */
function stubFetch(routes: Record<string, unknown | ((path: string) => unknown)>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const path = url.replace(/^.*\/api/, '');
      const entry = path in routes ? routes[path] : undefined;
      const resolved = typeof entry === 'function' ? (entry as (p: string) => unknown)(path) : entry;

      // Anything not explicitly stubbed is a harmless empty collection — these
      // tests only care about the auth gate, not any particular page's data.
      if (resolved === undefined) return jsonResponse(200, []);
      if (resolved && typeof resolved === 'object' && '__status' in (resolved as object)) {
        const { __status, ...body } = resolved as { __status: number; [k: string]: unknown };
        return jsonResponse(__status, body);
      }
      return jsonResponse(200, resolved);
    })
  );
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('client auth gate (issue #21)', () => {
  it('(a) anonymous: a 401 from GET /api/auth/me renders the login screen, not the closet page', async () => {
    stubFetch({ '/auth/me': { __status: 401, error: 'Not authenticated' } });

    renderApp();

    expect(await screen.findByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.queryByText('Your closet')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Closet' })).not.toBeInTheDocument();
  });

  it("(b) authenticated: renders the app shell and the user's name in the nav", async () => {
    stubFetch({
      '/auth/me': USER,
      '/closets': [CLOSET],
      '/capsules': [],
    });

    renderApp();

    expect(await screen.findByText('Wardrobe Owner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Closet' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign in with google/i })).not.toBeInTheDocument();
  });

  it('(c) clicking "Sign in with Google" targets the /api/auth/google URL', async () => {
    stubFetch({ '/auth/me': { __status: 401, error: 'Not authenticated' } });

    renderApp();

    const link = await screen.findByRole('link', { name: /sign in with google/i });
    expect(link).toHaveAttribute('href', '/api/auth/google');
  });

  it('(d) signing out calls the logout endpoint and returns to the login screen', async () => {
    const fetchRoutes: Record<string, unknown> = {
      '/auth/me': USER,
      '/closets': [CLOSET],
      '/capsules': [],
    };
    stubFetch(fetchRoutes);

    renderApp();

    await screen.findByText('Wardrobe Owner');

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('(e) a 401 from a data request drops the app back to the login screen', async () => {
    stubFetch({
      '/auth/me': USER,
      '/closets': { __status: 401, error: 'Not authenticated' },
      '/capsules': [],
    });

    renderApp();

    // Shell renders first, authenticated...
    await screen.findByText('Wardrobe Owner');

    // ...then the 401 from a page-level fetch flips it back to anonymous.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
    });
  });
});
