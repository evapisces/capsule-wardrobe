import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'user_1';
let closetId: string;
let capsuleId: string;
let itemId: string;
let authCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
  const closet = await prisma.closet.create({
    data: { userId: USER_ID, name: 'Board Test Closet' },
  });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closet.deleteMany({ where: { id: closetId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.capsule.deleteMany({ where: { userId: USER_ID } });
  await prisma.closetItem.deleteMany({ where: { closetId } });
  const capsule = await prisma.capsule.create({
    data: { userId: USER_ID, name: 'Board Capsule', climate: 'cold' },
  });
  capsuleId = capsule.id;
  const item = await prisma.closetItem.create({
    data: { closetId, name: 'Board Item', category: 'tops', climate: 'cold' },
  });
  itemId = item.id;
});

describe('PUT /api/capsules/:id/board/:itemId', () => {
  it('places an item on the board and adds it to the capsule', async () => {
    const res = await request(app)
      .put(`/api/capsules/${capsuleId}/board/${itemId}`)
      .set('Cookie', authCookie)
      .send({ x: 0.25, y: 0.4 });
    expect(res.status).toBe(200);
    expect(res.body.x).toBe(0.25);

    const membership = await prisma.capsuleItem.findUnique({
      where: { capsuleId_closetItemId: { capsuleId, closetItemId: itemId } },
    });
    expect(membership).not.toBeNull();
  });
});

describe('GET /api/capsules/:id/board', () => {
  it('returns board items with position and off-climate flag', async () => {
    await request(app).put(`/api/capsules/${capsuleId}/board/${itemId}`).set('Cookie', authCookie).send({ x: 0.1, y: 0.1 });
    const hotItem = await prisma.closetItem.create({
      data: { closetId, name: 'Hot Item', category: 'tops', climate: 'tropical' },
    });
    await request(app).put(`/api/capsules/${capsuleId}/board/${hotItem.id}`).set('Cookie', authCookie).send({ x: 0.5, y: 0.5 });

    const res = await request(app).get(`/api/capsules/${capsuleId}/board`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.offClimateCount).toBe(1);
    const cold = res.body.items.find((i: { id: string }) => i.id === itemId);
    const hot = res.body.items.find((i: { id: string }) => i.id === hotItem.id);
    expect(cold.offClimate).toBe(false);
    expect(hot.offClimate).toBe(true);
  });
});

describe('GET /api/capsules/:id/drawer', () => {
  it('excludes items already in the capsule', async () => {
    await request(app).put(`/api/capsules/${capsuleId}/board/${itemId}`).set('Cookie', authCookie).send({ x: 0.1, y: 0.1 });
    const drawerItem = await prisma.closetItem.create({
      data: { closetId, name: 'Drawer Item', category: 'bottoms' },
    });

    const res = await request(app).get(`/api/capsules/${capsuleId}/drawer?closetId=${closetId}`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    const ids = res.body.map((i: { id: string }) => i.id);
    expect(ids).toContain(drawerItem.id);
    expect(ids).not.toContain(itemId);
  });
});

describe('outfits', () => {
  it('creates an outfit from a lasso selection and supports rename/ungroup', async () => {
    const item2 = await prisma.closetItem.create({
      data: { closetId, name: 'Second Item', category: 'bottoms' },
    });
    await request(app).put(`/api/capsules/${capsuleId}/board/${itemId}`).set('Cookie', authCookie).send({ x: 0.1, y: 0.1 });
    await request(app).put(`/api/capsules/${capsuleId}/board/${item2.id}`).set('Cookie', authCookie).send({ x: 0.2, y: 0.1 });

    const create = await request(app)
      .post(`/api/capsules/${capsuleId}/outfits`)
      .set('Cookie', authCookie)
      .send({ name: 'Travel day', itemIds: [itemId, item2.id] });
    expect(create.status).toBe(201);
    expect(create.body.itemIds).toHaveLength(2);
    const outfitId = create.body.id;

    const board = await request(app).get(`/api/capsules/${capsuleId}/board`).set('Cookie', authCookie);
    expect(board.body.outfits).toHaveLength(1);
    expect(board.body.items.every((i: { outfitId: string }) => i.outfitId === outfitId)).toBe(true);

    const rename = await request(app).put(`/api/outfits/${outfitId}`).set('Cookie', authCookie).send({ name: 'Renamed' });
    expect(rename.status).toBe(200);
    expect(rename.body.name).toBe('Renamed');

    const ungroup = await request(app).delete(`/api/outfits/${outfitId}/items/${itemId}`).set('Cookie', authCookie);
    expect(ungroup.status).toBe(204);

    const boardAfter = await request(app).get(`/api/capsules/${capsuleId}/board`).set('Cookie', authCookie);
    const found = boardAfter.body.items.find((i: { id: string }) => i.id === itemId);
    expect(found.outfitId).toBeNull();
  });
});

describe('DELETE /api/capsules/:id/board/:itemId', () => {
  it('removes the item from the board, capsule, and any outfit', async () => {
    await request(app).put(`/api/capsules/${capsuleId}/board/${itemId}`).set('Cookie', authCookie).send({ x: 0.1, y: 0.1 });
    const res = await request(app).delete(`/api/capsules/${capsuleId}/board/${itemId}`).set('Cookie', authCookie);
    expect(res.status).toBe(204);

    const membership = await prisma.capsuleItem.findUnique({
      where: { capsuleId_closetItemId: { capsuleId, closetItemId: itemId } },
    });
    expect(membership).toBeNull();
  });
});
