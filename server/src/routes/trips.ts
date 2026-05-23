import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1';

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.trip.findMany({ where: { userId: USER_ID } });
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
        userId: USER_ID, name, destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    res.status(201).json(trip);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
              },
            },
          },
        },
      },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const result = {
      ...trip,
      capsules: trip.capsules.map(({ capsule }) => ({
        ...capsule,
        items: capsule.items.map(({ closetItem }) => closetItem),
      })),
    };
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.tripCapsule.create({
      data: { tripId: req.params.id, capsuleId: req.params.capsuleId },
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.tripCapsule.delete({
      where: {
        tripId_capsuleId: { tripId: req.params.id, capsuleId: req.params.capsuleId },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
