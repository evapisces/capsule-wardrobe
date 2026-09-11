import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/** A random, unguessable value used to defend the OAuth redirect against CSRF. */
export function generateState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an OAuth `code` for an access token, then fetches the Google
 * profile for that token. Split into two fetches (not stubbed together) so
 * tests can mock `global.fetch` and assert both calls happen.
 */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed with status ${tokenRes.status}`);
  }
  const tokenBody = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Google profile fetch failed with status ${profileRes.status}`);
  }
  const profile = (await profileRes.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    picture: profile.picture ?? null,
  };
}
