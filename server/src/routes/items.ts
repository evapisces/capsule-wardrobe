import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { ItemCategory, Climate } from '@capsule/shared';

const router = Router();

// GET /api/closets/:id/items — list items with optional filters + capsuleCount
router.get('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, color, climate } = req.query as {
      category?: ItemCategory;
      color?: string;
      climate?: Climate;
    };

    const items = await prisma.closetItem.findMany({
      where: {
        closetId: req.params.id,
        ...(category && { category }),
        ...(color && { color: { contains: color, mode: 'insensitive' } }),
        ...(climate && { climate }),
      },
      include: {
        _count: { select: { capsules: true } },
      },
    });

    const result = items.map(({ _count, ...item }) => ({
      ...item,
      capsuleCount: _count.capsules,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/closets/:id/items
router.post('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.create({
      data: { closetId: req.params.id, ...req.body },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { capsules: true } } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { _count, ...rest } = item;
    res.json({ ...rest, capsuleCount: _count.capsules });
  } catch (err) {
    next(err);
  }
});

// PUT /api/items/:id
router.put('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id
router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.closetItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
