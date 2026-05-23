import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1'; // hardcoded for v1; replace with req.user.id when auth added

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const closets = await prisma.closet.findMany({ where: { userId: USER_ID } });
    res.json(closets);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name, description: description ?? null },
    });
    res.status(201).json(closet);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await prisma.closet.findUnique({ where: { id: req.params.id } });
    if (!closet) return res.status(404).json({ error: 'Closet not found' });
    res.json(closet);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await prisma.closet.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(closet);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.closet.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
