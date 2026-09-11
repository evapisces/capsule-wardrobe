import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'user_1';
let authCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.trip.deleteMany({ where: { userId: USER_ID } });
});

describe('POST /api/trips', () => {
  it('creates a trip', async () => {
    const res = await request(app).post('/api/trips').set('Cookie', authCookie).send({
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
    const res = await request(app).get('/api/trips').set('Cookie', authCookie);
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

    const res = await request(app).get(`/api/trips/${trip.id}`).set('Cookie', authCookie);
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
    const res = await request(app).post(`/api/trips/${trip.id}/capsules/${capsule.id}`).set('Cookie', authCookie);
    expect(res.status).toBe(201);
  });
});

describe('packing + day strip', () => {
  let closetId: string;
  let capsuleId: string;
  let itemId: string;
  let tripId: string;

  beforeEach(async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'Packing Test Closet' } });
    closetId = closet.id;
    const item = await prisma.closetItem.create({ data: { closetId, name: 'Packing Item', category: 'tops' } });
    itemId = item.id;
    const capsule = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Packing Capsule' } });
    capsuleId = capsule.id;
    await prisma.capsuleItem.create({ data: { capsuleId, closetItemId: itemId } });
    const outfit = await prisma.outfit.create({
      data: { capsuleId, name: 'Day one look', items: { create: [{ closetItemId: itemId }] } },
    });
    const trip = await prisma.trip.create({
      data: { userId: USER_ID, name: 'Packing Trip', destination: 'Lisbon', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-03') },
    });
    tripId = trip.id;
    await prisma.tripCapsule.create({ data: { tripId, capsuleId } });
    void outfit;
  });

  afterEach(async () => {
    await prisma.capsule.deleteMany({ where: { id: capsuleId } });
    await prisma.closetItem.deleteMany({ where: { closetId } });
    await prisma.closet.delete({ where: { id: closetId } });
  });

  it('materializes packing rows for every item in the trip\'s capsules', async () => {
    const res = await request(app).get(`/api/trips/${tripId}/packing`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].itemId).toBe(itemId);
    expect(res.body[0].packed).toBe(false);
    expect(res.body[0].neededByOutfits).toEqual(['Day one look']);
  });

  it('toggles packed state', async () => {
    const res = await request(app).put(`/api/trips/${tripId}/packing/${itemId}`).set('Cookie', authCookie).send({ packed: true });
    expect(res.status).toBe(200);
    expect(res.body.packed).toBe(true);
  });

  it('returns a day strip covering the trip range', async () => {
    const res = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].date).toBe('2026-01-01');
    expect(res.body.every((d: { state: string }) => ['auto', 'corrected', 'today', 'future'].includes(d.state))).toBe(true);
  });

  it('marks a corrected day when the user picks a different outfit', async () => {
    const outfit2 = await prisma.outfit.create({ data: { capsuleId, name: 'Alt look' } });
    const res = await request(app).put(`/api/trips/${tripId}/days/2026-01-02`).set('Cookie', authCookie).send({ outfitId: outfit2.id });
    expect(res.status).toBe(200);

    const days = await request(app).get(`/api/trips/${tripId}/days`).set('Cookie', authCookie);
    const day2 = days.body.find((d: { date: string }) => d.date === '2026-01-02');
    expect(day2.state).toBe('corrected');
    expect(day2.outfitName).toBe('Alt look');
  });
});
