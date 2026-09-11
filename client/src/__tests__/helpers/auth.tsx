import type { ReactNode } from 'react';
import type { AuthUser } from '@capsule/shared';
import { AuthContext, type AuthContextValue, type AuthStatus } from '../../lib/auth';

export const TEST_USER: AuthUser = {
  id: 'user_1',
  email: 'wardrobe.owner@example.com',
  name: 'Wardrobe Owner',
  avatarUrl: null,
};

/**
 * Test-only auth context provider: sets `AuthContext` directly to a fixed value
 * instead of going through `AuthProvider`'s react-query fetch, so page-level
 * tests that only care about the authenticated app shell don't also have to
 * mock `getMe`.
 */
export function StubAuthProvider({
  children,
  status = 'authenticated',
  user = TEST_USER,
  logout = async () => {},
}: {
  children: ReactNode;
  status?: AuthStatus;
  user?: AuthUser | null;
  logout?: () => Promise<void>;
}) {
  const value: AuthContextValue = { user: status === 'authenticated' ? user : null, status, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
