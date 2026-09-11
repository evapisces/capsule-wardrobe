/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { SESSION_COOKIE_NAME } from '../lib/session';

// Resolves the session cookie into `req.user`, or responds 401. Applied to
// every resource router in app.ts.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
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

    req.user = { id: session.user.id, email: session.user.email };
    next();
  } catch (err) {
    next(err);
  }
}
