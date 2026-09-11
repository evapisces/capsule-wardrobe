import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { generateState } from '../lib/googleOAuth';
import { SESSION_COOKIE_NAME } from '../lib/session';

jest.mock('../lib/googleOAuth', () => {
  const actual = jest.requireActual('../lib/googleOAuth');
  return {
    ...actual,
    exchangeCodeForProfile: jest.fn(),
  };
});

import { exchangeCodeForProfile } from '../lib/googleOAuth';

const mockedExchange = exchangeCodeForProfile as jest.MockedFunction<typeof exchangeCodeForProfile>;

const app = createApp();
const TEST_EMAIL = 'auth-test@capsule.local';

function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const match = raw?.find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(';')[0].split('=')[1];
}

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  mockedExchange.mockReset();
});

describe('GET /api/auth/google', () => {
  it('redirects to the Google consent URL and sets a state cookie', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
    expect(res.headers.location).toContain('scope=openid+email+profile');
    expect(getCookie(res, 'capsule_oauth_state')).toBeTruthy();
  });
});

describe('GET /api/auth/google/callback', () => {
  it('rejects a missing state', async () => {
    const res = await request(app).get('/api/auth/google/callback').query({ code: 'abc' });
    expect(res.status).toBe(400);
    expect(mockedExchange).not.toHaveBeenCalled();
  });

  it('rejects a state that does not match the cookie', async () => {
    const stateRes = await request(app).get('/api/auth/google');
    const stateCookie = getCookie(stateRes, 'capsule_oauth_state')!;

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`capsule_oauth_state=${stateCookie}`])
      .query({ code: 'abc', state: 'not-the-right-state' });

    expect(res.status).toBe(400);
    expect(mockedExchange).not.toHaveBeenCalled();

    const sessionCount = await prisma.session.count();
    expect(sessionCount).toBe(0);
  });

  it('exchanges the code, creates a user + session, and sets the session cookie', async () => {
    const state = generateState();
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-123',
      email: TEST_EMAIL,
      name: 'Auth Test',
      picture: 'https://example.com/avatar.png',
    });

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`capsule_oauth_state=${state}`])
      .query({ code: 'valid-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');
    expect(mockedExchange).toHaveBeenCalledWith('valid-code');

    const sessionCookie = getCookie(res, SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeTruthy();

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).toBeTruthy();
    expect(user!.googleId).toBe('google-sub-123');
    expect(user!.name).toBe('Auth Test');

    const sessions = await prisma.session.findMany({ where: { userId: user!.id } });
    expect(sessions).toHaveLength(1);
  });

  it('links an existing user matched by email instead of creating a new one', async () => {
    const existing = await prisma.user.create({ data: { email: TEST_EMAIL } });

    const state = generateState();
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-456',
      email: TEST_EMAIL,
      name: 'Existing User',
      picture: null,
    });

    await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`capsule_oauth_state=${state}`])
      .query({ code: 'valid-code', state });

    const usersWithEmail = await prisma.user.findMany({ where: { email: TEST_EMAIL } });
    expect(usersWithEmail).toHaveLength(1);
    expect(usersWithEmail[0].id).toBe(existing.id);
    expect(usersWithEmail[0].googleId).toBe('google-sub-456');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when there is no session cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 401 for an unknown session cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=nonexistent-session`]);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired session', async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${session.id}`]);
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user for a valid session', async () => {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, name: 'Session User', avatarUrl: 'https://example.com/a.png' },
    });
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${session.id}`]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      email: TEST_EMAIL,
      name: 'Session User',
      avatarUrl: 'https://example.com/a.png',
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('deletes the session and a subsequent /me returns 401', async () => {
    const user = await prisma.user.create({ data: { email: TEST_EMAIL } });
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    });

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${session.id}`]);
    expect(logoutRes.status).toBe(204);

    const stored = await prisma.session.findUnique({ where: { id: session.id } });
    expect(stored).toBeNull();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${session.id}`]);
    expect(meRes.status).toBe(401);
  });
});
