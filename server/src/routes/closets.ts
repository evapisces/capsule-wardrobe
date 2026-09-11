import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getWearStatsForItems, costPerWear, isDormant, DORMANT_THRESHOLD_DAYS } from '../lib/wearStats';
import { getInsights, type InsightsRange } from '../lib/insights';
import { findOwnedCloset } from '../lib/ownership';
import { signPhotoUrls } from '../lib/r2';
import type { ClosetWearDay } from '@capsule/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closets = await prisma.closet.findMany({ where: { userId: req.user!.id } });
    res.json(closets);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const closet = await prisma.closet.create({
      data: { userId: req.user!.id, name, description: description ?? null },
    });
    res.status(201).json(closet);
  } catch (err) {
    next(err);
  }
});

// GET /api/closets/:id/insights — most-worn / sitting-idle / capsule efficiency
router.get('/:id/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });
    const range = (req.query.range as InsightsRange) === 'all' ? 'all' : '6m';
    const summary = await getInsights(closet.id, range);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/closets/:id/stats — the closet stat strip
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });

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

// GET /api/closets/:id/wear-history?from=YYYY-MM-DD&to=YYYY-MM-DD — wear
// events for the closet's items within a date range, grouped by date.
router.get('/:id/wear-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });

    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD dates' });
    }
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return res.status(400).json({ error: 'from and to must be a valid date range' });
    }
    const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > MAX_RANGE_DAYS) {
      return res.status(400).json({ error: `range cannot exceed ${MAX_RANGE_DAYS} days` });
    }

    const itemIds = (
      await prisma.closetItem.findMany({ where: { closetId: req.params.id }, select: { id: true } })
    ).map((i) => i.id);

    const rows = itemIds.length
      ? await prisma.wearEventItem.findMany({
          where: {
            closetItemId: { in: itemIds },
            wearEvent: { date: { gte: fromDate, lte: toDate } },
          },
          include: {
            wearEvent: { include: { outfit: { select: { id: true, name: true } } } },
            closetItem: { select: { id: true, name: true, photoUrl: true } },
          },
          orderBy: { wearEvent: { date: 'asc' } },
        })
      : [];

    // Sign every item's photoUrl up front, then reassemble the grouped
    // day/event structure from the flat signed list.
    const signedItemById = new Map(
      (await signPhotoUrls(rows.map((r) => r.closetItem))).map((item) => [item.id, item])
    );

    const daysByDate = new Map<string, Map<string, ClosetWearDay['events'][number]>>();
    for (const row of rows) {
      const date = row.wearEvent.date.toISOString().slice(0, 10);
      if (!daysByDate.has(date)) daysByDate.set(date, new Map());
      const eventsByEventId = daysByDate.get(date)!;
      if (!eventsByEventId.has(row.wearEventId)) {
        eventsByEventId.set(row.wearEventId, {
          id: row.wearEvent.id,
          outfitName: row.wearEvent.outfit?.name ?? null,
          context: row.wearEvent.context,
          source: row.wearEvent.source,
          corrected: row.wearEvent.corrected,
          items: [],
        });
      }
      const item = signedItemById.get(row.closetItem.id);
      if (item) eventsByEventId.get(row.wearEventId)!.items.push(item);
    }

    const days: ClosetWearDay[] = Array.from(daysByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, eventsByEventId]) => ({ date, events: Array.from(eventsByEventId.values()) }));

    res.json(days);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });
    res.json(closet);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await findOwnedCloset(req.params.id, req.user!.id);
    if (!existing) return res.status(404).json({ error: 'Closet not found' });
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
    const existing = await findOwnedCloset(req.params.id, req.user!.id);
    if (!existing) return res.status(404).json({ error: 'Closet not found' });
    await prisma.closet.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
