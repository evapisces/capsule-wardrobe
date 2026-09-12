import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { ItemCategory, Climate } from '@capsule/shared';
import {
  getWearStatsForItems,
  costPerWear,
  isDormant,
  logManualItemWear,
  undoManualItemWear,
} from '../lib/wearStats';
import { signPhotoUrl, signPhotoUrls, getObjectBuffer } from '../lib/r2';
import { findOwnedCloset, findOwnedClosetItem } from '../lib/ownership';
import { isVisionSuggestionsEnabled, suggestItemMetadata } from '../lib/visionSuggest';
import { suggestOutfitItems } from '../lib/outfitSuggest';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/closets/:id/items — list items with optional filters + capsuleCount
router.get('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });

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

    res.json(await signPhotoUrls(result));
  } catch (err) {
    next(err);
  }
});

// POST /api/closets/:id/items
router.post('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await findOwnedCloset(req.params.id, req.user!.id);
    if (!closet) return res.status(404).json({ error: 'Closet not found' });

    const item = await prisma.closetItem.create({
      data: { closetId: req.params.id, ...req.body },
    });
    res.status(201).json({ ...item, photoUrl: await signPhotoUrl(item.photoUrl) });
  } catch (err) {
    next(err);
  }
});

// POST /api/items/suggest — run an uploaded (or already-uploaded, via `key`) photo through
// the vision model to pre-fill name/category/color/brand/climate for the bulk-upload confirm
// queue. Never writes to the database; the client still must call POST /closets/:id/items
// to actually create anything.
router.post(
  '/items/suggest',
  upload.single('photo'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isVisionSuggestionsEnabled()) {
        return res.status(503).json({
          error: 'AI suggestions are not configured on this server',
          suggestionsAvailable: false,
        });
      }

      let buffer: Buffer;
      let contentType: string;
      if (req.file) {
        buffer = req.file.buffer;
        contentType = req.file.mimetype;
      } else if (typeof req.body?.key === 'string' && req.body.key) {
        const object = await getObjectBuffer(req.body.key);
        buffer = object.buffer;
        contentType = object.contentType;
      } else {
        return res.status(400).json({ error: 'Provide a photo file or an uploaded key' });
      }

      const result = await suggestItemMetadata(buffer, contentType);
      if (!result.suggestion) {
        return res.json({ suggestionsAvailable: true, suggestion: null, reason: result.reason });
      }
      res.json({ suggestionsAvailable: true, suggestion: result.suggestion });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/items/:id
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Item not found' });

    const item = await prisma.closetItem.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { capsules: true } } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { _count, ...rest } = item;
    const stats = (await getWearStatsForItems([item.id])).get(item.id)!;
    res.json({
      ...rest,
      photoUrl: await signPhotoUrl(rest.photoUrl),
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

// GET /api/items/:id/capsules — capsules this item belongs to, with climate match
router.get('/items/:id/capsules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const links = await prisma.capsuleItem.findMany({
      where: { closetItemId: req.params.id },
      include: {
        capsule: {
          include: { _count: { select: { items: true } }, trips: { include: { trip: true } } },
        },
      },
    });

    res.json(
      links.map(({ capsule }) => {
        const trip = capsule.trips[0]?.trip;
        const suitable = !capsule.climate || !item.climate || capsule.climate === item.climate;
        return {
          id: capsule.id,
          name: capsule.name,
          kind: capsule.kind,
          itemCount: capsule._count.items,
          tripLabel: trip
            ? `${new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · trip`
            : 'Standing capsule',
          suitable,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id/outfit-suggestion — rule-based complementary items for
// a dormant item (issue #33). Always 200 (even when the closet is too
// sparse to suggest anything) — an empty `suggestions` array is a valid
// answer, not an error.
router.get('/items/:id/outfit-suggestion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seedItem = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!seedItem) return res.status(404).json({ error: 'Item not found' });

    const closetItems = await prisma.closetItem.findMany({ where: { closetId: seedItem.closetId } });
    const wearStats = await getWearStatsForItems(closetItems.map((i) => i.id));

    const outfitGroups = await prisma.outfitItem.findMany({
      where: { closetItem: { closetId: seedItem.closetId } },
      select: { outfitId: true, closetItemId: true },
    });
    const itemIdsByOutfit = new Map<string, string[]>();
    for (const row of outfitGroups) {
      const list = itemIdsByOutfit.get(row.outfitId) ?? [];
      list.push(row.closetItemId);
      itemIdsByOutfit.set(row.outfitId, list);
    }

    const ranked = suggestOutfitItems(
      {
        id: seedItem.id,
        category: seedItem.category,
        climate: seedItem.climate,
        wearCount: wearStats.get(seedItem.id)?.wearCount ?? 0,
      },
      closetItems.map((item) => ({
        id: item.id,
        category: item.category,
        climate: item.climate,
        wearCount: wearStats.get(item.id)?.wearCount ?? 0,
      })),
      [...itemIdsByOutfit.values()].map((itemIds) => ({ itemIds }))
    );

    const itemsById = new Map(closetItems.map((item) => [item.id, item]));
    const suggestions = await signPhotoUrls(
      ranked.map((r) => {
        const item = itemsById.get(r.itemId)!;
        return {
          itemId: item.id,
          name: item.name,
          photoUrl: item.photoUrl,
          category: item.category,
          climate: item.climate,
          reason: r.reason,
        };
      })
    );

    res.json({
      seed: {
        itemId: seedItem.id,
        name: seedItem.name,
        photoUrl: await signPhotoUrl(seedItem.photoUrl),
        category: seedItem.category,
        climate: seedItem.climate,
      },
      suggestions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id/wear-history — chronological wear events for an item
router.get('/items/:id/wear-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

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
    const item = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

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
    const item = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

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
    const owned = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Item not found' });

    const item = await prisma.closetItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ ...item, photoUrl: await signPhotoUrl(item.photoUrl) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id
router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedClosetItem(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Item not found' });

    await prisma.closetItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
