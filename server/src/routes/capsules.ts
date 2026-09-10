import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { computeEfficiency, climateLabel, isCapsuleClimateSuitable } from '../lib/capsuleStats';
import { signPhotoUrls } from '../lib/r2';
import type { Climate } from '@capsule/shared';

const router = Router();
const USER_ID = 'user_1';

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const archivedOnly = req.query.archived === 'true';
    const capsules = await prisma.capsule.findMany({
      where: { userId: USER_ID, archivedAt: archivedOnly ? { not: null } : null },
      include: {
        items: { include: { closetItem: { select: { id: true, name: true, photoUrl: true, climate: true } } } },
        trips: { include: { trip: true } },
        outfits: { include: { items: { select: { closetItemId: true, outfitId: true } } } },
      },
    });

    const result = await Promise.all(capsules.map(async (capsule) => {
      const items = capsule.items.map(({ closetItem }) => closetItem);
      const trip = capsule.trips[0]?.trip;
      const outfitItemPairs = capsule.outfits.flatMap((o) => o.items);
      const efficiency = computeEfficiency(items.map((i) => i.id), outfitItemPairs);

      return {
        id: capsule.id,
        name: capsule.name,
        description: capsule.description,
        // A capsule counts as "trip" whenever it's actually linked to a trip,
        // not just when its own `kind` column happens to have been set —
        // nothing currently sets `kind` when a capsule is linked via Trips.
        kind: trip ? 'trip' : capsule.kind,
        climate: capsule.climate,
        tempHighF: capsule.tempHighF,
        tempLowF: capsule.tempLowF,
        createdAt: capsule.createdAt,
        archivedAt: capsule.archivedAt,
        thumbnails: await signPhotoUrls(items.slice(0, 5).map((i) => ({ id: i.id, name: i.name, photoUrl: i.photoUrl }))),
        itemCount: items.length,
        outfitCount: capsule.outfits.length,
        tripLabel: trip
          ? `${new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · trip`
          : 'Standing capsule',
        climateLabel: climateLabel(capsule.climate, capsule.tempHighF, capsule.tempLowF),
        climateSuitable: isCapsuleClimateSuitable(capsule.climate, items.map((i) => i.climate)),
        efficiency: efficiency.score,
        efficiencyReason: efficiency.reason,
      };
    }));

    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, climate } = req.body as {
      name: string; description?: string; climate?: Climate;
    };
    const capsule = await prisma.capsule.create({
      data: {
        userId: USER_ID,
        name,
        description: description ?? null,
        ...(climate ? { climate } : {}),
      },
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

    const items = await signPhotoUrls(
      capsule.items.map(({ closetItem }) => {
        const { _count, ...item } = closetItem;
        return { ...item, capsuleCount: _count.capsules };
      })
    );
    res.json({ ...capsule, items });
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

// Soft-archive: retire a capsule from the active list without touching its
// items, outfits or trip links. Idempotent.
router.post('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.capsule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Capsule not found' });
    const capsule = await prisma.capsule.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date() },
    });
    res.json(capsule);
  } catch (err) { next(err); }
});

// Unarchive: bring a capsule back into the active list. Idempotent.
router.delete('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.capsule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Capsule not found' });
    const capsule = await prisma.capsule.update({
      where: { id: req.params.id },
      data: { archivedAt: null },
    });
    res.json(capsule);
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
