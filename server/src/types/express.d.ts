// Augments Express's Request type so `requireAuth` can attach the
// authenticated user's identity for downstream route handlers.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
