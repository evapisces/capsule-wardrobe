import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@capsule/shared';
import { ApiError, getMe, logout as apiLogout, setUnauthorizedHandler } from './api';

/** Query key backing the current-user lookup; exported so a global 401 handler
 * (or a test) can reach into the cache and flip the app to anonymous. */
export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** `null` is a legitimate, successful resolution here: it means "we asked, and the
 * server said 401", i.e. the visitor is anonymous. Any other error still throws. */
async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await getMe();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: Infinity,
  });

  // Any API call (not just /auth/me) that comes back 401 should drop the app
  // to the anonymous state immediately, without waiting for a refetch.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData<AuthUser | null>(AUTH_QUERY_KEY, null);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const logout = useCallback(async () => {
    await apiLogout();
    // Drop every other cached response so the next sign-in never flashes a
    // previous user's data, but do it via `removeQueries` (not `clear`) and set
    // the auth entry back to "known anonymous" afterwards — `clear()` tears
    // down the underlying query for every key including this one, which can
    // leave the still-mounted `useQuery` observer here without a live query.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY[0] });
    queryClient.setQueryData<AuthUser | null>(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  const status: AuthStatus = isLoading ? 'loading' : isError || data == null ? 'anonymous' : 'authenticated';

  const value = useMemo<AuthContextValue>(
    () => ({ user: data ?? null, status, logout }),
    [data, status, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
