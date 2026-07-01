import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { geocodeDestination, fetchTripTemps, classifyClimate } from '../lib/weather';

jest.mock('../lib/weather', () => ({
  geocodeDestination: jest.fn(),
  fetchTripTemps: jest.fn(),
  classifyClimate: jest.fn(),
}));

const app = createApp();
const USER_ID = 'user_1';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.trip.deleteMany({ where: { userId: USER_ID } });
  jest.clearAllMocks();
});

describe('GET /api/trips/:id/weather', () => {
  it('returns weather and flags capsule suitability against predicted climate', async () => {
    (geocodeDestination as jest.Mock).mockResolvedValue({
      latitude: 35.68, longitude: 139.69, resolvedLocation: 'Tokyo, Japan',
    });
    (fetchTripTemps as jest.Mock).mockResolvedValue({
      source: 'forecast', avgHighF: 85, avgLowF: 70,
    });
    (classifyClimate as jest.Mock).mockReturnValue('tropical');

    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Weather Test Closet' },
    });
    const tropicalItem = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Linen Shirt', category: 'tops', climate: 'tropical' },
    });
    const coldItem = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Parka', category: 'outerwear', climate: 'cold' },
    });

    const matchingCapsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Tropical Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: matchingCapsule.id, closetItemId: tropicalItem.id },
    });

    const mismatchedCapsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Cold Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: mismatchedCapsule.id, closetItemId: coldItem.id },
    });

    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID, name: 'Tokyo Weather Trip', destination: 'Tokyo, Japan',
        startDate: new Date('2026-08-01'), endDate: new Date('2026-08-07'),
      },
    });
    await prisma.tripCapsule.create({ data: { tripId: trip.id, capsuleId: matchingCapsule.id } });
    await prisma.tripCapsule.create({ data: { tripId: trip.id, capsuleId: mismatchedCapsule.id } });

    const res = await request(app).get(`/api/trips/${trip.id}/weather`);

    expect(res.status).toBe(200);
    expect(res.body.resolvedLocation).toBe('Tokyo, Japan');
    expect(res.body.predictedClimate).toBe('tropical');
    expect(geocodeDestination).toHaveBeenCalledWith('Tokyo, Japan');

    const matching = res.body.capsuleSuitability.find((c: { capsuleId: string }) => c.capsuleId === matchingCapsule.id);
    const mismatched = res.body.capsuleSuitability.find((c: { capsuleId: string }) => c.capsuleId === mismatchedCapsule.id);
    expect(matching.suitable).toBe(true);
    expect(mismatched.suitable).toBe(false);
  });

  it('returns 404 for a nonexistent trip', async () => {
    const res = await request(app).get('/api/trips/nonexistent-id/weather');
    expect(res.status).toBe(404);
  });
});
