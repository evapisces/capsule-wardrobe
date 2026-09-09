import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { ItemCategory, Climate } from '@capsule/shared';
import {
  getWearStatsForItems,
  costPerWear,
  isDormant,
  logManualItemWear,
  undoManualItemWear,
} from '../lib/wearStats';

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

    const wearStats = await getWearStatsForItems(items.map((i) => i.id));

    const result = items.map(({ _count, ...item }) => {
      const stats = wearStats.get(item.id) ?? { wearCount: 0, lastWornAt: null };
      return {
        ...item,
        capsuleCount: _count.capsules,
        wearCount: stats.wearCount,
        lastWornAt: stats.lastWornAt,
        costPerWear: costPerWear(item.pricePaid, stats.wearCount),
        dormant: isDormant(stats.lastWornAt),
      };
    });

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
    const stats = (await getWearStatsForItems([item.id])).get(item.id)!;
    res.json({
      ...rest,
      capsuleCount: _count.capsules,
      wearCount: stats.wearCount,
      lastWornAt: stats.lastWornAt,
      costPerWear: costPerWear(item.pricePaid, stats.wearCount),
      dormant: isDormant(stats.lastWornAt),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id/wear-history — chronological wear events for an item
router.get('/items/:id/wear-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.wearEventItem.findMany({
      where: { closetItemId: req.params.id },
      include: {
        wearEvent: {
          include: { outfit: { select: { id: true, name: true } } },
        },
      },
      orderBy: { wearEvent: { date: 'desc' } },
    });

    res.json(
      rows.map(({ wearEvent }) => ({
        id: wearEvent.id,
        date: wearEvent.date.toISOString(),
        outfitName: wearEvent.outfit?.name ?? null,
        context: wearEvent.context,
        source: wearEvent.source,
        corrected: wearEvent.corrected,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/items/:id/wear — "Wore it today"; idempotent per calendar day
router.post('/items/:id/wear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await logManualItemWear(req.params.id);
    const stats = (await getWearStatsForItems([req.params.id])).get(req.params.id)!;
    res.status(201).json(stats);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id/wear — undo today's manual wear log
router.delete('/items/:id/wear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const undone = await undoManualItemWear(req.params.id);
    if (!undone) return res.status(404).json({ error: 'No wear logged today for this item' });
    const stats = (await getWearStatsForItems([req.params.id])).get(req.params.id)!;
    res.json(stats);
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
