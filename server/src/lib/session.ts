export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'capsule_session';
export const OAUTH_STATE_COOKIE_NAME = 'capsule_oauth_state';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// The client and server are deployed on different domains (e.g. a Pages
// site calling a DigitalOcean API), so the session cookie must be sent on
// cross-site fetches. That requires SameSite=None, which browsers only
// honor alongside Secure — fine in production (HTTPS), but Secure cookies
// don't get set over plain HTTP in local dev, so fall back to Lax there.
const isProduction = process.env.NODE_ENV === 'production';

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: SESSION_TTL_MS,
};

// This one only round-trips within the server's own domain (set on
// /google, read back on /google/callback after Google redirects the
// browser there), so it stays same-site and doesn't need SameSite=None.
export const oauthStateCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: OAUTH_STATE_TTL_MS,
};
