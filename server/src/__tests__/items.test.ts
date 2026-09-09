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
    data: { id: 'test_closet', userId: USER_ID, name: 'Test Closet' },
  });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closetItem.deleteMany({ where: { closetId } });
  await prisma.closet.deleteMany({ where: { id: closetId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.closetItem.deleteMany({ where: { closetId } });
});

describe('GET /api/closets/:id/items', () => {
  it('returns items in a closet', async () => {
    await prisma.closetItem.create({
      data: { closetId, name: 'Blue Shirt', category: 'tops', color: 'blue' },
    });
    const res = await request(app).get(`/api/closets/${closetId}/items`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Blue Shirt');
  });

  it('filters by category', async () => {
    await prisma.closetItem.createMany({
      data: [
        { closetId, name: 'Shirt', category: 'tops' },
        { closetId, name: 'Jeans', category: 'bottoms' },
      ],
    });
    const res = await request(app).get(`/api/closets/${closetId}/items?category=tops`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('tops');
  });

  it('includes capsuleCount on each item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Shared Item', category: 'tops' },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Test Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const res = await request(app).get(`/api/closets/${closetId}/items`);
    const found = res.body.find((i: { id: string }) => i.id === item.id);
    expect(found.capsuleCount).toBe(1);
    await prisma.capsuleItem.deleteMany({ where: { capsuleId: capsule.id } });
    await prisma.capsule.delete({ where: { id: capsule.id } });
  });
});

describe('POST /api/closets/:id/items', () => {
  it('creates an item', async () => {
    const res = await request(app)
      .post(`/api/closets/${closetId}/items`)
      .send({ name: 'Linen Top', category: 'tops', color: 'white', size: 'S', brand: 'Everlane' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Linen Top');
    expect(res.body.brand).toBe('Everlane');
  });
});

describe('GET /api/items/:id', () => {
  it('returns a single item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Single Item', category: 'shoes' },
    });
    const res = await request(app).get(`/api/items/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });
});

describe('PUT /api/items/:id', () => {
  it('updates an item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Old Name', category: 'tops' },
    });
    const res = await request(app)
      .put(`/api/items/${item.id}`)
      .send({ name: 'Updated Name', size: 'M' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.size).toBe('M');
  });
});

describe('DELETE /api/items/:id', () => {
  it('deletes an item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Delete Me', category: 'tops' },
    });
    const res = await request(app).delete(`/api/items/${item.id}`);
    expect(res.status).toBe(204);
  });
});

describe('POST /api/items/:id/wear', () => {
  it('logs a wear and is idempotent for the same day', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Wear Test Item', category: 'tops', pricePaid: 20 },
    });

    const first = await request(app).post(`/api/items/${item.id}/wear`);
    expect(first.status).toBe(201);
    expect(first.body.wearCount).toBe(1);

    const second = await request(app).post(`/api/items/${item.id}/wear`);
    expect(second.status).toBe(201);
    expect(second.body.wearCount).toBe(1); // no double-count same day

    const detail = await request(app).get(`/api/items/${item.id}`);
    expect(detail.body.wearCount).toBe(1);
    expect(detail.body.lastWornAt).not.toBeNull();
    expect(detail.body.costPerWear).toBe(20);
  });
});

describe('DELETE /api/items/:id/wear', () => {
  it('undoes today\'s manual wear log', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Undo Wear Item', category: 'tops' },
    });
    await request(app).post(`/api/items/${item.id}/wear`);

    const res = await request(app).delete(`/api/items/${item.id}/wear`);
    expect(res.status).toBe(200);
    expect(res.body.wearCount).toBe(0);

    const again = await request(app).delete(`/api/items/${item.id}/wear`);
    expect(again.status).toBe(404);
  });
});

describe('GET /api/items/:id/capsules', () => {
  it('returns capsules the item belongs to with climate suitability', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Capsule Membership Item', category: 'tops', climate: 'cold' },
    });
    const matching = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Cold Capsule', climate: 'cold' },
    });
    const mismatched = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Hot Capsule', climate: 'tropical' },
    });
    await prisma.capsuleItem.createMany({
      data: [
        { capsuleId: matching.id, closetItemId: item.id },
        { capsuleId: mismatched.id, closetItemId: item.id },
      ],
    });

    const res = await request(app).get(`/api/items/${item.id}/capsules`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const cold = res.body.find((c: { name: string }) => c.name === 'Cold Capsule');
    const hot = res.body.find((c: { name: string }) => c.name === 'Hot Capsule');
    expect(cold.suitable).toBe(true);
    expect(hot.suitable).toBe(false);

    await prisma.capsuleItem.deleteMany({ where: { closetItemId: item.id } });
    await prisma.capsule.deleteMany({ where: { id: { in: [matching.id, mismatched.id] } } });
  });
});

describe('GET /api/items/:id/wear-history', () => {
  it('returns chronological wear events', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'History Item', category: 'tops' },
    });
    await request(app).post(`/api/items/${item.id}/wear`);

    const res = await request(app).get(`/api/items/${item.id}/wear-history`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].source).toBe('manual');
  });
});
