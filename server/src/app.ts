import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Routes wired in Task 9
  app.use(errorHandler);

  return app;
}
