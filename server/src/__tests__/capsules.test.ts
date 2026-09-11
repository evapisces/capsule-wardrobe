import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'user_1';
let closetId: string;
let authCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
  const closet = await prisma.closet.create({
    data: { userId: USER_ID, name: 'Capsule Test Closet' },
  });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closet.deleteMany({ where: { id: closetId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.capsule.deleteMany({ where: { userId: USER_ID } });
});

describe('POST /api/capsules', () => {
  it('creates a capsule', async () => {
    const res = await request(app)
      .post('/api/capsules')
      .set('Cookie', authCookie)
      .send({ name: 'Japan Trip Essentials', description: 'Carry-on only' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Japan Trip Essentials');
  });
});

describe('GET /api/capsules', () => {
  it('returns all capsules', async () => {
    await prisma.capsule.createMany({
      data: [
        { userId: USER_ID, name: 'Capsule A' },
        { userId: USER_ID, name: 'Capsule B' },
      ],
    });
    const res = await request(app).get('/api/capsules').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/capsules — enriched fields', () => {
  it('includes thumbnails, counts, climate label and efficiency', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Enriched Capsule', climate: 'cold', tempHighF: 38, tempLowF: 29 },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Cold Item', category: 'outerwear', climate: 'cold' },
    });
    await prisma.capsuleItem.create({ data: { capsuleId: capsule.id, closetItemId: item.id } });

    const res = await request(app).get('/api/capsules').set('Cookie', authCookie);
    const found = res.body.find((c: { id: string }) => c.id === capsule.id);
    expect(found.itemCount).toBe(1);
    expect(found.outfitCount).toBe(0);
    expect(found.thumbnails).toHaveLength(1);
    expect(found.climateLabel).toBe('Cold & wet · 38° / 29°');
    expect(found.climateSuitable).toBe(true);
    expect(found.efficiency).toBe(0); // in 0 outfits
    expect(found.efficiencyReason).toBe('1 item not used in any outfit');
  });
});

describe('GET /api/capsules/:id', () => {
  it('returns capsule with embedded items and capsuleCount', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'With Items' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Test Item', category: 'tops' },
    });
    const capsule2 = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Second Capsule' },
    });
    await prisma.capsuleItem.createMany({
      data: [
        { capsuleId: capsule.id, closetItemId: item.id },
        { capsuleId: capsule2.id, closetItemId: item.id },
      ],
    });

    const res = await request(app).get(`/api/capsules/${capsule.id}`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].capsuleCount).toBe(2);
  });
});

describe('POST /api/capsules/:id/items/:itemId', () => {
  it('adds an item to a capsule', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Empty Capsule' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Add Me', category: 'shoes' },
    });
    const res = await request(app).post(`/api/capsules/${capsule.id}/items/${item.id}`).set('Cookie', authCookie);
    expect(res.status).toBe(201);
    const check = await prisma.capsuleItem.findUnique({
      where: { capsuleId_closetItemId: { capsuleId: capsule.id, closetItemId: item.id } },
    });
    expect(check).not.toBeNull();
  });
});

describe('DELETE /api/capsules/:id/items/:itemId', () => {
  it('removes an item from a capsule', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Full Capsule' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Remove Me', category: 'tops' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const res = await request(app).delete(`/api/capsules/${capsule.id}/items/${item.id}`).set('Cookie', authCookie);
    expect(res.status).toBe(204);
  });
});

