import request from 'supertest';
import { createApp } from '../app';
import { uploadToR2, getSignedReadUrl } from '../lib/r2';
import { loginAs } from './helpers/auth';
import path from 'path';
import fs from 'fs';

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue(undefined),
  getSignedReadUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-url'),
  BUCKET: 'test-bucket',
}));

const app = createApp();
const USER_ID = 'user_1';
let authCookie: string;

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
});

describe('POST /api/upload', () => {
  it('uploads a file and returns key + url', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test.jpg');
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.key).toBe('string');
    expect(uploadToR2).toHaveBeenCalled();
    expect(getSignedReadUrl).toHaveBeenCalledWith(res.body.key);

    fs.rmSync(testImagePath);
  });

  it('returns 401 without a session', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test-unauth.jpg');
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

    const res = await request(app).post('/api/upload').attach('photo', testImagePath);
    expect(res.status).toBe(401);

    fs.rmSync(testImagePath);
  });
});
