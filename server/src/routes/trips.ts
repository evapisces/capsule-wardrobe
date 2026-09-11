import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { geocodeDestination, fetchTripTemps, classifyClimate } from '../lib/weather';
import { getTripDays, setTripDayOutfit } from '../lib/tripSchedule';
import { getTripPacking, getPackingSuggestions } from '../lib/tripPacking';
import { signPhotoUrls } from '../lib/r2';
import { findOwnedTrip, findOwnedCapsule, findOwnedOutfit, findOwnedClosetItem } from '../lib/ownership';
import type { Climate, CapsuleSuitability } from '@capsule/shared';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.trip.findMany({ where: { userId: req.user!.id } });
    res.json(trips);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, destination, startDate, endDate } = req.body as {
      name: string; destination: string; startDate: string; endDate: string;
    };
    const trip = await prisma.trip.create({
      data: {
        userId: req.user!.id, name, destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    res.status(201).json(trip);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        capsules: {
          include: {
            capsule: {
              include: {
                items: {
                  include: { closetItem: true },
                },
                outfits: true,
              },
            },
          },
        },
      },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const capsules = await Promise.all(trip.capsules.map(async ({ capsule }) => ({
      ...capsule,
      items: await signPhotoUrls(capsule.items.map(({ closetItem }) => closetItem)),
      outfits: capsule.outfits.map((o) => ({ id: o.id, name: o.name })),
    })));
    res.json({ ...trip, capsules });
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const { startDate, endDate, ...rest } = req.body;
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });
    res.json(trip);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    await prisma.trip.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await findOwnedTrip(req.params.id, req.user!.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const capsule = await findOwnedCapsule(req.params.capsuleId, req.user!.id);
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    await prisma.tripCapsule.create({
      data: { tripId: req.params.id, capsuleId: req.params.capsuleId },
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await findOwnedTrip(req.params.id, req.user!.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    await prisma.tripCapsule.delete({
      where: {
        tripId_capsuleId: { tripId: req.params.id, capsuleId: req.params.capsuleId },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get('/:id/weather', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        capsules: {
          include: {
            capsule: {
              include: { items: { include: { closetItem: true } } },
            },
          },
        },
      },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { latitude, longitude, resolvedLocation } = await geocodeDestination(trip.destination);
    const { source, avgHighF, avgLowF } = await fetchTripTemps(
      latitude, longitude, trip.startDate, trip.endDate
    );
    const predictedClimate = classifyClimate(avgHighF, avgLowF);

    const capsuleSuitability: CapsuleSuitability[] = trip.capsules.map(({ capsule }) => {
      const itemClimates = [...new Set(
        capsule.items.map(({ closetItem }) => closetItem.climate).filter((c): c is Climate => c !== null)
      )];
      return {
        capsuleId: capsule.id,
        capsuleName: capsule.name,
        suitable: itemClimates.length === 0 || itemClimates.includes(predictedClimate),
        itemClimates,
      };
    });

    res.json({ source, resolvedLocation, avgHighF, avgLowF, predictedClimate, capsuleSuitability });
  } catch (err) { next(err); }
});

// GET /api/trips/:id/days — the day strip (auto-logged / corrected / today / future)
router.get('/:id/days', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const days = await getTripDays(req.params.id);
    res.json(days);
  } catch (err) { next(err); }
});

// PUT /api/trips/:id/days/:date — pick a different outfit for a day (marks it "corrected")
router.put('/:id/days/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await findOwnedTrip(req.params.id, req.user!.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { outfitId } = req.body as { outfitId: string };
    const outfit = await findOwnedOutfit(outfitId, req.user!.id);
    if (!outfit) return res.status(404).json({ error: 'Outfit not found' });

    const wearEvent = await setTripDayOutfit(req.params.id, req.params.date, outfitId);
    res.json(wearEvent);
  } catch (err) { next(err); }
});

// GET /api/trips/:id/packing — the packing list
router.get('/:id/packing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const rows = await getTripPacking(req.params.id);
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/trips/:id/packing/:itemId — toggle/set packed
router.put('/:id/packing/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await findOwnedTrip(req.params.id, req.user!.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const item = await findOwnedClosetItem(req.params.itemId, req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const { packed } = req.body as { packed: boolean };
    const row = await prisma.packingItem.upsert({
      where: { tripId_closetItemId: { tripId: req.params.id, closetItemId: req.params.itemId } },
      update: { packed },
      create: { tripId: req.params.id, closetItemId: req.params.itemId, packed },
    });
    res.json(row);
  } catch (err) { next(err); }
});

// GET /api/trips/:id/packing-suggestions
router.get('/:id/packing-suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owned = await findOwnedTrip(req.params.id, req.user!.id);
    if (!owned) return res.status(404).json({ error: 'Trip not found' });

    const packing = await getTripPacking(req.params.id);
    const suggestions = await getPackingSuggestions(req.params.id, new Set(packing.map((p) => p.itemId)));
    res.json(suggestions);
  } catch (err) { next(err); }
});

export default router;
