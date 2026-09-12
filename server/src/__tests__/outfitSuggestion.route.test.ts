import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'outfit_suggest_user';
const OTHER_USER_ID = 'outfit_suggest_other_user';
let closetId: string;
let authCookie: string;
let otherCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
  otherCookie = await loginAs(OTHER_USER_ID);
  const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'Suggestion Closet' } });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closet.deleteMany({ where: { userId: { in: [USER_ID, OTHER_USER_ID] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.closetItem.deleteMany({ where: { closetId } });
});

describe('GET /api/items/:id/outfit-suggestion', () => {
  it('returns 2-3 suggested items of complementary categories for a happy-path closet', async () => {
    const top = await prisma.closetItem.create({ data: { closetId, name: 'Silk Blouse', category: 'tops', climate: 'temperate' } });
    await prisma.closetItem.create({ data: { closetId, name: 'Wool Trousers', category: 'bottoms', climate: 'temperate' } });
    await prisma.closetItem.create({ data: { closetId, name: 'Loafers', category: 'shoes', climate: 'temperate' } });
    await prisma.closetItem.create({ data: { closetId, name: 'Trench Coat', category: 'outerwear', climate: 'layering' } });
    // Off-climate — should never be suggested for a temperate seed.
    await prisma.closetItem.create({ data: { closetId, name: 'Sandals', category: 'shoes', climate: 'tropical' } });

    const res = await request(app).get(`/api/items/${top.id}/outfit-suggestion`).set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.seed.itemId).toBe(top.id);
    expect(res.body.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(res.body.suggestions.length).toBeLessThanOrEqual(3);
    const categories = res.body.suggestions.map((s: { category: string }) => s.category);
    expect(categories).not.toContain('tops');
    expect(categories.every((c: string) => ['bottoms', 'shoes', 'outerwear', 'accessories'].includes(c))).toBe(true);
    expect(categories).not.toContain('tropical');
    for (const s of res.body.suggestions) {
      expect(typeof s.reason).toBe('string');
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });

  it('returns a 200 with an empty suggestions array for a too-sparse closet', async () => {
    const top = await prisma.closetItem.create({ data: { closetId, name: 'Lonely Shirt', category: 'tops' } });

    const res = await request(app).get(`/api/items/${top.id}/outfit-suggestion`).set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.seed.itemId).toBe(top.id);
    expect(res.body.suggestions).toEqual([]);
  });

  it('returns 404 for an item the caller does not own', async () => {
    const top = await prisma.closetItem.create({ data: { closetId, name: 'Not Yours', category: 'tops' } });

    const res = await request(app).get(`/api/items/${top.id}/outfit-suggestion`).set('Cookie', otherCookie);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    const top = await prisma.closetItem.create({ data: { closetId, name: 'Anon Shirt', category: 'tops' } });

    const res = await request(app).get(`/api/items/${top.id}/outfit-suggestion`);

    expect(res.status).toBe(401);
  });
});
