import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getWearStatsForItems, costPerWear, isDormant, DORMANT_THRESHOLD_DAYS } from '../lib/wearStats';
import { getInsights, type InsightsRange } from '../lib/insights';

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

// GET /api/closets/:id/insights — most-worn / sitting-idle / capsule efficiency
router.get('/:id/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as InsightsRange) === 'all' ? 'all' : '6m';
    const summary = await getInsights(req.params.id, range);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/closets/:id/stats — the closet stat strip
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.closetItem.findMany({
      where: { closetId: req.params.id },
      select: { id: true, pricePaid: true, climate: true },
    });
    const itemIds = items.map((i) => i.id);
    const wearStats = await getWearStatsForItems(itemIds);

    const now = Date.now();
    const DAY = 1000 * 60 * 60 * 24;
    const currentStart = now - 30 * DAY;
    const previousStart = now - 60 * DAY;

    const wearRows = itemIds.length
      ? await prisma.wearEventItem.findMany({
          where: { closetItemId: { in: itemIds } },
          include: { wearEvent: { select: { date: true } } },
        })
      : [];

    const wornThisPeriod = new Set<string>();
    const wornPreviousPeriod = new Set<string>();
    for (const row of wearRows) {
      const t = row.wearEvent.date.getTime();
      if (t >= currentStart) wornThisPeriod.add(row.closetItemId);
      else if (t >= previousStart) wornPreviousPeriod.add(row.closetItemId);
    }

    const totalItems = items.length;
    const utilisation = totalItems ? wornThisPeriod.size / totalItems : 0;
    const prevUtilisation = totalItems ? wornPreviousPeriod.size / totalItems : 0;

    let dormantCount = 0;
    let dormantCoolCount = 0;
    for (const item of items) {
      const stats = wearStats.get(item.id)!;
      if (isDormant(stats.lastWornAt)) {
        dormantCount += 1;
        if (item.climate === 'cold' || item.climate === 'layering') dormantCoolCount += 1;
      }
    }

    const costsPerWear = items
      .map((item) => costPerWear(item.pricePaid, wearStats.get(item.id)!.wearCount))
      .filter((c): c is number => c !== null);
    const avgCostPerWear = costsPerWear.length
      ? costsPerWear.reduce((a, b) => a + b, 0) / costsPerWear.length
      : null;

    res.json({
      wornThisMonth: wornThisPeriod.size,
      totalItems,
      closetUtilisation: utilisation,
      closetUtilisationDelta: utilisation - prevUtilisation,
      dormantCount,
      dormantCoolCount,
      dormantThresholdDays: DORMANT_THRESHOLD_DAYS,
      avgCostPerWear,
    });
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