describe('POST /api/capsules/:id/archive', () => {
  it('sets archivedAt and returns the updated capsule (criterion 2)', async () => {
    const capsule = await prisma.capsule.create({ data: { userId: USER_ID, name: 'To Archive' } });
    const res = await request(app).post(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(capsule.id);
    expect(res.body.archivedAt).not.toBeNull();
  });

  it('is idempotent on an already-archived capsule (criterion 2)', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Already Archived', archivedAt: new Date() },
    });
    const res = await request(app).post(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.archivedAt).not.toBeNull();
  });

  it('returns 404 with { error } for an unknown id (criterion 2)', async () => {
    const res = await request(app).post('/api/capsules/does-not-exist/archive').set('Cookie', authCookie);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /api/capsules/:id/archive (unarchive)', () => {
  it('clears archivedAt and returns the updated capsule (criterion 3)', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'To Unarchive', archivedAt: new Date() },
    });
    const res = await request(app).delete(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(capsule.id);
    expect(res.body.archivedAt).toBeNull();
  });

  it('is idempotent on an already-active capsule (criterion 3)', async () => {
    const capsule = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Still Active' } });
    const res = await request(app).delete(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.archivedAt).toBeNull();
  });

  it('returns 404 for an unknown id (criterion 3)', async () => {
    const res = await request(app).delete('/api/capsules/does-not-exist/archive').set('Cookie', authCookie);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/capsules — archive filtering', () => {
  it('excludes archived capsules from the default list (criterion 4)', async () => {
    const active = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Active One' } });
    const archived = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Archived One' } });
    await request(app).post(`/api/capsules/${archived.id}/archive`).set('Cookie', authCookie);

    const res = await request(app).get('/api/capsules').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(archived.id);
  });

  it('?archived=true returns only archived capsules with the enriched shape plus archivedAt (criterion 5)', async () => {
    await prisma.capsule.create({ data: { userId: USER_ID, name: 'Active One' } });
    const archived = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Archived One', climate: 'cold', tempHighF: 38, tempLowF: 29 },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Cold Item', category: 'outerwear', climate: 'cold' },
    });
    await prisma.capsuleItem.create({ data: { capsuleId: archived.id, closetItemId: item.id } });
    await request(app).post(`/api/capsules/${archived.id}/archive`).set('Cookie', authCookie);

    const res = await request(app).get('/api/capsules?archived=true').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const found = res.body[0];
    expect(found.id).toBe(archived.id);
    expect(found.archivedAt).not.toBeNull();
    for (const key of [
      'thumbnails', 'itemCount', 'outfitCount', 'tripLabel',
      'climateLabel', 'climateSuitable', 'efficiency', 'efficiencyReason',
    ]) {
      expect(found).toHaveProperty(key);
    }
  });

  it('treats absent / false / garbage archived param as the active list (criterion 5)', async () => {
    const active = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Active One' } });
    const archived = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Archived One' } });
    await request(app).post(`/api/capsules/${archived.id}/archive`).set('Cookie', authCookie);

    for (const qs of ['', '?archived=false', '?archived=banana']) {
      const res = await request(app).get(`/api/capsules${qs}`).set('Cookie', authCookie);
      const ids = res.body.map((c: { id: string }) => c.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(archived.id);
    }
  });
});

describe('GET /api/capsules/:id — archived capsules still resolve', () => {
  it('returns an archived capsule with archivedAt in the payload (criterion 6)', async () => {
    const capsule = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Deep Linked' } });
    await request(app).post(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);

    const res = await request(app).get(`/api/capsules/${capsule.id}`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(capsule.id);
    expect(res.body.archivedAt).not.toBeNull();
  });
});

describe('archive + unarchive preserves capsule data (criterion 7)', () => {
  it('leaves items, outfits and trip links byte-for-byte the same', async () => {
    const capsule = await prisma.capsule.create({ data: { userId: USER_ID, name: 'Round Trip' } });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Kept Item', category: 'tops' },
    });
    await prisma.capsuleItem.create({ data: { capsuleId: capsule.id, closetItemId: item.id } });
    const outfit = await prisma.outfit.create({ data: { capsuleId: capsule.id, name: 'Kept Outfit' } });
    await prisma.outfitItem.create({ data: { outfitId: outfit.id, closetItemId: item.id } });
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID, name: 'Kept Trip', destination: 'Lisbon',
        startDate: new Date('2026-06-01'), endDate: new Date('2026-06-08'),
      },
    });
    await prisma.tripCapsule.create({ data: { tripId: trip.id, capsuleId: capsule.id } });

    const before = await request(app).get(`/api/capsules/${capsule.id}`).set('Cookie', authCookie);
    await request(app).post(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    await request(app).delete(`/api/capsules/${capsule.id}/archive`).set('Cookie', authCookie);
    const after = await request(app).get(`/api/capsules/${capsule.id}`).set('Cookie', authCookie);

    const strip = (b: Record<string, unknown>) => {
      const { archivedAt, ...rest } = b;
      return rest;
    };
    expect(strip(after.body)).toEqual(strip(before.body));

    await prisma.trip.deleteMany({ where: { id: trip.id } });
  });
});
