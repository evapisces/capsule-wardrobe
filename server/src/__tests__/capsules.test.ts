import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

const app = createApp();
const USER_ID = 'user_1';
let closetId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
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
    const res = await request(app).get('/api/capsules');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
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

    const res = await request(app).get(`/api/capsules/${capsule.id}`);
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
    const res = await request(app).post(`/api/capsules/${capsule.id}/items/${item.id}`);
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
    const res = await request(app).delete(`/api/capsules/${capsule.id}/items/${item.id}`);
    expect(res.status).toBe(204);
  });
});
