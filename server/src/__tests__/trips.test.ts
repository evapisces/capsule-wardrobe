import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

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
});

describe('POST /api/trips', () => {
  it('creates a trip', async () => {
    const res = await request(app).post('/api/trips').send({
      name: 'Japan 2026',
      destination: 'Tokyo, Japan',
      startDate: '2026-10-01',
      endDate: '2026-10-14',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Japan 2026');
    expect(res.body.destination).toBe('Tokyo, Japan');
  });
});

describe('GET /api/trips', () => {
  it('returns all trips', async () => {
    await prisma.trip.create({
      data: {
        userId: USER_ID,
        name: 'Test Trip',
        destination: 'Paris',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-07'),
      },
    });
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/trips/:id', () => {
  it('returns trip with embedded capsules and items', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Trip Test Closet' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Pack Me', category: 'tops' },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Trip Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID,
        name: 'Embedded Trip',
        destination: 'Seoul',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-10'),
      },
    });
    await prisma.tripCapsule.create({
      data: { tripId: trip.id, capsuleId: capsule.id },
    });

    const res = await request(app).get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(200);
    expect(res.body.capsules).toHaveLength(1);
    expect(res.body.capsules[0].items).toHaveLength(1);
    expect(res.body.capsules[0].items[0].name).toBe('Pack Me');
  });
});

describe('POST /api/trips/:id/capsules/:capsuleId', () => {
  it('links a capsule to a trip', async () => {
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID, name: 'Link Trip', destination: 'Berlin',
        startDate: new Date('2026-08-01'), endDate: new Date('2026-08-07'),
      },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Link Capsule' },
    });
    const res = await request(app).post(`/api/trips/${trip.id}/capsules/${capsule.id}`);
    expect(res.status).toBe(201);
  });
});
