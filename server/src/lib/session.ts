export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'capsule_session';
export const OAUTH_STATE_COOKIE_NAME = 'capsule_oauth_state';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_MS,
};

export const oauthStateCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: OAUTH_STATE_TTL_MS,
};
