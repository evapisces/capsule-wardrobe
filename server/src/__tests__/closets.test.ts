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
  await prisma.closet.deleteMany({ where: { userId: USER_ID } });
});

describe('GET /api/closets', () => {
  it('returns list of closets', async () => {
    await prisma.closet.create({
      data: { userId: USER_ID, name: 'Test Closet' },
    });
    const res = await request(app).get('/api/closets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Test Closet');
  });
});

describe('POST /api/closets', () => {
  it('creates a closet', async () => {
    const res = await request(app)
      .post('/api/closets')
      .send({ name: 'New Closet', description: 'My wardrobe' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Closet');
    expect(res.body.userId).toBe(USER_ID);
  });
});

describe('GET /api/closets/:id', () => {
  it('returns a single closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Single' },
    });
    const res = await request(app).get(`/api/closets/${closet.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(closet.id);
  });

  it('returns 404 for missing closet', async () => {
    const res = await request(app).get('/api/closets/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/closets/:id', () => {
  it('updates a closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Old Name' },
    });
    const res = await request(app)
      .put(`/api/closets/${closet.id}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});

describe('DELETE /api/closets/:id', () => {
  it('deletes a closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Delete Me' },
    });
    const res = await request(app).delete(`/api/closets/${closet.id}`);
    expect(res.status).toBe(204);
  });
});
