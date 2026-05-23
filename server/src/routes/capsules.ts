import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1';

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const capsules = await prisma.capsule.findMany({ where: { userId: USER_ID } });
    res.json(capsules);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name, description: description ?? null },
    });
    res.status(201).json(capsule);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await prisma.capsule.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            closetItem: {
              include: { _count: { select: { capsules: true } } },
            },
          },
        },
      },
    });
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const result = {
      ...capsule,
      items: capsule.items.map(({ closetItem }) => {
        const { _count, ...item } = closetItem;
        return { ...item, capsuleCount: _count.capsules };
      }),
    };
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await prisma.capsule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(capsule);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsule.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsuleItem.create({
      data: { capsuleId: req.params.id, closetItemId: req.params.itemId },
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsuleItem.delete({
      where: {
        capsuleId_closetItemId: {
          capsuleId: req.params.id,
          closetItemId: req.params.itemId,
        },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
