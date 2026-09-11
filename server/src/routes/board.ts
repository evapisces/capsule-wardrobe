import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getWearStatsForItems } from '../lib/wearStats';
import { climateLabel } from '../lib/capsuleStats';
import { signPhotoUrls } from '../lib/r2';
import { findOwnedCapsule, findOwnedClosetItem, findOwnedOutfit } from '../lib/ownership';

const router = Router();

// GET /api/capsules/:id/board — everything the outfit builder needs in one call
router.get('/:id/board', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedCapsule(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Capsule not found' });

    const capsule = await prisma.capsule.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { closetItem: true } },
        boardPositions: true,
        outfits: { include: { items: true } },
        trips: { include: { trip: true } },
      },
    });
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const trip = capsule.trips[0]?.trip;
    const closetItemById = new Map(capsule.items.map(({ closetItem }) => [closetItem.id, closetItem]));
    const wearStats = await getWearStatsForItems([...closetItemById.keys()]);
    const positionByItem = new Map(capsule.boardPositions.map((p) => [p.closetItemId, p]));

    // Every capsule member belongs on the board — the drawer already
    // excludes members entirely, so there's no third "member but not on the
    // board" state. Items added before board positions existed (or via the
    // plain add/remove flow) get a computed grid slot as a default; it's
    // not persisted until the user actually drags the chip.
    const boardItems = capsule.items.map(({ closetItem }, index) => {
      const pos = positionByItem.get(closetItem.id);
      const outfit = capsule.outfits.find((o) => o.items.some((oi) => oi.closetItemId === closetItem.id));
      const offClimate = !!capsule.climate && !!closetItem.climate && closetItem.climate !== capsule.climate;
      const defaultX = 0.05 + (index % 5) * 0.18;
      const defaultY = 0.08 + Math.floor(index / 5) * 0.32;
      return {
        id: closetItem.id,
        name: closetItem.name,
        photoUrl: closetItem.photoUrl,
        climate: closetItem.climate,
        wearCount: wearStats.get(closetItem.id)?.wearCount ?? 0,
        onBoard: true,
        x: pos?.x ?? defaultX,
        y: pos?.y ?? defaultY,
        outfitId: outfit?.id ?? null,
        offClimate,
      };
    });

    const outfits = capsule.outfits.map((o) => ({
      id: o.id,
      name: o.name,
      itemIds: o.items.map((i) => i.closetItemId),
    }));

    const offClimateCount = boardItems.filter((i) => i.offClimate).length;

    res.json({
      id: capsule.id,
      name: capsule.name,
      climate: capsule.climate,
      tempHighF: capsule.tempHighF,
      tempLowF: capsule.tempLowF,
      climateLabel: climateLabel(capsule.climate, capsule.tempHighF, capsule.tempLowF),
      tripLabel: trip
        ? `Trip capsule · ${trip.destination} · ${new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'Standing capsule',
      offClimateCount,
      items: await signPhotoUrls(boardItems),
      outfits,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/capsules/:id/drawer — closet items not yet in this capsule
router.get('/:id/drawer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await findOwnedCapsule(req.params.id, req.user!.id);
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const { category, closetId } = req.query as { category?: string; closetId?: string };

    // A user may have more than one closet; the caller (which already knows
    // which closet it's browsing) should pass closetId explicitly. Falling
    // back to "the first closet we find" is only a placeholder for the
    // current single-closet UI and is ambiguous once that's no longer true.
    const closet = closetId
      ? await prisma.closet.findFirst({ where: { id: closetId, userId: req.user!.id } })
      : await prisma.closet.findFirst({ where: { userId: capsule.userId } });
    if (!closet) return res.json([]);

    const memberIds = new Set(
      (await prisma.capsuleItem.findMany({ where: { capsuleId: capsule.id }, select: { closetItemId: true } })).map(
        (r) => r.closetItemId
      )
    );

    const items = await prisma.closetItem.findMany({
      where: {
        closetId: closet.id,
        id: { notIn: [...memberIds] },
        ...(category ? { category: category as never } : {}),
      },
    });

    const wearStats = await getWearStatsForItems(items.map((i) => i.id));
    res.json(
      await signPhotoUrls(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          photoUrl: item.photoUrl,
          category: item.category,
          climate: item.climate,
          wearCount: wearStats.get(item.id)?.wearCount ?? 0,
          matchesClimate: !capsule.climate || !item.climate || item.climate === capsule.climate,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

// PUT /api/capsules/:id/board/:itemId — place/move an item on the board (adds
// it to the capsule if it isn't already a member)
router.put('/:id/board/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await findOwnedCapsule(req.params.id, req.user!.id);
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });
    const item = await findOwnedClosetItem(req.params.itemId, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const { x, y } = req.body as { x: number; y: number };
    await prisma.capsuleItem.upsert({
      where: { capsuleId_closetItemId: { capsuleId: req.params.id, closetItemId: req.params.itemId } },
      update: {},
      create: { capsuleId: req.params.id, closetItemId: req.params.itemId },
    });
    const position = await prisma.boardPosition.upsert({
      where: { capsuleId_closetItemId: { capsuleId: req.params.id, closetItemId: req.params.itemId } },
      update: { x, y },
      create: { capsuleId: req.params.id, closetItemId: req.params.itemId, x, y },
    });
    res.json(position);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/capsules/:id/board/:itemId — remove an item from the board
// (and the capsule entirely, since the board is the capsule's contents)
router.delete('/:id/board/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await findOwnedCapsule(req.params.id, req.user!.id);
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const outfitItems = await prisma.outfitItem.findMany({
      where: { closetItemId: req.params.itemId, outfit: { capsuleId: req.params.id } },
    });
    await prisma.outfitItem.deleteMany({ where: { outfitId: { in: outfitItems.map((o) => o.outfitId) }, closetItemId: req.params.itemId } });
    await prisma.boardPosition.deleteMany({ where: { capsuleId: req.params.id, closetItemId: req.params.itemId } });
    await prisma.capsuleItem.deleteMany({ where: { capsuleId: req.params.id, closetItemId: req.params.itemId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/capsules/:id/outfits — lasso a group into a named outfit
router.post('/:id/outfits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await findOwnedCapsule(req.params.id, req.user!.id);
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const { name, itemIds } = req.body as { name: string; itemIds: string[] };
    const outfit = await prisma.outfit.create({
      data: {
        capsuleId: req.params.id,
        name,
        items: { create: itemIds.map((closetItemId) => ({ closetItemId })) },
      },
      include: { items: true },
    });
    res.status(201).json({ id: outfit.id, name: outfit.name, itemIds: outfit.items.map((i) => i.closetItemId) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/outfits/:id — rename, mounted separately below at /api/outfits
export const outfitsRouter = Router();

outfitsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedOutfit(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Outfit not found' });

    const { name } = req.body as { name: string };
    const outfit = await prisma.outfit.update({ where: { id: req.params.id }, data: { name } });
    res.json(outfit);
  } catch (err) {
    next(err);
  }
});

outfitsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedOutfit(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Outfit not found' });

    await prisma.outfit.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/outfits/:id/items/:itemId — add an item to an existing outfit
outfitsRouter.post('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outfit = await findOwnedOutfit(req.params.id, req.user!.id);
    if (!outfit) return res.status(404).json({ error: 'Outfit not found' });
    const item = await findOwnedClosetItem(req.params.itemId, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await prisma.outfitItem.upsert({
      where: { outfitId_closetItemId: { outfitId: req.params.id, closetItemId: req.params.itemId } },
      update: {},
      create: { outfitId: req.params.id, closetItemId: req.params.itemId },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/outfits/:id/items/:itemId — drag a chip out of the group
outfitsRouter.delete('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outfit = await findOwnedOutfit(req.params.id, req.user!.id);
    if (!outfit) return res.status(404).json({ error: 'Outfit not found' });

    await prisma.outfitItem.delete({
      where: { outfitId_closetItemId: { outfitId: req.params.id, closetItemId: req.params.itemId } },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
