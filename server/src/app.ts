import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler';
import closetsRouter from './routes/closets';
import itemsRouter from './routes/items';
import capsulesRouter from './routes/capsules';
import tripsRouter from './routes/trips';
import uploadRouter from './routes/upload';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/closets', closetsRouter);
  app.use('/api', itemsRouter);
  app.use('/api/capsules', capsulesRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/upload', uploadRouter);

  app.use(errorHandler);

  return app;
}
