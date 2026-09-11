import { Router, Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@capsule/shared';
import prisma from '../lib/prisma';
import { buildGoogleAuthUrl, exchangeCodeForProfile, generateState } from '../lib/googleOAuth';
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  oauthStateCookieOptions,
  sessionCookieOptions,
} from '../lib/session';

const router = Router();

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): AuthUser {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

// GET /api/auth/google — kick off the OAuth dance by redirecting to Google's
// consent screen with a random, cookie-backed `state` value.
router.get('/google', (_req: Request, res: Response) => {
  const state = generateState();
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, oauthStateCookieOptions);
  res.redirect(buildGoogleAuthUrl(state));
});

// GET /api/auth/google/callback — exchange the code, upsert the user
// (matching an existing row by email so a seeded account can adopt a
// Google identity), start a session, and send the browser back to the app.
router.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE_NAME] as string | undefined;

    res.clearCookie(OAUTH_STATE_COOKIE_NAME);

    if (!code || !state || !cookieState || state !== cookieState) {
      return res.status(400).json({ error: 'Invalid or missing OAuth state' });
    }

    const profile = await exchangeCodeForProfile(code);

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: profile.sub,
            name: profile.name ?? existing.name,
            avatarUrl: profile.picture ?? existing.avatarUrl,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.sub,
            name: profile.name,
            avatarUrl: profile.picture,
          },
        });
      }
    }

    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });

    res.cookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions);
    res.redirect(process.env.CLIENT_URL ?? 'http://localhost:5173');
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — the currently authenticated user, or 401.
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json(toAuthUser(session.user));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — invalidate the session and clear the cookie.
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (sessionId) {
      await prisma.session.deleteMany({ where: { id: sessionId } });
    }
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
