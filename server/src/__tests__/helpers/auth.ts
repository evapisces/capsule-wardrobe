import prisma from '../../lib/prisma';
import { SESSION_COOKIE_NAME } from '../../lib/session';

/**
 * Creates (or reuses) a user and a live session for it, returning a
 * `Cookie` header value tests can pass to `.set('Cookie', ...)` so requests
 * authenticate as that user through the real `requireAuth` middleware.
 */
export async function loginAs(userId: string, email = `${userId}@capsule.local`): Promise<string> {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email },
  });
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return `${SESSION_COOKIE_NAME}=${session.id}`;
}
