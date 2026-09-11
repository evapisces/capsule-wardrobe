import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'wear_history_user';
const OTHER_USER_ID = 'wear_history_other_user';
let authCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
  await loginAs(OTHER_USER_ID);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.closet.deleteMany({ where: { userId: { in: [USER_ID, OTHER_USER_ID] } } });
});

describe('GET /api/closets/:id/wear-history', () => {
  it('returns events inside the range grouped by date', async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'History Closet' } });
    const item = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Blue Shirt', category: 'tops' },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-03-10'), source: 'manual', items: { create: [{ closetItemId: item.id }] } },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-03-15'), source: 'trip_auto', items: { create: [{ closetItemId: item.id }] } },
    });

    const res = await request(app)
      .get(`/api/closets/${closet.id}/wear-history?from=2026-03-01&to=2026-03-31`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].date).toBe('2026-03-10');
    expect(res.body[0].events[0].source).toBe('manual');
    expect(res.body[0].events[0].items[0].id).toBe(item.id);
    expect(res.body[0].events[0].items[0].name).toBe('Blue Shirt');
    expect(res.body[1].date).toBe('2026-03-15');
    expect(res.body[1].events[0].source).toBe('trip_auto');
  });

  it('excludes events outside the range', async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'History Closet' } });
    const item = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Shoes', category: 'shoes' },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-01-01'), source: 'manual', items: { create: [{ closetItemId: item.id }] } },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-03-10'), source: 'manual', items: { create: [{ closetItemId: item.id }] } },
    });

    const res = await request(app)
      .get(`/api/closets/${closet.id}/wear-history?from=2026-03-01&to=2026-03-31`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].date).toBe('2026-03-10');
  });

  it('excludes items belonging to another user\'s closet', async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'History Closet' } });
    const otherCloset = await prisma.closet.create({ data: { userId: OTHER_USER_ID, name: 'Other Closet' } });
    const item = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Jacket', category: 'outerwear' },
    });
    const otherItem = await prisma.closetItem.create({
      data: { closetId: otherCloset.id, name: 'Other Jacket', category: 'outerwear' },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-03-10'), source: 'manual', items: { create: [{ closetItemId: item.id }] } },
    });
    await prisma.wearEvent.create({
      data: { date: new Date('2026-03-10'), source: 'manual', items: { create: [{ closetItemId: otherItem.id }] } },
    });

    const res = await request(app)
      .get(`/api/closets/${closet.id}/wear-history?from=2026-03-01&to=2026-03-31`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].events).toHaveLength(1);
    expect(res.body[0].events[0].items[0].id).toBe(item.id);
  });

  it('returns 404 for a closet belonging to another user', async () => {
    const otherCloset = await prisma.closet.create({ data: { userId: OTHER_USER_ID, name: 'Other Closet' } });

    const res = await request(app)
      .get(`/api/closets/${otherCloset.id}/wear-history?from=2026-03-01&to=2026-03-31`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Closet not found');
  });

  it('returns 400 for a missing or invalid range', async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'History Closet' } });

    const missing = await request(app).get(`/api/closets/${closet.id}/wear-history`).set('Cookie', authCookie);
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .get(`/api/closets/${closet.id}/wear-history?from=not-a-date&to=2026-03-31`)
      .set('Cookie', authCookie);
    expect(invalid.status).toBe(400);
  });

  it('returns 400 for a range longer than 366 days', async () => {
    const closet = await prisma.closet.create({ data: { userId: USER_ID, name: 'History Closet' } });

    const res = await request(app)
      .get(`/api/closets/${closet.id}/wear-history?from=2024-01-01&to=2026-03-31`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(400);
  });
});
