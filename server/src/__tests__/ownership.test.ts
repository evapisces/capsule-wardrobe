import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();

const USER_A = 'ownership_user_a';
const USER_B = 'ownership_user_b';

interface OwnedFixture {
  closetId: string;
  itemId: string;
  capsuleId: string;
  outfitId: string;
  tripId: string;
}

async function seedFixture(userId: string, label: string): Promise<OwnedFixture> {
  const closet = await prisma.closet.create({ data: { userId, name: `${label} Closet` } });
  const item = await prisma.closetItem.create({
    data: { closetId: closet.id, name: `${label} Item`, category: 'tops' },
  });
  const capsule = await prisma.capsule.create({ data: { userId, name: `${label} Capsule` } });
  await prisma.capsuleItem.create({ data: { capsuleId: capsule.id, closetItemId: item.id } });
  const outfit = await prisma.outfit.create({
    data: { capsuleId: capsule.id, name: `${label} Outfit`, items: { create: [{ closetItemId: item.id }] } },
  });
  const trip = await prisma.trip.create({
    data: {
      userId, name: `${label} Trip`, destination: 'Nowhere',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-01-03'),
    },
  });
  await prisma.tripCapsule.create({ data: { tripId: trip.id, capsuleId: capsule.id } });

  return { closetId: closet.id, itemId: item.id, capsuleId: capsule.id, outfitId: outfit.id, tripId: trip.id };
}

let cookieA: string;
let cookieB: string;
let a: OwnedFixture;
let b: OwnedFixture;

beforeAll(async () => {
  cookieA = await loginAs(USER_A);
  cookieB = await loginAs(USER_B);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.trip.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
  await prisma.capsule.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
  await prisma.closet.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });

  a = await seedFixture(USER_A, 'A');
  b = await seedFixture(USER_B, 'B');
});

describe('list endpoints only return the caller\'s own rows (a)', () => {
  it('GET /api/closets', async () => {
    const res = await request(app).get('/api/closets').set('Cookie', cookieA);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(a.closetId);
    expect(ids).not.toContain(b.closetId);
  });

  it('GET /api/capsules', async () => {
    const res = await request(app).get('/api/capsules').set('Cookie', cookieA);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(a.capsuleId);
    expect(ids).not.toContain(b.capsuleId);
  });

  it('GET /api/trips', async () => {
    const res = await request(app).get('/api/trips').set('Cookie', cookieA);
    const ids = res.body.map((t: { id: string }) => t.id);
    expect(ids).toContain(a.tripId);
    expect(ids).not.toContain(b.tripId);
  });
});

describe('reading another user\'s record by id returns 404 (b)', () => {
  it('GET /api/closets/:id', async () => {
    const res = await request(app).get(`/api/closets/${b.closetId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
  });

  it('GET /api/items/:id', async () => {
    const res = await request(app).get(`/api/items/${b.itemId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
  });

  it('GET /api/capsules/:id', async () => {
    const res = await request(app).get(`/api/capsules/${b.capsuleId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
  });

  it('GET /api/trips/:id', async () => {
    const res = await request(app).get(`/api/trips/${b.tripId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
  });
});

describe('mutating another user\'s record returns 404 and leaves it unchanged (c)', () => {
  it('PUT /api/closets/:id', async () => {
    const res = await request(app)
      .put(`/api/closets/${b.closetId}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
    const closet = await prisma.closet.findUnique({ where: { id: b.closetId } });
    expect(closet!.name).toBe('B Closet');
  });

  it('DELETE /api/closets/:id', async () => {
    const res = await request(app).delete(`/api/closets/${b.closetId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const closet = await prisma.closet.findUnique({ where: { id: b.closetId } });
    expect(closet).not.toBeNull();
  });

  it('PUT /api/items/:id', async () => {
    const res = await request(app)
      .put(`/api/items/${b.itemId}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
    const item = await prisma.closetItem.findUnique({ where: { id: b.itemId } });
    expect(item!.name).toBe('B Item');
  });

  it('DELETE /api/items/:id', async () => {
    const res = await request(app).delete(`/api/items/${b.itemId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const item = await prisma.closetItem.findUnique({ where: { id: b.itemId } });
    expect(item).not.toBeNull();
  });

  it('PUT /api/capsules/:id', async () => {
    const res = await request(app)
      .put(`/api/capsules/${b.capsuleId}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
    const capsule = await prisma.capsule.findUnique({ where: { id: b.capsuleId } });
    expect(capsule!.name).toBe('B Capsule');
  });

  it('DELETE /api/capsules/:id', async () => {
    const res = await request(app).delete(`/api/capsules/${b.capsuleId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const capsule = await prisma.capsule.findUnique({ where: { id: b.capsuleId } });
    expect(capsule).not.toBeNull();
  });

  it('PUT /api/trips/:id', async () => {
    const res = await request(app)
      .put(`/api/trips/${b.tripId}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
    const trip = await prisma.trip.findUnique({ where: { id: b.tripId } });
    expect(trip!.name).toBe('B Trip');
  });

  it('DELETE /api/trips/:id', async () => {
    const res = await request(app).delete(`/api/trips/${b.tripId}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const trip = await prisma.trip.findUnique({ where: { id: b.tripId } });
    expect(trip).not.toBeNull();
  });
});

describe('cross-owner linking is rejected (d)', () => {
  it('adding another user\'s item to your capsule returns 404', async () => {
    const res = await request(app)
      .post(`/api/capsules/${a.capsuleId}/items/${b.itemId}`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const link = await prisma.capsuleItem.findUnique({
      where: { capsuleId_closetItemId: { capsuleId: a.capsuleId, closetItemId: b.itemId } },
    });
    expect(link).toBeNull();
  });

  it('linking another user\'s capsule to your trip returns 404', async () => {
    const res = await request(app)
      .post(`/api/trips/${a.tripId}/capsules/${b.capsuleId}`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const link = await prisma.tripCapsule.findUnique({
      where: { tripId_capsuleId: { tripId: a.tripId, capsuleId: b.capsuleId } },
    });
    expect(link).toBeNull();
  });

  it('adding another user\'s item to your outfit returns 404', async () => {
    const res = await request(app)
      .post(`/api/outfits/${a.outfitId}/items/${b.itemId}`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(404);
    const link = await prisma.outfitItem.findUnique({
      where: { outfitId_closetItemId: { outfitId: a.outfitId, closetItemId: b.itemId } },
    });
    expect(link).toBeNull();
  });

  it('setting a trip day to another user\'s outfit returns 404', async () => {
    const res = await request(app)
      .put(`/api/trips/${a.tripId}/days/2026-01-02`)
      .set('Cookie', cookieA)
      .send({ outfitId: b.outfitId });
    expect(res.status).toBe(404);
  });

  it('also rejects the mirror direction (user B acting on user A\'s records)', async () => {
    const res = await request(app)
      .post(`/api/capsules/${b.capsuleId}/items/${a.itemId}`)
      .set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });
});
