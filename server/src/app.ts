import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/requireAuth';
import authRouter from './routes/auth';
import closetsRouter from './routes/closets';
import itemsRouter from './routes/items';
import capsulesRouter from './routes/capsules';
import boardRouter, { outfitsRouter } from './routes/board';
import tripsRouter from './routes/trips';
import uploadRouter from './routes/upload';

export function createApp() {
  const app = express();

  app.use(
    cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/closets', requireAuth, closetsRouter);
  app.use('/api', requireAuth, itemsRouter);
  app.use('/api/capsules', requireAuth, capsulesRouter);
  app.use('/api/capsules', requireAuth, boardRouter);
  app.use('/api/outfits', requireAuth, outfitsRouter);
  app.use('/api/trips', requireAuth, tripsRouter);
  app.use('/api/upload', requireAuth, uploadRouter);

  app.use(errorHandler);

  return app;
}
